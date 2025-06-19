import { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import { EditorAdapter, KeymapOptions, WindowConfig } from "./editorAdapter.ts";

export class VimAdapter implements EditorAdapter {
  async createBuffer(
    denops: Denops,
    listed: boolean,
    scratch: boolean,
  ): Promise<number> {
    // Vimでは新しいバッファを作成
    await denops.cmd("enew");
    const bufnr = await fn.bufnr(denops, "%") as number;

    if (!listed) {
      await denops.cmd("setlocal nobuflisted");
    }

    if (scratch) {
      await denops.cmd("setlocal buftype=nofile");
      await denops.cmd("setlocal bufhidden=hide");
      await denops.cmd("setlocal noswapfile");
    }

    return bufnr;
  }

  async openWindow(
    denops: Denops,
    buffer: number,
    _enter: boolean,
    config: WindowConfig,
  ): Promise<number> {
    // Vimでは常に分割ウィンドウを使用（ポップアップの代わり）
    const splitCmd = config.height > config.width ? "split" : "vsplit";
    await denops.cmd(`${splitCmd} | buffer ${buffer}`);
    return await fn.winnr(denops) as number;
  }

  async closeWindow(
    denops: Denops,
    winId: number,
    _force: boolean,
  ): Promise<void> {
    // 通常のウィンドウとして閉じる
    const currentWin = await fn.winnr(denops);
    await denops.cmd(`${winId}wincmd w`);
    await denops.cmd("close");
    await denops.cmd(`${currentWin}wincmd w`);
  }

  async setBufferLines(
    denops: Denops,
    buffer: number,
    start: number,
    end: number,
    lines: string[],
  ): Promise<void> {
    const currentBuf = await fn.bufnr(denops);
    await denops.cmd(`buffer ${buffer}`);

    // 既存の内容を削除
    if (end === -1) {
      await denops.cmd(`${start + 1},$delete _`);
    } else {
      await denops.cmd(`${start + 1},${end}delete _`);
    }

    // 新しい内容を追加
    if (lines.length > 0) {
      const lineNum = start === 0 ? 0 : start;
      await fn.append(denops, lineNum, lines);
    }

    await denops.cmd(`buffer ${currentBuf}`);
  }

  async setBufferKeymap(denops: Denops, options: KeymapOptions): Promise<void> {
    const currentBuf = await fn.bufnr(denops);
    await denops.cmd(`buffer ${options.buffer}`);

    const mapCmd = options.opts.noremap ? "noremap" : "map";
    const silentFlag = options.opts.silent ? "<silent>" : "";
    const exprFlag = options.opts.expr ? "<expr>" : "";

    await denops.cmd(
      `${options.mode}${mapCmd} <buffer> ${silentFlag} ${exprFlag} ${options.lhs} ${options.rhs}`,
    );

    await denops.cmd(`buffer ${currentBuf}`);
  }

  async setWindowOption(
    denops: Denops,
    winId: number,
    option: string,
    value: unknown,
  ): Promise<void> {
    if (option === "winblend") {
      // Vimでは透明度は設定できないのでスキップ
      return;
    }

    // 通常のウィンドウオプションとして設定
    const currentWin = await fn.winnr(denops);
    await denops.cmd(`${winId}wincmd w`);
    await denops.cmd(`setlocal ${option}=${value}`);
    await denops.cmd(`${currentWin}wincmd w`);
  }

  async getTerminalJobId(denops: Denops, buffer: number): Promise<number> {
    // Vimではterm_getjob()を使用してジョブを取得
    const job = await denops.call("term_getjob", buffer);
    if (!job) {
      throw new Error("Terminal job not found");
    }

    // ジョブからチャンネルを取得
    const channel = await denops.call("job_getchannel", job);
    return channel as number;
  }

  async sendToTerminal(
    denops: Denops,
    _jobId: number,
    data: string,
  ): Promise<void> {
    // Vimではterm_sendkeys()を使用
    const bufnr = await fn.bufnr(denops, "claude");
    if (bufnr !== -1) {
      await denops.call("term_sendkeys", bufnr, data);
    }
  }

  async openTerminal(denops: Denops, command: string): Promise<number> {
    // Vim 8.1以降のターミナル機能を使用
    const hasTerminal = await fn.has(denops, "terminal");

    if (!hasTerminal) {
      throw new Error("Terminal feature is not available in this Vim version");
    }

    await denops.cmd(`terminal ++curwin ${command}`);
    return await fn.bufnr(denops, "%") as number;
  }

  isFloatingWindowSupported(): boolean {
    // Vimではフローティングウィンドウの代わりにスプリットウィンドウを使用
    return false;
  }

  isTerminalSupported(): boolean {
    // Vim 8.1以降でターミナルがサポートされているかチェックが必要
    return true;
  }
}
