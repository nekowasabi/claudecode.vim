import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";
import {
  ensure,
  is,
  maybe,
} from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";

/**
 * Gets the additional prompt from vim global variable
 *
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<string[] | undefined>} A promise that resolves to an array of additional prompts, or undefined if no prompts are found.
 */
export async function getPromptFromVimVariable(
  denops: Denops,
  variableName: string,
): Promise<string[] | undefined> {
  const prompts = maybe(
    await v.g.get(denops, variableName),
    is.ArrayOf(is.String),
  );
  return Array.isArray(prompts) ? prompts : undefined;
}

/**
 * Gets the current file path.
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<string>} A promise that resolves to the current file path.
 */
export async function getCurrentFilePath(denops: Denops): Promise<string> {
  const path = await fn.expand(denops, "%:p");
  return ensure(path, is.String);
}

/**
 * Gets the buffer name for a given buffer number.
 * @param {Denops} denops - The Denops instance.
 * @param {number} bufnr - The buffer number.
 * @returns {Promise<string>} A promise that resolves to the buffer name.
 * @throws {Error} Throws an error if the buffer name is not a string.
 */
export async function getBufferName(
  denops: Denops,
  bufnr: number,
): Promise<string> {
  const bufname = await fn.bufname(denops, bufnr);
  return ensure(bufname, is.String);
}

/**
 * Checks if we are running inside a tmux session
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<boolean>} A promise that resolves to true if inside tmux, false otherwise.
 */
export async function isInTmux(denops: Denops): Promise<boolean> {
  const tmuxEnv = await denops.call("expand", "$TMUX") as string;
  return tmuxEnv !== "" && tmuxEnv !== "$TMUX";
}

/**
 * Gets the registered tmux pane ID from vim global variable
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<string | undefined>} A promise that resolves to the pane ID or undefined.
 */
export async function getRegisteredTmuxPaneId(
  denops: Denops,
): Promise<string | undefined> {
  try {
    const paneId = await v.g.get(denops, "claude_tmux_pane_id");
    return maybe(paneId, is.String);
  } catch {
    return undefined;
  }
}

/**
 * Gets the active tmux pane ID if it exists
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<string | undefined>} A promise that resolves to the active pane ID or undefined.
 */
export async function getActiveTmuxPaneId(
  denops: Denops,
): Promise<string | undefined> {
  const paneId = await getRegisteredTmuxPaneId(denops);
  if (!paneId) {
    return undefined;
  }

  // Check if the pane actually exists
  try {
    const result = await denops.call(
      "system",
      `tmux list-panes -F '#{pane_id}' 2>/dev/null | grep -q '^${paneId}$' && echo exists`,
    ) as string;
    return result.trim() === "exists" ? paneId : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Checks if a tmux pane is active
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<boolean>} A promise that resolves to true if pane is active, false otherwise.
 */
export async function isTmuxPaneActive(denops: Denops): Promise<boolean> {
  const paneId = await getActiveTmuxPaneId(denops);
  return paneId !== undefined;
}

/**
 * Clears the tmux pane ID from vim global variable
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<void>} A promise that resolves when the variable is cleared.
 */
export async function clearTmuxPaneId(denops: Denops): Promise<void> {
  await denops.cmd("silent! unlet g:claude_tmux_pane_id");
}
