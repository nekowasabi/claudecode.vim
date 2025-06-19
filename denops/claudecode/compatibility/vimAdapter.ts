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
    // Vimではポップアップウィンドウを使用（Vim 8.2以降）
    const hasPopup = await fn.has(denops, "popupwin");

    if (hasPopup) {
      // ポップアップウィンドウとして開く
      const popupId = await denops.call("popup_create", buffer, {
        line: config.row + 1,
        col: config.col + 1,
        minwidth: config.width,
        maxwidth: config.width,
        minheight: config.height,
        maxheight: config.height,
        border: config.border ? [1, 1, 1, 1] : [0, 0, 0, 0],
        scrollbar: 0,
        zindex: 50,
        mapping: 0,
      }) as number;

      return popupId;
    } else {
      // ポップアップが使えない場合は分割ウィンドウを使用
      const splitCmd = config.height > config.width ? "split" : "vsplit";
      await denops.cmd(`${splitCmd} | buffer ${buffer}`);
      return await fn.winnr(denops) as number;
    }
  }

  async closeWindow(
    denops: Denops,
    winId: number,
    _force: boolean,
  ): Promise<void> {
    const hasPopup = await fn.has(denops, "popupwin");

    if (hasPopup) {
      try {
        await denops.call("popup_close", winId);
      } catch {
        // ポップアップが既に閉じられている可能性
      }
    } else {
      // 通常のウィンドウとして閉じる
      const currentWin = await fn.winnr(denops);
      await denops.cmd(`${winId}wincmd w`);
      await denops.cmd("close");
      await denops.cmd(`${currentWin}wincmd w`);
    }
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
    const hasPopup = await fn.has(denops, "popupwin");

    if (hasPopup && option === "winblend") {
      // Vimのポップアップでは透明度は設定できないのでスキップ
      return;
    }

    if (!hasPopup) {
      // 通常のウィンドウオプションとして設定
      const currentWin = await fn.winnr(denops);
      await denops.cmd(`${winId}wincmd w`);
      await denops.cmd(`setlocal ${option}=${value}`);
      await denops.cmd(`${currentWin}wincmd w`);
    }
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
    // Vim 8.2以降でポップアップウィンドウがサポートされているかチェックが必要
    // ここでは簡略化のためtrueを返す（実際は動的にチェックすべき）
    return true;
  }

  isTerminalSupported(): boolean {
    // Vim 8.1以降でターミナルがサポートされているかチェックが必要
    return true;
  }
}
