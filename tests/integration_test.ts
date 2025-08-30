import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.217.0/assert/mod.ts";
// import { test } from "https://deno.land/x/denops_test@v1.6.2/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";

// tmux環境での統合テスト
// 注意: これらのテストはtmux環境でのみ実行可能

Deno.test("Integration: tmux workflow test", async (t) => {
  // tmux環境かどうかをチェック
  const tmuxEnv = Deno.env.get("TMUX");
  if (!tmuxEnv) {
    console.log("Skipping tmux integration test: not in tmux environment");
    return;
  }

  await t.step("Full tmux workflow", async () => {
    // このテストは実際のVim/Neovim環境で手動テストとして実行
    console.log("Testing tmux workflow:");
    console.log("1. :ClaudeRun - Create new tmux pane");
    console.log("2. :ClaudeSendPrompt - Send prompt to existing pane");
    console.log("3. :ClaudeHide - Detach pane");
    console.log("4. :ClaudeRun - Reattach existing pane");
    console.log("5. :ClaudeExit - Kill tmux pane");
  });
});

// 非tmux環境での後方互換性テスト
Deno.test("Integration: Command registration", async (t) => {
  await t.step("Basic command availability", async () => {
    // ClaudeSessionとmain.tsが正しく読み込まれることを確認
    const mainModule = await import("../denops/claudecode/main.ts");
    assertExists(mainModule.main);

    const sessionModule = await import("../denops/claudecode/claudeSession.ts");
    assertExists(sessionModule.ClaudeSession);
    assertExists(sessionModule.ClaudeSession.getInstance);

    console.log("Main module and ClaudeSession successfully loaded");
  });

  await t.step("Buffer operations module", async () => {
    const bufferModule = await import(
      "../denops/claudecode/bufferOperation.ts"
    );
    assertExists(bufferModule.openClaudeBuffer);
    assertExists(bufferModule.sendPrompt);
    assertExists(bufferModule.getClaudeBuffer);

    console.log("Buffer operations module successfully loaded");
  });
});

// Vim/Neovim互換性テスト
Deno.test("Integration: Editor compatibility", async (t) => {
  await t.step("Editor detection module", async () => {
    const editorModule = await import("../denops/claudecode/editorDetector.ts");
    assertExists(editorModule.EditorDetector);
    assertExists(editorModule.EditorDetector.detect);

    console.log("Editor detection module successfully loaded");
  });

  await t.step("Compatibility layer", async () => {
    const adapterFactoryModule = await import(
      "../denops/claudecode/compatibility/adapterFactory.ts"
    );
    assertExists(adapterFactoryModule.AdapterFactory);
    assertExists(adapterFactoryModule.AdapterFactory.getAdapter);

    const neovimAdapterModule = await import(
      "../denops/claudecode/compatibility/neovimAdapter.ts"
    );
    assertExists(neovimAdapterModule.NeovimAdapter);

    const vimAdapterModule = await import(
      "../denops/claudecode/compatibility/vimAdapter.ts"
    );
    assertExists(vimAdapterModule.VimAdapter);

    console.log("Compatibility layer modules successfully loaded");
  });
});

// エッジケーステスト
Deno.test("Integration: Edge cases", async (t) => {
  await t.step("Multiple tmux sessions", async () => {
    // 複数のtmuxセッションがある場合の動作確認
    console.log("Edge case: Multiple tmux sessions");
    console.log("- Pane ID should be unique across sessions");
    console.log("- join-pane should work across sessions");
  });

  await t.step("Tmux pane killed externally", async () => {
    // 外部からtmuxペインが削除された場合の処理
    console.log("Edge case: Externally killed pane");
    console.log("- Should detect pane doesn't exist");
    console.log("- Should clear stored pane ID");
    console.log("- Should create new pane on next run");
  });

  await t.step("Rapid command execution", async () => {
    // 高速な連続コマンド実行
    console.log("Edge case: Rapid commands");
    console.log("- Should handle rapid hide/show cycles");
    console.log("- Should not create duplicate panes");
  });
});

// パフォーマンステスト
Deno.test("Integration: Performance", async (t) => {
  await t.step("Command execution time", async () => {
    const tmuxEnv = Deno.env.get("TMUX");
    if (!tmuxEnv) {
      console.log("Skipping performance test: not in tmux");
      return;
    }

    // tmuxコマンドの実行時間を測定
    const startTime = performance.now();

    // tmux list-panesコマンドのパフォーマンステスト
    const proc = new Deno.Command("tmux", {
      args: ["list-panes", "-a", "-F", "#{pane_id}"],
    });
    await proc.output();

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    console.log(`tmux list-panes execution time: ${executionTime}ms`);
    // 通常は100ms以内に完了するべき
    assertEquals(executionTime < 100, true, "tmux command should be fast");
  });

  await t.step("Large prompt handling", async () => {
    // 大きなプロンプトの処理テスト
    console.log("Performance: Large prompt");
    console.log("- Should handle multi-line prompts");
    console.log("- Should use temp file for large content");
  });
});
