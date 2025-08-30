import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";

/**
 * Claude Codeのバックエンド実装のためのインターフェース
 * Terminal BufferまたはTmux Paneの違いを吸収する抽象レイヤー
 */
export interface ClaudeBackend {
  /**
   * Claude Codeセッションを開始する
   * @param command Claude Codeコマンド
   * @returns セッション識別子（jobIdまたはpaneId）
   */
  run(command: string): Promise<string | number>;

  /**
   * プロンプトを送信する
   * @param prompt 送信するプロンプト
   */
  sendPrompt(prompt: string): Promise<void>;

  /**
   * セッションを終了する
   */
  exit(): Promise<void>;

  /**
   * セッションを隠す（バックグラウンドに移動）
   */
  hide(): Promise<void>;

  /**
   * セッションを表示する（フォアグラウンドに移動）
   */
  show(): Promise<void>;

  /**
   * セッションがアクティブかどうかを確認
   */
  isActive(): Promise<boolean>;

  /**
   * セッション識別子を取得
   */
  getIdentifier(): string | number | undefined;

  /**
   * バックエンドのタイプを取得
   */
  getType(): BackendType;
}

/**
 * バックエンドのタイプ
 */
export enum BackendType {
  Terminal = "terminal",
  Tmux = "tmux",
}

/**
 * バックエンドの設定
 */
export interface BackendConfig {
  openType: "split" | "vsplit" | "floating";
  command?: string;
  width?: number;
  height?: number;
}

/**
 * バックエンドの状態
 */
export interface BackendStatus {
  active: boolean;
  identifier?: string | number;
  type: BackendType;
  config: BackendConfig;
}

/**
 * Claude Bufferの情報
 */
export interface ClaudeBuffer {
  jobId: number;
  bufnr: number;
}

/**
 * バックエンドの基底クラス
 */
export abstract class BaseBackend implements ClaudeBackend {
  protected denops: Denops;
  protected config: BackendConfig;
  protected identifier?: string | number;

  constructor(denops: Denops, config: BackendConfig) {
    this.denops = denops;
    this.config = config;
  }

  abstract run(command: string): Promise<string | number>;
  abstract sendPrompt(prompt: string): Promise<void>;
  abstract exit(): Promise<void>;
  abstract hide(): Promise<void>;
  abstract show(): Promise<void>;
  abstract isActive(): Promise<boolean>;
  abstract getType(): BackendType;

  getIdentifier(): string | number | undefined {
    return this.identifier;
  }

  protected setIdentifier(id: string | number): void {
    this.identifier = id;
  }
}
