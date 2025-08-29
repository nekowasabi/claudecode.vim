import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";
import { emit } from "https://deno.land/x/denops_std@v6.5.1/autocmd/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import { BackendConfig, BackendType, BaseBackend } from "./claudeBackend.ts";

/**
 * Tmux Pane実装のバックエンド
 * tmuxのペインでClaude Codeを実行
 */
export class TmuxBackend extends BaseBackend {
  private paneId?: string;

  constructor(denops: Denops, config: BackendConfig) {
    super(denops, config);
  }

  async run(command: string): Promise<string | number> {
    // 既存のペインIDを確認
    const existingPaneId = await this.getRegisteredPaneId();
    if (existingPaneId && await this.isPaneExists(existingPaneId)) {
      // 既存のペインを再アタッチ
      await this.reattachPane(existingPaneId);
      this.paneId = existingPaneId;
      await this.setIdentifier(existingPaneId);
      await emit(this.denops, "User", "ClaudeOpen");
      return existingPaneId;
    }

    // 新しいtmuxペインを作成
    const paneId = await this.createNewPane(command);
    if (paneId) {
      this.paneId = paneId;
      await this.setIdentifier(paneId);
      await v.g.set(this.denops, "claude_tmux_pane_id", paneId);
      await emit(this.denops, "User", "ClaudeOpen");
      return paneId;
    }

    throw new Error("Failed to create tmux pane");
  }

  async sendPrompt(prompt: string): Promise<void> {
    if (!this.paneId) {
      throw new Error("Tmux pane is not active");
    }

    // 一時ファイルを使用してプロンプトを送信（改行を保持）
    const tempFile = await Deno.makeTempFile({ prefix: "claude_prompt_" });
    await Deno.writeTextFile(tempFile, prompt);

    await this.denops.call(
      "system",
      `tmux load-buffer -b claude_prompt ${tempFile} && ` +
        `tmux paste-buffer -t ${this.paneId} -b claude_prompt -p && ` +
        `tmux delete-buffer -b claude_prompt && ` +
        `tmux send-keys -t ${this.paneId} C-m`,
    );

    try {
      await Deno.remove(tempFile);
    } catch (_) {
      // ignore
    }
  }

  async exit(): Promise<void> {
    if (!this.paneId) {
      return;
    }

    await this.denops.call("system", `tmux send-keys -t ${this.paneId} C-c`);
    await this.denops.call("system", `tmux kill-pane -t ${this.paneId}`);
    await v.g.set(this.denops, "claude_tmux_pane_id", "");

    this.paneId = undefined;
    this.identifier = undefined;
  }

  async hide(): Promise<void> {
    if (!this.paneId) {
      return;
    }

    // ペインをデタッチ（別ウィンドウに移動）
    await this.denops.call("system", `tmux break-pane -d -s ${this.paneId}`);
  }

  async show(): Promise<void> {
    if (!this.paneId) {
      return;
    }

    // ペインを再アタッチ
    await this.reattachPane(this.paneId);
  }

  async isActive(): Promise<boolean> {
    if (!this.paneId) {
      return false;
    }

    return await this.isPaneExists(this.paneId);
  }

  getType(): BackendType {
    return BackendType.Tmux;
  }

  /**
   * tmuxペインが存在するか確認
   */
  private async isPaneExists(paneId: string): Promise<boolean> {
    const checkCmd =
      `tmux list-panes -a -F '#{pane_id}' 2>/dev/null | grep -q '^${paneId}$' && echo exists`;
    const result = await this.denops.call("system", checkCmd) as string;
    return result.trim() === "exists";
  }

  /**
   * 登録済みのtmuxペインIDを取得
   */
  private async getRegisteredPaneId(): Promise<string | undefined> {
    const paneId = await v.g.get(this.denops, "claude_tmux_pane_id");
    if (paneId && typeof paneId === "string" && paneId.length > 0) {
      return paneId;
    }
    return undefined;
  }

  /**
   * 新しいtmuxペインを作成
   */
  private async createNewPane(command: string): Promise<string | undefined> {
    const splitFlag = this.config.openType === "vsplit" ? "-h" : "-v";
    const shellPath = await this.denops.call("expand", "$SHELL") as
      | string
      | undefined;
    const safeShell = shellPath && shellPath.length > 0 ? shellPath : "/bin/sh";

    const escapedCmd = command.replaceAll('"', '\\"');
    const tmuxCmd = [
      "tmux",
      "split-window",
      "-P",
      "-F",
      "'#{pane_id}'",
      splitFlag,
      safeShell,
      "-lc",
      `"${escapedCmd}"`,
    ].join(" ");

    const paneId = ensure(await this.denops.call("system", tmuxCmd), is.String)
      .trim();
    return paneId || undefined;
  }

  /**
   * tmuxペインを再アタッチ
   */
  private async reattachPane(paneId: string): Promise<void> {
    const splitFlag = this.config.openType === "vsplit" ? "-h" : "-v";
    await this.denops.call(
      "system",
      `tmux join-pane ${splitFlag} -s ${paneId}`,
    );
  }

  /**
   * 現在のtmux環境を確認
   */
  static async isInTmux(denops: Denops): Promise<boolean> {
    const tmuxEnv = await denops.call("expand", "$TMUX") as string;
    return tmuxEnv !== "" && tmuxEnv !== "$TMUX";
  }
}
