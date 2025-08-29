import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import { emit } from "https://deno.land/x/denops_std@v6.5.1/autocmd/mod.ts";
import { BackendConfig, BackendType, BaseBackend } from "./claudeBackend.ts";
import { AdapterFactory } from "../compatibility/adapterFactory.ts";
import type { EditorAdapter } from "../compatibility/editorAdapter.ts";

/**
 * Terminal Buffer実装のバックエンド
 * Vim/Neovimのterminal機能を使用してClaude Codeを実行
 */
export class TerminalBackend extends BaseBackend {
  private adapter?: EditorAdapter;
  private jobId?: number;
  private bufnr?: number;

  constructor(denops: Denops, config: BackendConfig) {
    super(denops, config);
  }

  async run(command: string): Promise<string | number> {
    // 既にアクティブなセッションがある場合は再利用
    if (await this.isActive()) {
      const id = await this.getIdentifier();
      if (id !== undefined) {
        return id;
      }
    }

    // EditorAdapterを取得
    this.adapter = await AdapterFactory.getAdapter(this.denops);
    if (!this.adapter.isTerminalSupported()) {
      throw new Error("Terminal feature is not supported in this editor");
    }

    // Terminal bufferを作成してClaude Codeを起動
    const jobId = await this.adapter.openTerminal(this.denops, command);
    this.jobId = jobId;

    // bufnrを取得して保存
    const buffers = await this.denops.call("getbufinfo") as Array<
      { bufnr: number; name: string }
    >;
    const claudeBuffer = buffers.find((buf) => buf.name.includes("claude"));
    if (claudeBuffer) {
      this.bufnr = claudeBuffer.bufnr;
    }

    this.setIdentifier(jobId);
    await emit(this.denops, "User", "ClaudeOpen");

    return jobId;
  }

  async sendPrompt(prompt: string): Promise<void> {
    if (!this.adapter || this.jobId === undefined) {
      throw new Error("Terminal session is not active");
    }

    await this.adapter.sendToTerminal(this.denops, this.jobId, prompt);
    await this.adapter.sendToTerminal(this.denops, this.jobId, "\n");
  }

  async exit(): Promise<void> {
    if (!this.adapter || this.jobId === undefined || this.bufnr === undefined) {
      return;
    }

    if (this.jobId !== 0) {
      await this.adapter.sendToTerminal(this.denops, this.jobId, "\x03"); // Ctrl-C
    }

    await this.denops.cmd(`bdelete! ${this.bufnr}`);

    this.jobId = undefined;
    this.bufnr = undefined;
    this.identifier = undefined;
  }

  async hide(): Promise<void> {
    if (this.bufnr === undefined) {
      return;
    }

    // ウィンドウを閉じるがバッファは保持
    const windows = await this.denops.call("getbufinfo", this.bufnr) as Array<
      { windows: number[] }
    >;
    if (windows[0]?.windows?.length > 0) {
      for (const winId of windows[0].windows) {
        await this.denops.call("win_execute", winId, "close");
      }
    }
  }

  async show(): Promise<void> {
    if (this.bufnr === undefined) {
      return;
    }

    // バッファを再表示
    const openType = this.config.openType;
    if (openType === "split") {
      await this.denops.cmd(`split | buffer ${this.bufnr}`);
    } else if (openType === "vsplit") {
      await this.denops.cmd(`vsplit | buffer ${this.bufnr}`);
    } else {
      // floating windowの場合は特別な処理が必要
      if (this.adapter) {
        const config = {
          relative: "editor" as const,
          width: this.config.width ?? 100,
          height: this.config.height ?? 20,
          col: 10,
          row: 5,
          style: "minimal" as const,
        };
        await this.adapter.openWindow(this.denops, this.bufnr, true, config);
      }
    }
  }

  async isActive(): Promise<boolean> {
    if (this.jobId === undefined || this.bufnr === undefined) {
      return false;
    }

    // バッファが存在するか確認
    const buffers = await this.denops.call("getbufinfo", this.bufnr) as Array<
      { bufnr: number }
    >;
    return buffers.length > 0;
  }

  getType(): BackendType {
    return BackendType.Terminal;
  }

  /**
   * 既存のClaude Bufferを検索して設定
   */
  async findExistingSession(): Promise<boolean> {
    const buffers = await this.denops.call("getbufinfo") as Array<
      { bufnr: number; name: string; variables?: Record<string, unknown> }
    >;

    for (const buf of buffers) {
      if (buf.name.includes("claude") && buf.name.includes("term://")) {
        this.bufnr = buf.bufnr;

        // jobIdを取得
        if (buf.variables?.terminal_job_id !== undefined) {
          this.jobId = buf.variables.terminal_job_id as number;
          this.setIdentifier(this.jobId);
          return true;
        }

        // または直接取得を試みる
        if (!this.adapter) {
          this.adapter = await AdapterFactory.getAdapter(this.denops);
        }
        const jobId = await this.adapter.getTerminalJobId(
          this.denops,
          buf.bufnr,
        );
        if (jobId > 0) {
          this.jobId = jobId;
          this.setIdentifier(jobId);
          return true;
        }
      }
    }

    return false;
  }
}
