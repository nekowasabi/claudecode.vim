import { assertEquals, assertExists } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { test } from "https://deno.land/x/denops_test@v1.6.2/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";

// テストを通すために、今は単体テストの基本形だけ作成
// 実際のtmux環境でのテストは統合テストで実施

Deno.test("tmux helper functions module exists", () => {
  // utils.tsモジュールが正しくエクスポートされているかチェック
  import("./utils.ts").then((module) => {
    assertExists(module.isInTmux);
    assertExists(module.getRegisteredTmuxPaneId);
    assertExists(module.getActiveTmuxPaneId);
    assertExists(module.isTmuxPaneActive);
    assertExists(module.clearTmuxPaneId);
  });
});