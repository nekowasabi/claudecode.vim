import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.217.0/assert/mod.ts";

// Backend関連のモジュールが正しくロードされるか確認
Deno.test("Backend modules exist", async () => {
  // claudeBackend.tsのインポート確認
  const backendModule = await import("../denops/claudecode/backend/claudeBackend.ts");
  assertExists(backendModule.BackendType);
  assertExists(backendModule.BaseBackend);
  assertEquals(backendModule.BackendType.Terminal, "terminal");
  assertEquals(backendModule.BackendType.Tmux, "tmux");
});

Deno.test("TerminalBackend module exists", async () => {
  const module = await import("../denops/claudecode/backend/terminalBackend.ts");
  assertExists(module.TerminalBackend);
});

Deno.test("TmuxBackend module exists", async () => {
  const module = await import("../denops/claudecode/backend/tmuxBackend.ts");
  assertExists(module.TmuxBackend);
});

Deno.test("BackendFactory module exists", async () => {
  const module = await import("../denops/claudecode/backend/backendFactory.ts");
  assertExists(module.BackendFactory);
  assertExists(module.BackendFactory.getOrCreate);
  assertExists(module.BackendFactory.create);
  assertExists(module.BackendFactory.reset);
  assertExists(module.BackendFactory.getCurrent);
});

// ClaudeSessionのテスト
Deno.test("ClaudeSession module exists", async () => {
  const module = await import("../denops/claudecode/claudeSession.ts");
  assertExists(module.ClaudeSession);
  assertExists(module.ClaudeSession.getInstance);
  assertExists(module.ClaudeSession.reset);
});
