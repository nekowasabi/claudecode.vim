import { emit } from "https://deno.land/x/denops_std@v6.5.1/autocmd/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";
import {
  ensure,
  is,
  maybe,
} from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import type { ClaudeCommand } from "./claudeCommand.ts";
import * as util from "./utils.ts";
import { AdapterFactory } from "./compatibility/adapterFactory.ts";
import {
  clearTmuxPaneId,
  getActiveTmuxPaneId,
  getRegisteredTmuxPaneId,
  isInTmux,
} from "./utils.ts";

export const commands: ClaudeCommand = {
  run,
  sendPrompt,
  exit,
  checkIfClaudeBuffer,
  isTestMode,
};
/**
 * バッファがClaude Codeバッファかどうかを確認します。
 * @param {Denops} denops - Denopsインスタンス
 * @param {number} bufnr - バッファ番号
 * @returns {Promise<boolean>}
 */
async function checkIfClaudeBuffer(
  denops: Denops,
  bufnr: number,
): Promise<boolean> {
  // claudeバッファの場合 `term://{path}//{pid}:claude` のような名前になっている
  const name = await util.getBufferName(denops, bufnr);
  const splitted = name.split(" ");
  return splitted[0].endsWith("claude");
}

async function run(denops: Denops): Promise<undefined> {
  const claudeCommand = ensure(
    await v.g.get(denops, "claude_command", "claude"),
    is.String,
  );

  // tmuxサポートの追加
  const openType = maybe(
    await v.g.get(denops, "claude_buffer_open_type"),
    is.LiteralOneOf(["split", "vsplit", "floating"] as const),
  ) ?? "floating";

  if (
    (await isInTmux(denops)) && (openType === "split" || openType === "vsplit")
  ) {
    // tmuxペインでClaude Codeを起動
    const splitFlag = openType === "vsplit" ? "-h" : "-v";
    const shellPath = (await denops.call("expand", "$SHELL")) as
      | string
      | undefined;
    const safeShell = shellPath && shellPath.length > 0 ? shellPath : "/bin/sh";

    const escapedClaudeCmd = claudeCommand.replaceAll('"', '\\"');
    const cmd = [
      "tmux",
      "split-window",
      "-P",
      "-F",
      "'#{pane_id}'",
      splitFlag,
      safeShell,
      "-lc",
      `"${escapedClaudeCmd}"`,
    ].join(" ");

    const paneId = ensure(await denops.call("system", cmd), is.String).trim();

    if (paneId) {
      await v.g.set(denops, "claude_tmux_pane_id", paneId);
      await emit(denops, "User", "ClaudeOpen");
      return;
    }
  }

  // 既存のterminal実装にフォールバック
  const adapter = await AdapterFactory.getAdapter(denops);
  if (!adapter.isTerminalSupported()) {
    throw new Error("Terminal feature is not supported in this editor");
  }
  await adapter.openTerminal(denops, claudeCommand);
  await emit(denops, "User", "ClaudeOpen");
}

/**
 * Claude Codeバッファにメッセージを送信します。
 * @param {Denops} denops - Denops instance
 * @param {number} jobId - The job id to send the message to
 * @param {string} prompt - The prompt to send
 * @returns {Promise<undefined>}
 */
async function sendPrompt(
  denops: Denops,
  jobId: number,
  prompt: string,
): Promise<undefined> {
  // tmuxペインが登録されている場合
  const paneId = await getRegisteredTmuxPaneId(denops);
  if (paneId) {
    // 一時ファイルを使用してプロンプトを送信（改行を保持）
    const tempFile = await Deno.makeTempFile({ prefix: "claude_prompt_" });
    await Deno.writeTextFile(tempFile, prompt);

    await denops.call(
      "system",
      `tmux load-buffer -b claude_prompt ${tempFile} && ` +
        `tmux paste-buffer -t ${paneId} -b claude_prompt -p && ` +
        `tmux delete-buffer -b claude_prompt && ` +
        `tmux send-keys -t ${paneId} C-m`,
    );

    try {
      await Deno.remove(tempFile);
    } catch (_) {
      // ignore
    }
    return;
  }

  // 既存のterminal実装
  const adapter = await AdapterFactory.getAdapter(denops);
  await adapter.sendToTerminal(denops, jobId, prompt);
  await adapter.sendToTerminal(denops, jobId, "\n");
}

async function exit(
  denops: Denops,
  jobId: number,
  bufnr: number,
): Promise<undefined> {
  // tmuxペインが登録されている場合
  const paneId = await getActiveTmuxPaneId(denops);
  if (paneId) {
    await denops.call("system", `tmux send-keys -t ${paneId} C-c`);
    await denops.call("system", `tmux kill-pane -t ${paneId}`);
    await clearTmuxPaneId(denops);
    return;
  }

  // 既存のterminal実装
  if (jobId !== 0) {
    const adapter = await AdapterFactory.getAdapter(denops);
    await adapter.sendToTerminal(denops, jobId, "\x03"); // Ctrl-C to exit
  }
  await denops.cmd(`bdelete! ${bufnr}`);
}

function isTestMode(): boolean {
  return false;
}
