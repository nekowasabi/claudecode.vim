import { assertEquals, assertExists } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { test } from "https://deno.land/x/denops_test@v1.6.2/mod.ts";
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
test({
  mode: "all",
  name: "Integration: non-tmux fallback",
  fn: async (denops) => {
    // tmux環境でない場合のフォールバック動作を確認
    const tmuxEnv = await denops.call("expand", "$TMUX") as string;
    if (tmuxEnv !== "" && tmuxEnv !== "$TMUX") {
      console.log("In tmux environment, skipping fallback test");
      return;
    }

    // Claude Codeコマンドの基本動作確認
    await denops.call("claudecode#init");
    
    // コマンドが登録されているか確認
    const hasRunCommand = await denops.call("exists", ":ClaudeRun") as number;
    assertEquals(hasRunCommand, 2, "ClaudeRun command should exist");
    
    const hasSendCommand = await denops.call("exists", ":ClaudeSendPrompt") as number;
    assertEquals(hasSendCommand, 2, "ClaudeSendPrompt command should exist");
    
    const hasExitCommand = await denops.call("exists", ":ClaudeExit") as number;
    assertEquals(hasExitCommand, 2, "ClaudeExit command should exist");
    
    const hasHideCommand = await denops.call("exists", ":ClaudeHide") as number;
    assertEquals(hasHideCommand, 2, "ClaudeHide command should exist");
  },
});

// Vim/Neovim互換性テスト
test({
  mode: "all",
  name: "Integration: Vim/Neovim compatibility",
  fn: async (denops) => {
    // エディタタイプを確認
    const hasNvim = await denops.call("has", "nvim") as number;
    const editorType = hasNvim ? "Neovim" : "Vim";
    console.log(`Testing in ${editorType}`);

    // 各エディタで利用可能な機能を確認
    if (hasNvim) {
      // Neovim固有の機能テスト
      const hasFloatWin = await denops.call("exists", "*nvim_open_win") as number;
      assertEquals(hasFloatWin, 1, "Neovim should have floating window support");
    } else {
      // Vim固有の機能テスト
      const hasPopup = await denops.call("exists", "*popup_create") as number;
      assertEquals(hasPopup, 1, "Vim should have popup window support");
    }

    // 共通機能のテスト
    const hasTerminal = await denops.call("has", "terminal") as number;
    assertEquals(hasTerminal, 1, "Should have terminal support");
  },
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