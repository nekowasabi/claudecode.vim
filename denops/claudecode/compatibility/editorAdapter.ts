import { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";

export interface WindowConfig {
  width: number;
  height: number;
  row: number;
  col: number;
  relative: "editor" | "win" | "cursor";
  style?: string;
  border?: string | string[];
}

export interface BufferHighlight {
  line: number;
  col_start: number;
  col_end: number;
  hl_group: string;
}

export interface KeymapOptions {
  buffer: number;
  mode: string;
  lhs: string;
  rhs: string;
  opts: {
    noremap: boolean;
    silent: boolean;
    expr?: boolean;
  };
}

export interface EditorAdapter {
  createBuffer(
    denops: Denops,
    listed: boolean,
    scratch: boolean,
  ): Promise<number>;

  openWindow(
    denops: Denops,
    buffer: number,
    enter: boolean,
    config: WindowConfig,
  ): Promise<number>;

  closeWindow(denops: Denops, winId: number, force: boolean): Promise<void>;

  setBufferLines(
    denops: Denops,
    buffer: number,
    start: number,
    end: number,
    lines: string[],
  ): Promise<void>;

  setBufferKeymap(denops: Denops, options: KeymapOptions): Promise<void>;

  setWindowOption(
    denops: Denops,
    winId: number,
    option: string,
    value: unknown,
  ): Promise<void>;

  getTerminalJobId(denops: Denops, buffer: number): Promise<number>;

  sendToTerminal(denops: Denops, jobId: number, data: string): Promise<void>;

  openTerminal(denops: Denops, command: string): Promise<number>;

  isFloatingWindowSupported(): boolean;

  isTerminalSupported(): boolean;
}
