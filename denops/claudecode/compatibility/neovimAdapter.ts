import { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import * as nvim from "https://deno.land/x/denops_std@v6.5.1/function/nvim/mod.ts";
import { EditorAdapter, KeymapOptions, WindowConfig } from "./editorAdapter.ts";

export class NeovimAdapter implements EditorAdapter {
  async createBuffer(
    denops: Denops,
    listed: boolean,
    scratch: boolean,
  ): Promise<number> {
    return await nvim.nvim_create_buf(denops, listed, scratch) as number;
  }

  async openWindow(
    denops: Denops,
    buffer: number,
    enter: boolean,
    config: WindowConfig,
  ): Promise<number> {
    const nvimConfig: any = {
      relative: config.relative,
      width: config.width,
      height: config.height,
      row: config.row,
      col: config.col,
    };

    // オプショナルなプロパティを追加
    if (config.style) {
      nvimConfig.style = config.style;
    }

    if (config.border) {
      nvimConfig.border = config.border;
    }

    return await nvim.nvim_open_win(
      denops,
      buffer,
      enter,
      nvimConfig,
    ) as number;
  }

  async closeWindow(
    denops: Denops,
    winId: number,
    force: boolean,
  ): Promise<void> {
    try {
      await denops.call("nvim_win_close", winId, force);
    } catch (error) {
      // Window might already be closed
      console.error("Failed to close window:", error);
    }
  }

  async setBufferLines(
    denops: Denops,
    buffer: number,
    start: number,
    end: number,
    lines: string[],
  ): Promise<void> {
    await nvim.nvim_buf_set_lines(denops, buffer, start, end, false, lines);
  }

  async setBufferKeymap(denops: Denops, options: KeymapOptions): Promise<void> {
    await nvim.nvim_buf_set_keymap(
      denops,
      options.buffer,
      options.mode,
      options.lhs,
      options.rhs,
      options.opts,
    );
  }

  async setWindowOption(
    denops: Denops,
    winId: number,
    option: string,
    value: unknown,
  ): Promise<void> {
    await nvim.nvim_win_set_option(denops, winId, option, value);
  }

  async getTerminalJobId(denops: Denops, buffer: number): Promise<number> {
    const currentBuf = await fn.bufnr(denops);
    await denops.cmd(`buffer ${buffer}`);
    const jobId = await denops.eval("&channel") as number;
    await denops.cmd(`buffer ${currentBuf}`);
    return jobId;
  }

  async sendToTerminal(
    denops: Denops,
    jobId: number,
    data: string,
  ): Promise<void> {
    await denops.call("chansend", jobId, data);
  }

  async openTerminal(denops: Denops, command: string): Promise<number> {
    await denops.cmd(`terminal ${command}`);
    return await fn.bufnr(denops, "%") as number;
  }

  isFloatingWindowSupported(): boolean {
    return true;
  }

  isTerminalSupported(): boolean {
    return true;
  }
}
