// This comment for vim-test plugin: Use denops' test() instead of built-in Deno.test()
import {
  assertClaudeBufferHidden,
  assertClaudeBufferShown,
  assertClaudeBufferString,
  sleep,
} from "./assertions.ts";
import { assertClaudeBufferAlive } from "./assertions.ts";
import { test } from "./testRunner.ts";

const SLEEP_BEFORE_ASSERT = 100;

test("both", "ClaudeRun should work", async (denops) => {
  await denops.cmd("ClaudeRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertClaudeBufferShown(denops);
});

test("both", "ClaudeAddCurrentFile should work", async (denops) => {
  await denops.cmd("ClaudeAddCurrentFile");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertClaudeBufferAlive(denops);
  await assertClaudeBufferString(denops, "input: /add \n");
});

test("both", "ClaudeSilentRun should work", async (denops) => {
  // TODO if nothing is open, claude buffer is shown on the window(subtle bug)
  await denops.cmd("e hoge.txt"); // open a buffer
  await denops.cmd("ClaudeSilentRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertClaudeBufferHidden(denops);
});

test(
  "both",
  "ClaudeAddBuffers should return empty for files not under git management",
  async (denops) => {
    await denops.cmd("ClaudeRun");
    await sleep(SLEEP_BEFORE_ASSERT);
    await denops.cmd("ClaudeAddBuffers");
    await sleep(SLEEP_BEFORE_ASSERT);
    await assertClaudeBufferAlive(denops);
    await assertClaudeBufferString(denops, "input: /add \n");
  },
);

test(
  "both",
  "ClaudeAddBuffers should return /add `bufferName` if there is a buffer under git management",
  async (denops) => {
    await denops.cmd("ClaudeRun");
    await sleep(SLEEP_BEFORE_ASSERT);
    await denops.cmd("e ./tests/claude_test.ts");
    await denops.cmd("ClaudeAddBuffers");
    await sleep(SLEEP_BEFORE_ASSERT);
    await assertClaudeBufferString(
      denops,
      "input: /add tests/claude_test.ts\n",
    );
  },
);

test("both", "ClaudeSendPromptByCommandline should work", async (denops) => {
  await denops.cmd("ClaudeRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertClaudeBufferAlive(denops);
  await sleep(SLEEP_BEFORE_ASSERT);
  await denops.cmd("ClaudeSendPromptByCommandline test");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertClaudeBufferString(denops, "input: test\n");
});

test(
  "both",
  "ClaudeSilentSendPromptByCommandline should work",
  async (denops) => {
    await denops.cmd("ClaudeSilentRun");
    await sleep(SLEEP_BEFORE_ASSERT);
    await assertClaudeBufferAlive(denops);
    await sleep(SLEEP_BEFORE_ASSERT);
    await denops.cmd("ClaudeSilentSendPromptByCommandline silent test");
    await sleep(SLEEP_BEFORE_ASSERT);
    await assertClaudeBufferString(denops, "input: silent test\n");
  },
);
