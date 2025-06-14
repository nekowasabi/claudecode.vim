import { emit } from "https://deno.land/x/denops_std@v6.5.1/autocmd/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import type { ClaudeCommand } from "./claudeCommand.ts";
import * as util from "./utils.ts";

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
  await denops.cmd(`terminal ${claudeCommand}`);
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
  const promptLines = prompt.split("\n");
  const joined = promptLines.join("\x1b\x0d"); // use Esc + Ctrl-M instead of \n to avoid submit
  await denops.call("chansend", jobId, `${joined}\n`);
}

async function exit(
  denops: Denops,
  jobId: number,
  bufnr: number,
): Promise<undefined> {
  if (jobId !== 0) {
    await denops.call("chansend", jobId, "\x03"); // Ctrl-C to exit
  }
  await denops.cmd(`bdelete! ${bufnr}`);
}

function isTestMode(): boolean {
  return false;
}
