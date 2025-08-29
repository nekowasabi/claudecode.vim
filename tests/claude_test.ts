// This comment for vim-test plugin: Use denops' test() instead of built-in Deno.test()
import {
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

test("both", "ClaudeSendPromptByCommandline should work", async (denops) => {
  await denops.cmd("ClaudeRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertClaudeBufferAlive(denops);
  await sleep(SLEEP_BEFORE_ASSERT);
  await denops.cmd("ClaudeSendPromptByCommandline test");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertClaudeBufferString(denops, "input: test\n");
});
