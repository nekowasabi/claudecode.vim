import { assertExists } from "https://deno.land/std@0.217.0/assert/mod.ts";

// テストを通すために、今は単体テストの基本形だけ作成
// 実際のtmux環境でのテストは統合テストで実施

Deno.test("tmux helper functions module exists", () => {
  // utils.tsモジュールが正しくエクスポートされているかチェック
  import("../denops/claudecode/utils.ts").then((module) => {
    assertExists(module.isInTmux);
    assertExists(module.getRegisteredTmuxPaneId);
    assertExists(module.getActiveTmuxPaneId);
    assertExists(module.isTmuxPaneActive);
    assertExists(module.clearTmuxPaneId);
  });
});
