import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import { is, maybe } from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";
import { BackendConfig, ClaudeBackend } from "./backend/claudeBackend.ts";
import { TerminalBackend } from "./backend/terminalBackend.ts";
import { TmuxBackend } from "./backend/tmuxBackend.ts";

/**
 * ClaudeSessionとBackendFactoryを統合した統一的なセッション管理クラス
 * 環境に応じた適切なBackendの選択と管理を行う
 */
export class ClaudeSession {
  private static instance: ClaudeSession | null = null;
  private backend: ClaudeBackend | null = null;
  private denops: Denops;
  private config: BackendConfig | null = null;

  private constructor(denops: Denops) {
    this.denops = denops;
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(denops: Denops): ClaudeSession {
    if (!this.instance) {
      this.instance = new ClaudeSession(denops);
    }
    return this.instance;
  }

  /**
   * セッションを開始または再開
   */
  async start(command?: string): Promise<void> {
    // 既存のBackendがアクティブなら再利用
    if (this.backend && await this.backend.isActive()) {
      await this.backend.show();
      return;
    }

    // 新しいBackendを作成
    this.backend = await this.getOrCreateBackend(true);
    const cmd = command ?? "claude";
    await this.backend.run(cmd);
  }

  /**
   * プロンプトを送信
   * 既存のClaudeSession.sendPrompt()と完全互換
   */
  async sendPrompt(prompt: string): Promise<void> {
    if (!this.backend) {
      throw new Error("No active Claude session. Call start() first.");
    }
    await this.backend.sendPrompt(prompt);
  }

  /**
   * セッションを隠す
   * 既存のClaudeSession.hide()と完全互換
   */
  async hide(): Promise<void> {
    if (!this.backend) {
      return;
    }
    await this.backend.hide();
  }

  /**
   * セッションを表示
   * 既存のClaudeSession.show()と完全互換
   */
  async show(): Promise<void> {
    if (!this.backend) {
      await this.start();
      return;
    }
    await this.backend.show();
  }

  /**
   * セッションを終了
   * 既存のClaudeSession.exit()と完全互換
   */
  async exit(): Promise<void> {
    if (!this.backend) {
      return;
    }
    await this.backend.exit();
    this.backend = null;
    this.config = null;
  }

  /**
   * セッションがアクティブか確認
   * 既存のClaudeSession.isActive()と完全互換
   */
  async isActive(): Promise<boolean> {
    if (!this.backend) {
      return false;
    }
    return await this.backend.isActive();
  }

  /**
   * 現在のBackendを取得
   * 既存のClaudeSession.getBackend()と完全互換
   */
  getBackend(): ClaudeBackend | null {
    return this.backend;
  }

  /**
   * セッションをリセット
   * 既存のClaudeSession.reset()と完全互換
   */
  static reset(): void {
    if (this.instance) {
      this.instance.backend = null;
      this.instance.config = null;
    }
    this.instance = null;
  }

  // === BackendFactoryから統合された機能 ===

  /**
   * Backendインスタンスを作成または取得
   * BackendFactory.getOrCreate()の統合版
   */
  private async getOrCreateBackend(forceNew = false): Promise<ClaudeBackend> {
    // 既存のBackendがあり、forceNewでない場合は再利用
    if (!forceNew && this.backend && await this.backend.isActive()) {
      return this.backend;
    }

    // 設定を取得
    this.config = await this.getConfig();

    // 環境に応じてBackendを選択・作成
    return await this.createBackend();
  }

  /**
   * 新しいBackendインスタンスを作成
   * BackendFactory.create()の統合版
   */
  private async createBackend(): Promise<ClaudeBackend> {
    if (!this.config) {
      throw new Error(
        "Config not initialized. Call getOrCreateBackend() first.",
      );
    }

    // tmux環境かつsplit/vsplitモードの場合はTmuxBackendを使用
    if (
      await this.isInTmux() &&
      ["split", "vsplit"].includes(this.config.openType)
    ) {
      return new TmuxBackend(this.denops, this.config);
    }

    // それ以外はTerminalBackendを使用
    return new TerminalBackend(this.denops, this.config);
  }

  /**
   * 設定を取得
   * BackendFactory.getConfig()の統合版
   */
  private async getConfig(): Promise<BackendConfig> {
    const openType = maybe(
      await v.g.get(this.denops, "claude_buffer_open_type"),
      is.LiteralOneOf(["split", "vsplit", "floating"] as const),
    ) ?? "floating";

    const command = maybe(
      await v.g.get(this.denops, "claude_command"),
      is.String,
    ) ?? "claude";

    const width = maybe(
      await v.g.get(this.denops, "claude_floatwin_width"),
      is.Number,
    ) ?? 100;

    const height = maybe(
      await v.g.get(this.denops, "claude_floatwin_height"),
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
   * BackendFactory.isInTmux()の統合版
   */
  private async isInTmux(): Promise<boolean> {
    const tmuxEnv = await this.denops.call("expand", "$TMUX") as string;
    return tmuxEnv !== "" && tmuxEnv !== "$TMUX";
  }
}
