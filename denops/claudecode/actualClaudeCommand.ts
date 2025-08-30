import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import type { ClaudeCommand } from "./claudeCommand.ts";
import { ClaudeSession } from "./claudeSession.ts";

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
  const name = await denops.call("bufname", bufnr) as string;
  const splitted = name.split(" ");
  return splitted[0].endsWith("claude");
}

async function run(denops: Denops): Promise<undefined> {
  const claudeCommand = ensure(
    await v.g.get(denops, "claude_command", "claude"),
    is.String,
  );

  // ClaudeSessionのシングルトンインスタンスを取得してセッションを開始
  const session = ClaudeSession.getInstance(denops);
  await session.start(claudeCommand);

  return undefined;
}

/**
 * Claude Codeバッファにメッセージを送信します。
 * @param {Denops} denops - Denops instance
 * @param {number} jobId - The job id to send the message to (互換性のため残す)
 * @param {string} prompt - The prompt to send
 * @returns {Promise<undefined>}
 */
async function sendPrompt(
  denops: Denops,
  jobId: number,
  prompt: string,
): Promise<undefined> {
  // ClaudeSessionのシングルトンインスタンスを取得してプロンプトを送信
  const session = ClaudeSession.getInstance(denops);
  await session.sendPrompt(prompt);

  return undefined;
}

async function exit(
  denops: Denops,
  jobId: number,
  bufnr: number,
): Promise<undefined> {
  // ClaudeSessionのシングルトンインスタンスを取得してセッションを終了
  const session = ClaudeSession.getInstance(denops);
  await session.exit();

  return undefined;
}

function isTestMode(): boolean {
  return false;
}
