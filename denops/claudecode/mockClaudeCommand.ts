import { emit } from "https://deno.land/x/denops_std@v6.5.1/autocmd/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import type { ClaudeCommand } from "./claudeCommand.ts";

let mockClaudeBufnr: number | undefined = undefined;

export const commands: ClaudeCommand = {
  run: async (denops: Denops): Promise<undefined> => {
    const bufnr = await fn.bufnr(denops, "%");
    await denops.cmd("file dummyclaude"); // set buffer name

    await emit(denops, "User", "ClaudeOpen");
    mockClaudeBufnr = bufnr;
  },

  sendPrompt: async (
    denops: Denops,
    _jobId: number,
    prompt: string,
  ): Promise<undefined> => {
    await fn.feedkeys(denops, `ainput: ${prompt}\n`, "x");
  },

  exit: async (
    denops: Denops,
    _jobId: number,
    _bufnr: number,
  ): Promise<undefined> => {
    if (mockClaudeBufnr === undefined) {
      return;
    }

    await denops.cmd(`bdelete! ${mockClaudeBufnr}`);
    mockClaudeBufnr = undefined;
    await denops.cmd("bd!");
  },

  // deno-lint-ignore require-await
  checkIfClaudeBuffer: async (_: Denops, bufnr: number): Promise<boolean> => {
    return bufnr === mockClaudeBufnr;
  },
  isTestMode: () => true,
};
