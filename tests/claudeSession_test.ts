import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ClaudeSession } from "../denops/claudecode/claudeSession.ts";

// Mock Denops
const mockDenops = {
  name: "claudecode",
  call: (func: string, ...args: unknown[]) => {
    if (func === "expand") {
      const arg = args[0] as string;
      if (arg === "$TMUX") return "";
      if (arg === "$CLAUDE_USE_UNIFIED") return "0";
      return arg;
    }
    if (func === "exists") return 0;
    return Promise.resolve();
  },
  cmd: () => Promise.resolve(),
} as any;

Deno.test("ClaudeSession module exists", () => {
  // ClaudeSessionがインポートできることを確認
  const session = ClaudeSession.getInstance(mockDenops);
  assertEquals(typeof session.start, "function");
  assertEquals(typeof session.sendPrompt, "function");
  assertEquals(typeof session.hide, "function");
  assertEquals(typeof session.show, "function");
  assertEquals(typeof session.exit, "function");
  assertEquals(typeof session.isActive, "function");
  assertEquals(typeof session.getBackend, "function");

  // 後始末
  ClaudeSession.reset();
});

Deno.test("ClaudeSession singleton behavior", () => {
  // シングルトンの動作を確認
  const session1 = ClaudeSession.getInstance(mockDenops);
  const session2 = ClaudeSession.getInstance(mockDenops);

  assertEquals(session1, session2); // 同じインスタンス

  // リセット後は新しいインスタンス
  ClaudeSession.reset();
  const session3 = ClaudeSession.getInstance(mockDenops);

  // session3は新しいインスタンスだが、型は同じ
  assertEquals(typeof session3.start, "function");

  // 後始末
  ClaudeSession.reset();
});

Deno.test("ClaudeSession backend config detection", async () => {
  // tmux環境のMock
  const mockDenopsWithTmux = {
    name: "claudecode",
    call: (func: string, ...args: unknown[]) => {
      if (func === "expand") {
        const arg = args[0] as string;
        if (arg === "$TMUX") return "/tmp/tmux-1000/default,12345,0"; // tmux環境
        if (arg === "$CLAUDE_USE_UNIFIED") return "0";
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

  const session = ClaudeSession.getInstance(mockDenopsWithTmux);

  // インスタンス作成後、基本メソッドが利用可能
  assertEquals(typeof session.isActive, "function");
  assertEquals(await session.isActive(), false); // Backend未初期化なので false

  // 後始末
  ClaudeSession.reset();
});
