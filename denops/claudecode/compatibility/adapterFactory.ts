import { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import { EditorAdapter } from "./editorAdapter.ts";
import { NeovimAdapter } from "./neovimAdapter.ts";
import { VimAdapter } from "./vimAdapter.ts";
import { EditorDetector } from "../editorDetector.ts";

export class AdapterFactory {
  private static adapter: EditorAdapter | null = null;

  static async getAdapter(denops: Denops): Promise<EditorAdapter> {
    if (this.adapter !== null) {
      return this.adapter;
    }

    const editorType = await EditorDetector.detect(denops);

    if (editorType === "neovim") {
      this.adapter = new NeovimAdapter();
    } else {
      this.adapter = new VimAdapter();
    }

    return this.adapter;
  }

  static reset(): void {
    this.adapter = null;
    EditorDetector.reset();
  }
}
