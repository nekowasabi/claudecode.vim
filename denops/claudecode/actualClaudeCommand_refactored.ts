import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import type { ClaudeCommand } from "./claudeCommand.ts";
import { BackendFactory } from "./backend/backendFactory.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";

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

/**
 * Claude Codeを起動します。
 * Backendシステムが環境に応じて適切な実装を選択します。
 */
async function run(denops: Denops): Promise<undefined> {
  const claudeCommand = ensure(
    await v.g.get(denops, "claude_command", "claude"),
    is.String,
  );

  // Backendを取得または作成
  const backend = await BackendFactory.getOrCreate(denops);
  
  // Claude Codeを起動
  await backend.run(claudeCommand);
  
  return undefined;
}

/**
 * Claude Codeバッファにメッセージを送信します。
 * @param {Denops} denops - Denops instance
 * @param {number} jobId - The job id to send the message to (未使用、互換性のため残す)
 * @param {string} prompt - The prompt to send
 * @returns {Promise<undefined>}
 */
async function sendPrompt(
  denops: Denops,
  jobId: number,
  prompt: string,
): Promise<undefined> {
  // 現在のBackendを取得
  const backend = BackendFactory.getCurrent();
  if (!backend) {
    throw new Error("No active Claude session");
  }
  
  // プロンプトを送信
  await backend.sendPrompt(prompt);
  
  return undefined;
}

/**
 * Claude Codeセッションを終了します。
 * @param {Denops} denops - Denops instance
 * @param {number} jobId - The job id (未使用、互換性のため残す)
 * @param {number} bufnr - The buffer number (未使用、互換性のため残す)
 * @returns {Promise<undefined>}
 */
async function exit(
  denops: Denops,
  jobId: number,
  bufnr: number,
): Promise<undefined> {
  // 現在のBackendを取得
  const backend = BackendFactory.getCurrent();
  if (!backend) {
    return undefined;
  }
  
  // セッションを終了
  await backend.exit();
  
  // Backendをリセット
  BackendFactory.reset();
  
  return undefined;
}

function isTestMode(): boolean {
  return false;
}