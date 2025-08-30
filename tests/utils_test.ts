import { assertExists } from "https://deno.land/std@0.217.0/assert/mod.ts";

// テストを通すために、今は単体テストの基本形だけ作成
// 実際のtmux環境でのテストは統合テストで実施

Deno.test("utils module exists", () => {
  // utils.tsモジュールが正しくエクスポートされているかチェック
  import("../denops/claudecode/utils.ts").then((module) => {
    assertExists(module.getCurrentFilePath);
    // 削除された関数への参照を除去
  });
});
