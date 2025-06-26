import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import { feedkeys } from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";
import {
  ensure,
  is,
  maybe,
} from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import { claude } from "./claudeCommand.ts";
import { getCurrentFilePath, getPromptFromVimVariable } from "./utils.ts";
import { AdapterFactory } from "./compatibility/adapterFactory.ts";
import { EditorDetector } from "./editorDetector.ts";

/**
 * Enum representing different buffer layout options.
 */
export const bufferLayouts = ["split", "vsplit", "floating"] as const;
export type BufferLayout = (typeof bufferLayouts)[number];

/**
 * Retrieves the buffer opening type from the global variable "claude_buffer_open_type".
 * split: horizontal split
 * vsplit: vertical split
 * floating: floating window
 */
export async function getOpenBufferType(denops: Denops): Promise<BufferLayout> {
  return (
    maybe(
      await v.g.get(denops, "claude_buffer_open_type"),
      is.LiteralOneOf(bufferLayouts),
    ) ?? "floating"
  );
}

/**
 * すべてのClaude Codeバッファを閉じ、関連するジョブを終了します
 *
 * @param {Denops} denops - Denopsインスタンス
 * @returns {Promise<void>} 処理が完了すると解決されるPromise
 */
export async function exitClaudeBuffer(denops: Denops): Promise<void> {
  const buf_count = ensure(await fn.bufnr(denops, "$"), is.Number);

  for (let i = 1; i <= buf_count; i++) {
    const bufnr = ensure(await fn.bufnr(denops, i), is.Number);

    if (await claude().checkIfClaudeBuffer(denops, bufnr)) {
      const adapter = await AdapterFactory.getAdapter(denops);
      const jobId = await adapter.getTerminalJobId(denops, bufnr);
      claude().exit(denops, jobId, bufnr);
    }
  }
}

/**
 * Claude Code バッファの表示を閉じる（バッファは残す）
 *
 * @param {Denops} denops - Denopsインスタンス
 * @param {number} bufnr - バッファ番号
 * @returns {Promise<void>} 処理が完了すると解決されるPromise
 */
export async function closeClaudeBuffer(
  denops: Denops,
  bufnr: number,
): Promise<void> {
  // すべてのウィンドウを調べて、指定されたバッファが表示されているウィンドウを閉じる
  const winCount = ensure(await denops.call("winnr", "$"), is.Number);

  for (let i = 1; i <= winCount; i++) {
    const winBufnr = ensure(await denops.call("winbufnr", i), is.Number);
    if (winBufnr === bufnr) {
      await denops.cmd(`${i}close`);
      break;
    }
  }
}

/**
 * Claude Code バッファがフローティングウィンドウに表示されているかどうかを判定
 *
 * @param {Denops} denops - Denopsインスタンス
 * @param {number} bufnr - バッファ番号
 * @returns {Promise<boolean>} フローティングウィンドウに表示されている場合はtrue
 */
export async function isClaudeBufferInFloatingWindow(
  denops: Denops,
  bufnr: number,
): Promise<boolean> {
  const editorType = await EditorDetector.detect(denops);

  if (editorType === "vim") {
    // Vimの場合、ポップアップウィンドウかどうかを判定
    // 現在のウィンドウ数を取得し、通常の分割ウィンドウかどうかを判定
    const winCount = ensure(await denops.call("winnr", "$"), is.Number);

    // バッファが表示されているウィンドウを探す
    for (let i = 1; i <= winCount; i++) {
      const winBufnr = ensure(await denops.call("winbufnr", i), is.Number);
      if (winBufnr === bufnr) {
        // 通常の分割ウィンドウとして表示されている場合はfalse
        return false;
      }
    }

    // 通常のウィンドウに見つからない場合はポップアップウィンドウと判定
    return true;
  } else {
    // Neovimの場合、フローティングウィンドウかどうかを判定
    const winCount = ensure(await denops.call("winnr", "$"), is.Number);

    for (let i = 1; i <= winCount; i++) {
      const winBufnr = ensure(await denops.call("winbufnr", i), is.Number);
      if (winBufnr === bufnr) {
        const winId = ensure(await denops.call("win_getid", i), is.Number);
        try {
          const config = await denops.call("nvim_win_get_config", winId);
          // relative が設定されていればフローティングウィンドウ
          return ensure(config, is.Record).relative !== "";
        } catch {
          // エラーが発生した場合は通常のウィンドウと判定
          return false;
        }
      }
    }

    // ウィンドウが見つからない場合はfalse
    return false;
  }
}

/**
 * Opens a Claude Code buffer.
 * If a Claude Code buffer is already alive, it opens that buffer.
 * If no Claude Code buffer is alive, it creates a new buffer and opens it.
 * The way the buffer is opened depends on the value of openBufferType.
 * If openBufferType is "split" or "vsplit", the buffer is opened in a split.
 * Otherwise, the buffer is opened in a floating window.
 *
 * @param {Denops} denops - The Denops instance.
 * @param {BufferLayout} openBufferType - The type of buffer to open.
 * @returns {Promise<undefined | boolean>}
 */
export async function openClaudeBuffer(
  denops: Denops,
  openBufferType: BufferLayout,
): Promise<void> {
  const claudeBuf = await getClaudeBuffer(denops);
  if (openBufferType === "floating") {
    if (claudeBuf === undefined) {
      const adapter = await AdapterFactory.getAdapter(denops);
      const bufnr = await adapter.createBuffer(denops, false, true);
      await openFloatingWindow(denops, bufnr);
      await claude().run(denops);
      return;
    }
    if (claudeBuf !== undefined) {
      await openFloatingWindow(denops, claudeBuf.bufnr);
      return;
    }
  }

  if (openBufferType === "split" || openBufferType === "vsplit") {
    if (claudeBuf === undefined) {
      await denops.cmd(openBufferType);
      await claude().run(denops);
    } else {
      // Use the specified buffer type for existing buffers too
      await denops.cmd(openBufferType);
      await denops.cmd(`buffer ${claudeBuf.bufnr}`);
    }
    return;
  }
}

/**
 * 新しいバッファでClaude Codeをサイレント実行し、直前のバッファに戻る
 * ウィンドウレイアウトを変更せずにClaude Codeバッファを作成する
 */
export async function silentRun(denops: Denops): Promise<void> {
  await denops.cmd("enew");
  await claude().run(denops);
  await denops.cmd("b#");
}
/**
 * Claude Codeバッファの準備処理
 * @param {BufferLayout} openBufferType - バッファオープンタイプ
 * @returns {Promise<void>}
 */
export async function prepareClaudeBuffer(
  denops: Denops,
  openBufferType: BufferLayout,
): Promise<void> {
  if (openBufferType === "floating") {
    await silentRun(denops);
  } else {
    await openClaudeBuffer(denops, openBufferType);
    await denops.cmd("wincmd p");
    console.log("Run Command again.");
    return;
  }
}

/**
 * プロンプトをClaude Codeに送信する
 * @param {Denops} denops - Denopsインスタンス
 * @param {string} input - 送信するプロンプト内容
 * @param {Object} [opts] - オプション設定
 * @param {boolean} [opts.openBuf=true] - バッファを自動で開くかどうか
 * @returns {Promise<void>}
 */
export async function sendPrompt(
  denops: Denops,
  input: string,
  opts = { openBuf: true },
): Promise<void> {
  const claudeBuf = await getClaudeBuffer(denops);
  if (claudeBuf === undefined) {
    await denops.cmd("echo 'Claude Code is not running'");
    await denops.cmd("ClaudeRun");
    return;
  }

  const openBufferType = await getOpenBufferType(denops);

  if (openBufferType === "floating") {
    if (opts?.openBuf) {
      await openClaudeBuffer(denops, openBufferType);
    }
    await sendPromptFromFloatingWindow(denops, input);
    const editorType = await EditorDetector.detect(denops);
    if (editorType === "neovim") {
      await denops.cmd("fclose!");
    } else {
      // Vimの場合はポップアップを閉じる
      try {
        await denops.call("popup_clear");
      } catch {
        // ポップアップが存在しない場合は無視
      }
    }
    return;
  }

  await sendPromptFromSplitWindow(denops, input);
}

/** バッファ内の内容をプロンプトとして送信する
 */
export async function sendPromptByBuffer(
  denops: Denops,
  openBufferType: BufferLayout,
): Promise<void> {
  const bufferContent = ensure(
    await denops.call("getbufline", "%", 1, "$"),
    is.ArrayOf(is.String),
  ).join("\n");

  await denops.cmd("bdelete!");

  if (openBufferType === "floating") {
    await denops.cmd("ClaudeRun");
    await sendPromptFromFloatingWindow(denops, bufferContent);
  } else {
    await sendPromptFromSplitWindow(denops, bufferContent);
  }

  // claude codeバッファの最下段へ移動（ClaudeVisualSelect用）
  await fn.feedkeys(denops, "G");
  return;
}

export async function openFloatingWindowWithSelectedCode(
  denops: Denops,
  start: unknown,
  end: unknown,
  openBufferType: BufferLayout,
): Promise<void> {
  const words = ensure(
    await denops.call("getline", start, end),
    is.ArrayOf(is.String),
  );
  const claudeBuf = await getClaudeBuffer(denops);
  if (openBufferType !== "floating") {
    if (claudeBuf === undefined) {
      await denops.cmd("echo 'Claude Code is not running'");
      await denops.cmd("ClaudeRun");
      return;
    }
  }
  
  // フルパスを取得
  const currentFilePath = await getCurrentFilePath(denops);
  
  const backupPrompt = await getPromptFromVimVariable(
    denops,
    "claude_visual_select_buffer_prompt",
  );
  const adapter = await AdapterFactory.getAdapter(denops);
  const bufnr = await adapter.createBuffer(denops, false, true);
  await openFloatingWindow(denops, bufnr);

  if (backupPrompt) {
    await handleBackupPrompt(denops, bufnr, backupPrompt);
  } else {
    await handleNoBackupPrompt(denops, bufnr, words, currentFilePath);
  }

  await denops.cmd("setlocal filetype=markdown");

  const editorType = await EditorDetector.detect(denops);
  const closeCommand = editorType === "neovim"
    ? "<cmd>fclose!<CR>"
    : "<cmd>call popup_clear()<CR>";
  await adapter.setBufferKeymap(denops, {
    buffer: bufnr,
    mode: "n",
    lhs: "Q",
    rhs: closeCommand,
    opts: { noremap: true, silent: true },
  });
  await adapter.setBufferKeymap(denops, {
    buffer: bufnr,
    mode: "n",
    lhs: "q",
    rhs: "<cmd>ClaudeHideVisualSelectFloatingWindow<CR>",
    opts: { noremap: true, silent: true },
  });
  await adapter.setBufferKeymap(denops, {
    buffer: bufnr,
    mode: "n",
    lhs: "<cr>",
    rhs: "<cmd>ClaudeSendPromptByBuffer<cr>",
    opts: { noremap: true, silent: true },
  });
}

/**
 * バックアッププロンプトを処理する
 *
 * この関数は、指定されたバッファにバックアッププロンプトの内容を設定し、
 * ビジュアルモードでの入力を開始します。
 *
 * @param {Denops} denops - Denopsインスタンス。
 * @param {number} bufnr - バッファ番号。
 * @param {string[]} backupPrompt - バックアッププロンプトの内容。
 */
async function handleBackupPrompt(
  denops: Denops,
  bufnr: number,
  backupPrompt: string[],
) {
  await v.g.set(denops, "claude_visual_select_buffer_prompt", undefined);
  const adapter = await AdapterFactory.getAdapter(denops);
  await adapter.setBufferLines(denops, bufnr, 0, -1, backupPrompt);
  await feedkeys(denops, "Gi");
}

/**
 * バックアッププロンプトがない場合の処理を行います。
 *
 * この関数は、指定されたバッファにファイルタイプを含むコードブロックを設定し、
 * 必要に応じて追加のプロンプトを挿入します。
 *
 * @param {Denops} denops - Denopsインスタンス。
 * @param {number} bufnr - バッファ番号。
 * @param {string[]} words - バッファに設定するコード行。
 * @param {string} currentFilePath - 現在のファイルのフルパス。
 */
async function handleNoBackupPrompt(
  denops: Denops,
  bufnr: number,
  words: string[],
  currentFilePath: string,
) {
  const filetype = ensure(
    await fn.getbufvar(denops, "%", "&filetype"),
    is.String,
  );
  
  words.unshift("```" + filetype);
  words.splice(1, 0, `@${currentFilePath}`); // フルパスを最初の行に追加
  words.push("```");

  const adapter = await AdapterFactory.getAdapter(denops);
  await adapter.setBufferLines(denops, bufnr, -1, -1, words);
  await adapter.setBufferLines(denops, bufnr, 0, 1, []);
  await adapter.setBufferLines(denops, bufnr, -1, -1, [""]);

  const additionalPrompt = await getPromptFromVimVariable(
    denops,
    "claude_additional_prompt",
  );
  if (additionalPrompt) {
    await adapter.setBufferLines(denops, bufnr, -1, -1, ["# rule"]);
    await adapter.setBufferLines(
      denops,
      bufnr,
      -1,
      -1,
      additionalPrompt,
    );
    await adapter.setBufferLines(denops, bufnr, -1, -1, [""]);
  }
  await adapter.setBufferLines(denops, bufnr, -1, -1, ["# prompt"]);
  await adapter.setBufferLines(denops, bufnr, -1, -1, [""]);
  await feedkeys(denops, "Gi");
}

export async function hideVisualSelectFloatingWindow(
  denops: Denops,
): Promise<void> {
  const bufferContent = ensure(
    await denops.call("getbufline", "%", 1, "$"),
    is.ArrayOf(is.String),
  );
  await v.g.set(denops, "claude_visual_select_buffer_prompt", bufferContent);

  const editorType = await EditorDetector.detect(denops);
  if (editorType === "neovim") {
    await denops.cmd("fclose!");
  } else {
    // Vimの場合はポップアップを閉じる
    try {
      await denops.call("popup_clear");
    } catch {
      // ポップアップが存在しない場合は無視
    }
  }
}

/**
 * バッファがターミナルバッファかどうかを確認します。
 * @param {Denops} denops - Denopsインスタンス
 * @param {number} bufnr - バッファ番号
 * @returns {Promise<boolean>}
 */
export async function checkIfTerminalBuffer(
  denops: Denops,
  bufnr: number,
): Promise<boolean> {
  const buftype = await fn.getbufvar(denops, bufnr, "&buftype");
  return buftype === "terminal";
}

/**
 * スプリットウィンドウを開く
 *
 * @param {Denops} denops - Denopsインスタンス
 */
export async function openSplitWindow(denops: Denops): Promise<void> {
  await denops.cmd(await getOpenBufferType(denops));
}

/**
 * Opens a floating window for the specified buffer.
 * The floating window is positioned at the center of the terminal.
 *
 * @param {Denops} denops - The Denops instance.
 * @param {number} bufnr - The buffer number.
 * @returns {Promise<void>}
 */
async function openFloatingWindow(
  denops: Denops,
  bufnr: number,
): Promise<void> {
  const adapter = await AdapterFactory.getAdapter(denops);

  if (!adapter.isFloatingWindowSupported()) {
    // フローティングウィンドウがサポートされていない場合は分割ウィンドウで開く
    await openSplitWindow(denops);
    await denops.cmd(`buffer ${bufnr}`);
    return;
  }

  const terminal_width = Math.floor(
    ensure(await denops.eval("&columns"), is.Number),
  );
  const terminal_height = Math.floor(
    ensure(await denops.eval("&lines"), is.Number),
  );
  const floatWinHeight =
    maybe(await v.g.get(denops, "claude_floatwin_height"), is.Number) || 20;
  const floatWinWidth =
    maybe(await v.g.get(denops, "claude_floatwin_width"), is.Number) || 100;
  const floatWinStyle = maybe(
    await v.g.get(denops, "claude_floatwin_style"),
    is.LiteralOf("minimal"),
  );

  const basicBorderOpt = [
    "single",
    "double",
    "rounded",
    "solid",
    "shadow",
    "none",
  ] as const;
  const tupleBorderOpt = is.UnionOf(
    [
      is.TupleOf([
        is.String,
        is.String,
        is.String,
        is.String,
        is.String,
        is.String,
        is.String,
        is.String,
      ]),
      is.TupleOf([
        is.String,
        is.String,
        is.String,
        is.String,
      ]),
      is.TupleOf([is.String, is.String]),
      is.TupleOf([is.String]),
    ],
  );

  const floatWinBorder = maybe(
    await v.g.get(denops, "claude_floatwin_border"),
    is.UnionOf([is.LiteralOneOf(basicBorderOpt), tupleBorderOpt]),
  ) || "double";

  const floatWinBlend =
    maybe(await v.g.get(denops, "claude_floatwin_blend"), is.Number) || 0;

  const row = Math.floor((terminal_height - floatWinHeight) / 2);
  const col = Math.floor((terminal_width - floatWinWidth) / 2);

  const optsWithoutStyle = {
    relative: "editor" as const,
    border: floatWinBorder,
    width: floatWinWidth,
    height: floatWinHeight,
    row: row,
    col: col,
  };
  const opts:
    | typeof optsWithoutStyle
    | (typeof optsWithoutStyle & { style: "minimal" }) =
      floatWinStyle === "minimal"
        ? { ...optsWithoutStyle, style: "minimal" }
        : optsWithoutStyle;

  const config = {
    width: floatWinWidth,
    height: floatWinHeight,
    row: row,
    col: col,
    relative: "editor" as const,
    style: floatWinStyle,
    border: floatWinBorder,
  };

  const winid = await adapter.openWindow(denops, bufnr, true, config);

  // ウィンドウの透明度を設定
  await adapter.setWindowOption(denops, winid, "winblend", floatWinBlend);

  // ターミナルの背景色を引き継ぐための設定
  await adapter.setWindowOption(
    denops,
    winid,
    "winhighlight",
    "Normal:Normal,NormalFloat:Normal,FloatBorder:Normal",
  );

  await denops.cmd("set nonumber");
}
async function sendPromptFromFloatingWindow(
  denops: Denops,
  prompt: string,
): Promise<void> {
  const claudeBuf = await getClaudeBuffer(denops);
  if (claudeBuf === undefined) {
    return;
  }

  await claude().sendPrompt(denops, claudeBuf.jobId, prompt);
}
/**
 * スプリットウィンドウからプロンプトを送信する非同期関数
 *
 * この関数は以下の操作を行います：
 * 1. ターミナルバッファを識別
 * 2. 現在のバッファを閉じる
 * 3. ターミナルウィンドウに移動
 * 4. カーソルを最後に移動
 * 5. レジスタ 'q' の内容を貼り付け
 * 6. Enter キーを送信
 * 7. 元のウィンドウに戻る
 *
 * @param {Denops} denops - Denopsインスタンス
 * @param {string} prompt - 送信するプロンプト
 */
async function sendPromptFromSplitWindow(
  denops: Denops,
  prompt: string,
): Promise<void> {
  const claudeBuf = await getClaudeBuffer(denops);
  if (claudeBuf === undefined) {
    return;
  }

  // 現在のバッファがClaude Codeのターミナルバッファかどうかを確認
  const currentBufnr = await fn.bufnr(denops, "%");
  const isCurrentBufferClaudeTerminal = currentBufnr === claudeBuf.bufnr;

  if (!isCurrentBufferClaudeTerminal) {
    // 現在のバッファがClaude Codeのターミナルバッファでない場合のみ移動
    if ((await v.g.get(denops, "claude_buffer_open_type")) !== "floating") {
      await denops.cmd(`${claudeBuf.winnr}wincmd w`);
    } else {
      const totalWindows = ensure<number>(
        await denops.call("winnr", "$"),
        is.Number,
      );

      for (let winnr = 1; winnr <= totalWindows; winnr++) {
        const bufnr = await denops.call("winbufnr", winnr);

        const buftype = await denops.call("getbufvar", bufnr, "&buftype");

        if (buftype === "terminal") {
          await denops.cmd(`${winnr}wincmd w`);
          break;
        }
      }
    }
  }
  
  // プロンプトを送信
  await claude().sendPrompt(denops, claudeBuf.jobId, prompt);
  
  // Claude Codeの応答を少し待つ
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 最下段に移動してから上方向に「> 」を検索
  await denops.cmd("normal! G");
  
  // 上方向に「> 」を検索し、その後に移動
  try {
    await denops.cmd("normal! ?> ");
    await denops.cmd("normal! $");
  } catch {
    // 「> 」が見つからない場合は行末に移動
    await denops.cmd("normal! $");
  }
  
  // ターミナルモードに入る
  await denops.cmd("startinsert");
}

type ClaudeBuffer = {
  jobId: number;
  winnr: number | undefined;
  bufnr: number;
};

/**
 * Gets the buffer number of the first buffer that matches the condition of checkIfClaudeBuffer.
 * If no matching buffer is found, the function returns undefined.
 *
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<ClaudeBuffer | undefined>} The buffer information or undefined.
 */
export async function getClaudeBuffer(
  denops: Denops,
): Promise<ClaudeBuffer | undefined> {
  // Get all open buffer numbers
  const buf_count = ensure(await fn.bufnr(denops, "$"), is.Number);

  for (let i = 1; i <= buf_count; i++) {
    const bufnr = ensure(await fn.bufnr(denops, i), is.Number);
    if (bufnr === -1 || !(await fn.bufloaded(denops, bufnr))) {
      continue;
    }

    if (await claude().checkIfClaudeBuffer(denops, bufnr)) {
      const adapter = await AdapterFactory.getAdapter(denops);
      const jobId = await adapter.getTerminalJobId(denops, bufnr);

      // testMode時はjobを走らせていないのでその場合は0でも許容
      // プロセスが動いていない場合(session復元時など)はバッファを削除
      if (!claude().isTestMode() && jobId === 0) {
        await denops.cmd(`bd! ${bufnr}`);
        continue;
      }

      if (await checkBufferOpen(denops, bufnr)) {
        const winnr = ensure(
          await fn.bufwinnr(denops, bufnr),
          is.Number,
        );
        return { jobId, winnr, bufnr };
      }
      return { jobId, winnr: undefined, bufnr };
    }
  }

  return undefined;
}
/**
 * 指定されたバッファ番号が現在のウィンドウで開かれているかを確認します。
 *
 * @param {Denops} denops - Denopsインスタンス
 * @param {number} bufnrToCheck - 確認したいバッファ番号
 * @returns {Promise<boolean>} バッファが開かれている場合はtrue、そうでない場合はfalse
 */
async function checkBufferOpen(
  denops: Denops,
  bufnrToCheck: number,
): Promise<boolean> {
  const win_count = ensure(await fn.winnr(denops, "$"), is.Number);
  for (let i = 1; i <= win_count; i++) {
    const bufnr = ensure(await fn.winbufnr(denops, i), is.Number);
    if (bufnr === bufnrToCheck) {
      return true;
    }
  }
  return false;
}

/**
 * Gitリポジトリのルートディレクトリを取得します。
 *
 * @param {Denops} denops - Denopsインスタンス
 * @returns {Promise<string>} Gitリポジトリのルートディレクトリのパス
 */
async function getGitRoot(denops: Denops): Promise<string> {
  const gitRoot = ensure(
    await denops.call("system", "git rev-parse --show-toplevel"),
    is.String,
  ).trim();
  return gitRoot;
}

/**
 * フルパスをGitリポジトリのルートからの相対パスに変換します。
 *
 * @param {Denops} denops - Denopsインスタンス
 * @param {string} fullPath - 変換するフルパス
 * @returns {Promise<string>} Gitリポジトリのルートからの相対パス
 */
async function convertToGitRelativePath(
  denops: Denops,
  fullPath: string,
): Promise<string> {
  const gitRoot = await getGitRoot(denops);
  return fullPath.replace(gitRoot, "").slice(1);
}

/**
 * Retrieves the paths of files under Git management in the currently open buffer.
 *
 * @param {Denops} denops - Denops instance
 * @returns {Promise<undefined | string>} A space-separated string of relative paths of files under Git management, or undefined
 */
export async function getFileBuffers(
  denops: Denops,
): Promise<undefined | string> {
  const buf_count = ensure(await fn.bufnr(denops, "$"), is.Number);

  const gitFiles = ensure(
    await denops.call("system", "git ls-files"),
    is.String,
  ).split("\n");

  const buffers = [];
  for (let i = 1; i <= buf_count; i++) {
    const bufnr = ensure(await fn.bufnr(denops, i), is.Number);

    if (!(await claude().checkIfClaudeBuffer(denops, bufnr))) {
      const bufferName = ensure(
        await fn.bufname(denops, bufnr),
        is.String,
      );
      const fullPath = ensure(
        await fn.fnamemodify(denops, bufferName, ":p"),
        is.String,
      );
      const gitRelativePath = await convertToGitRelativePath(
        denops,
        fullPath,
      );

      if (gitFiles.includes(gitRelativePath)) {
        buffers.push(gitRelativePath);
      }
    }
  }

  return buffers.join(" ") ?? undefined;
}

/**
 * Saves the selected text to a temporary file and returns the file path.
 *
 * @param {Denops} denops - Denops instance
 * @param {string} start - The starting line of the selection range
 * @param {string} end - The ending line of the selection range
 * @returns {Promise<string>} The path to the temporary file
 */
export async function getPartialContextFilePath(
  denops: Denops,
  start: string,
  end: string,
): Promise<string> {
  const context = ensure(
    await denops.call("getline", start, end),
    is.ArrayOf(is.String),
  );
  const filePath = ensure(await getCurrentFilePath(denops), is.String);

  const annotation = ensure([`// Path: ${filePath}`], is.ArrayOf(is.String));

  annotation.push(
    `// Filetype: ${
      ensure(
        await fn.getbufvar(denops, "%", "&filetype"),
        is.String,
      )
    }`,
  );

  annotation.push(`// Line: ${start}-${end}`);

  context.unshift(...annotation);

  const tempFile = ensure(await denops.call("tempname"), is.String);
  await Deno.writeTextFile(tempFile, context.join("\n"));

  // set filetype
  const fileType = ensure(
    await fn.getbufvar(denops, "%", "&filetype"),
    is.String,
  );
  await denops.cmd(`setlocal filetype=${fileType}`);

  return tempFile;
}
