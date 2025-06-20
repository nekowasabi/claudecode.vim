import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { test } from "https://deno.land/x/denops_test@v1.8.0/mod.ts";
import { EditorDetector } from "./editorDetector.ts";

test({
  mode: "all",
  name: "EditorDetector",
  fn: async (denops) => {
    EditorDetector.reset();

    const editorType = await EditorDetector.detect(denops);

    if (denops.meta.host === "nvim") {
      assertEquals(editorType, "neovim");
    } else {
      assertEquals(editorType, "vim");
    }

    // キャッシュが働くことを確認
    const secondCall = await EditorDetector.detect(denops);
    assertEquals(editorType, secondCall);

    // リセット後は再検出されることを確認
    EditorDetector.reset();
    const afterReset = await EditorDetector.detect(denops);
    assertEquals(editorType, afterReset);
  },
});
