import { assertExists } from "https://deno.land/std@0.217.0/assert/mod.ts";

// テストを通すために、今は単体テストの基本形だけ作成
// 実際のtmux環境でのテストは統合テストで実施

Deno.test("actualClaudeCommand module exists", async () => {
  // actualClaudeCommand.tsモジュールが正しくロードされるかチェック
  const module = await import("./actualClaudeCommand.ts");
  assertExists(module.commands);
  assertExists(module.commands.run);
  assertExists(module.commands.sendPrompt);
  assertExists(module.commands.exit);
});