import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as actual from "./actualClaudeCommand.ts";
import * as mock from "./mockClaudeCommand.ts";

/**
 * Claude Codeコマンドの操作を定義するインターフェース。
 */
export interface ClaudeCommand {
  /**
   * Claude Codeコマンドを実行します。
   *
   * @param denops - Denopsインスタンス。
   * @returns コマンドが実行されたときに解決されるPromise。
   */
  run: (denops: Denops) => Promise<undefined>;

  /**
   * Claude Codeコマンドにプロンプトを送信します。
   *
   * @param denops - Denopsインスタンス。
   * @param jobId - ジョブ識別子。
   * @param prompt - 送信するプロンプト文字列。
   * @returns プロンプトが送信されたときに解決されるPromise。
   */
  sendPrompt: (
    denops: Denops,
    jobId: number,
    prompt: string,
  ) => Promise<undefined>;

  /**
   * Claude Codeコマンドを終了します。
   *
   * @param denops - Denopsインスタンス。
   * @param jobId - ジョブ識別子。
   * @param bufnr - バッファ番号。
   * @returns コマンドが終了したときに解決されるPromise。
   */
  exit: (denops: Denops, jobId: number, bufnr: number) => Promise<undefined>;

  /**
   * バッファがClaude Codeバッファかどうかを確認します。
   *
   * @param denops - Denopsインスタンス。
   * @param bufnr - 確認するバッファ番号。
   * @returns Claude Codeバッファであるかどうかを示すブール値を解決するPromise。
   */
  checkIfClaudeBuffer: (denops: Denops, bufnr: number) => Promise<boolean>;

  /**
   * Claude Codeがテストモードであるかどうかを判断します。
   *
   * @returns テストモードがアクティブであるかどうかを示すブール値。
   */
  isTestMode: () => boolean;
}

let testMode = false;

/**
 * Claude Codeのテストモードを有効にします。
 */
export const setTestMode = () => {
  testMode = true;
};

/**
 * 現在のモードに基づいて、適切なClaude Codeコマンドを取得します。
 *
 * @returns アクティブなClaude Codeコマンド。
 */
export const claude = () => {
  return testMode ? mock.commands : actual.commands;
};
