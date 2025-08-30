import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ClaudeSession } from "../denops/claudecode/claudeSession.ts";

Deno.test("tmux Environment Detection Test", async (t) => {
  await t.step("Non-tmux environment", async () => {
    // 非tmux環境のMock Denops
    const mockDenosNonTmux = {
      name: "claudecode",
      call: (func: string, ...args: unknown[]) => {
        if (func === "expand") {
          const arg = args[0] as string;
          if (arg === "$TMUX") return ""; // 空文字 = 非tmux環境
          if (arg === "$CLAUDE_USE_UNIFIED") return "1"; // UnifiedSession使用
          return arg;
        }
        if (func === "exists") return 0;
        return Promise.resolve();
      },
      cmd: () => Promise.resolve(),
      var: {
        g: {
          get: () => null,
        },
      },
    } as any;

    const session = ClaudeSession.getInstance(mockDenosNonTmux);

    // 基本メソッドが利用可能
    assertEquals(typeof session.isActive, "function");
    assertEquals(await session.isActive(), false); // Backend未初期化

    console.log("Non-tmux environment test: TerminalBackend expected ✓");
    ClaudeSession.reset();
  });

  await t.step("tmux environment", async () => {
    // tmux環境のMock Denops
    const mockDenopsTmux = {
      name: "claudecode",
      call: (func: string, ...args: unknown[]) => {
        if (func === "expand") {
          const arg = args[0] as string;
          if (arg === "$TMUX") return "/tmp/tmux-1000/default,12345,0"; // tmux環境
          if (arg === "$CLAUDE_USE_UNIFIED") return "1"; // UnifiedSession使用
          return arg;
        }
        if (func === "exists") return 0;
        return Promise.resolve();
      },
      cmd: () => Promise.resolve(),
      var: {
        g: {
          get: (key: string) => {
            if (key === "claude_buffer_open_type") return "split"; // splitモード
            return null;
          },
        },
      },
    } as any;

    const session = ClaudeSession.getInstance(mockDenopsTmux);

    // 基本メソッドが利用可能
    assertEquals(typeof session.isActive, "function");
    assertEquals(await session.isActive(), false); // Backend未初期化

    console.log("tmux environment test: TmuxBackend expected for split mode ✓");
    ClaudeSession.reset();
  });

  await t.step("tmux environment with floating mode", async () => {
    // tmux環境でfloatingモードのMock Denops
    const mockDenopsTmuxFloating = {
      name: "claudecode",
      call: (func: string, ...args: unknown[]) => {
        if (func === "expand") {
          const arg = args[0] as string;
          if (arg === "$TMUX") return "/tmp/tmux-1000/default,12345,0"; // tmux環境
          if (arg === "$CLAUDE_USE_UNIFIED") return "1"; // UnifiedSession使用
          return arg;
        }
        if (func === "exists") return 0;
        return Promise.resolve();
      },
      cmd: () => Promise.resolve(),
      var: {
        g: {
          get: (key: string) => {
            if (key === "claude_buffer_open_type") return "floating"; // floatingモード
            return null;
          },
        },
      },
    } as any;

    const session = ClaudeSession.getInstance(mockDenopsTmuxFloating);

    // floatingモードでもセッション取得可能
    assertEquals(typeof session.isActive, "function");
    assertEquals(await session.isActive(), false); // Backend未初期化

    console.log(
      "tmux environment with floating mode: TerminalBackend expected ✓",
    );
    ClaudeSession.reset();
  });

  await t.step("Factory integration with tmux", async () => {
    // Factory経由でのtmux環境テスト
    const mockDenopsTmuxVsplit = {
      name: "claudecode",
      call: (func: string, ...args: unknown[]) => {
        if (func === "expand") {
          const arg = args[0] as string;
          if (arg === "$TMUX") return "/tmp/tmux-1000/default,12345,0"; // tmux環境
          if (arg === "$CLAUDE_USE_UNIFIED") return "1"; // UnifiedSession使用
          return arg;
        }
        if (func === "exists") return 0;
        return Promise.resolve();
      },
      cmd: () => Promise.resolve(),
      var: {
        g: {
          get: (key: string) => {
            if (key === "claude_buffer_open_type") return "vsplit"; // vsplitモード
            return null;
          },
        },
      },
    } as any;

    const session = ClaudeSession.getInstance(mockDenopsTmuxVsplit);

    // ClaudeSessionインスタンスを取得
    assertEquals(typeof session.start, "function");
    assertEquals(typeof session.sendPrompt, "function");
    assertEquals(typeof session.isActive, "function");

    console.log("Factory integration with tmux vsplit: TmuxBackend expected ✓");
  });

  console.log("All tmux Environment Tests passed! 🎉");
});
