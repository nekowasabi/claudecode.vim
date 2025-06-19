import { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";

export type EditorType = "neovim" | "vim";

export class EditorDetector {
  private static editorType: EditorType | null = null;

  static async detect(denops: Denops): Promise<EditorType> {
    if (this.editorType !== null) {
      return this.editorType;
    }

    const hasNvim = await fn.has(denops, "nvim");
    this.editorType = hasNvim ? "neovim" : "vim";
    
    return this.editorType;
  }

  static reset(): void {
    this.editorType = null;
  }
}