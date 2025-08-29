import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import { ClaudeBackend } from "./backend/claudeBackend.ts";
import { BackendFactory } from "./backend/backendFactory.ts";

/**
 * Claude Codeセッションを管理するクラス
 * Backendのライフサイクルと状態を管理
 */
export class ClaudeSession {
  private static instance: ClaudeSession | null = null;
  private backend: ClaudeBackend | null = null;
  private denops: Denops;

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
    this.backend = await BackendFactory.getOrCreate(this.denops);
    const cmd = command ?? "claude";
    await this.backend.run(cmd);
  }

  /**
   * プロンプトを送信
   */
  async sendPrompt(prompt: string): Promise<void> {
    if (!this.backend) {
      throw new Error("No active Claude session. Call start() first.");
    }
    await this.backend.sendPrompt(prompt);
  }

  /**
   * セッションを隠す
   */
  async hide(): Promise<void> {
    if (!this.backend) {
      return;
    }
    await this.backend.hide();
  }

  /**
   * セッションを表示
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
   */
  async exit(): Promise<void> {
    if (!this.backend) {
      return;
    }
    await this.backend.exit();
    this.backend = null;
    BackendFactory.reset();
  }

  /**
   * セッションがアクティブか確認
   */
  async isActive(): Promise<boolean> {
    if (!this.backend) {
      return false;
    }
    return await this.backend.isActive();
  }

  /**
   * 現在のBackendを取得
   */
  getBackend(): ClaudeBackend | null {
    return this.backend;
  }

  /**
   * セッションをリセット
   */
  static reset(): void {
    if (this.instance) {
      this.instance.backend = null;
      BackendFactory.reset();
    }
    this.instance = null;
  }
}
