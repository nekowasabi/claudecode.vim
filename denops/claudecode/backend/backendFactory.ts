import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import { is, maybe } from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";
import { BackendConfig, ClaudeBackend } from "./claudeBackend.ts";
import { TerminalBackend } from "./terminalBackend.ts";
import { TmuxBackend } from "./tmuxBackend.ts";

/**
 * 環境に応じて適切なBackendを生成するFactory
 */
export class BackendFactory {
  private static currentBackend: ClaudeBackend | null = null;

  /**
   * Backendインスタンスを作成または取得
   * @param denops Denopsインスタンス
   * @param forceNew 新しいインスタンスを強制的に作成するか
   * @returns ClaudeBackendインスタンス
   */
  static async getOrCreate(
    denops: Denops,
    forceNew = false,
  ): Promise<ClaudeBackend> {
    // 既存のBackendがあり、forceNewでない場合は再利用
    if (
      !forceNew && this.currentBackend && await this.currentBackend.isActive()
    ) {
      return this.currentBackend;
    }

    // 設定を取得
    const config = await this.getConfig(denops);

    // 環境に応じてBackendを選択
    const backend = await this.create(denops, config);
    this.currentBackend = backend;

    return backend;
  }

  /**
   * 新しいBackendインスタンスを作成
   * @param denops Denopsインスタンス
   * @param config Backend設定
   * @returns ClaudeBackendインスタンス
   */
  static async create(
    denops: Denops,
    config: BackendConfig,
  ): Promise<ClaudeBackend> {
    // tmux環境かつsplit/vsplitモードの場合はTmuxBackendを使用
    if (
      await this.isInTmux(denops) &&
      ["split", "vsplit"].includes(config.openType)
    ) {
      return new TmuxBackend(denops, config);
    }

    // それ以外はTerminalBackendを使用
    return new TerminalBackend(denops, config);
  }

  /**
   * 設定を取得
   */
  private static async getConfig(denops: Denops): Promise<BackendConfig> {
    const openType = maybe(
      await v.g.get(denops, "claude_buffer_open_type"),
      is.LiteralOneOf(["split", "vsplit", "floating"] as const),
    ) ?? "floating";

    const command = maybe(
      await v.g.get(denops, "claude_command"),
      is.String,
    ) ?? "claude";

    const width = maybe(
      await v.g.get(denops, "claude_floatwin_width"),
      is.Number,
    ) ?? 100;

    const height = maybe(
      await v.g.get(denops, "claude_floatwin_height"),
      is.Number,
    ) ?? 20;

    return {
      openType,
      command,
      width,
      height,
    };
  }

  /**
   * tmux環境かどうかを判定
   */
  private static async isInTmux(denops: Denops): Promise<boolean> {
    const tmuxEnv = await denops.call("expand", "$TMUX") as string;
    return tmuxEnv !== "" && tmuxEnv !== "$TMUX";
  }

  /**
   * 現在のBackendをクリア
   */
  static reset(): void {
    this.currentBackend = null;
  }

  /**
   * 現在のBackendを取得（存在しない場合はundefined）
   */
  static getCurrent(): ClaudeBackend | null {
    return this.currentBackend;
  }
}
