import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as buffer from "./bufferOperation.ts";
import type { BufferLayout } from "./bufferOperation.ts";
import { getCurrentFilePath } from "./utils.ts";

/**
 * The main function that sets up the Claude Code plugin functionality.
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<void>}
 */
export async function main(denops: Denops): Promise<void> {
  /**
   * コマンドの引数の数を定義
   * "0"は引数なし、"1"は1つの引数、"*"は複数の引数を意味します。
   */
  type ArgCount = "0" | "1" | "*";

  /**
   * ArgCountに基づいて異なる型の関数を定義
   * "0"の場合は引数なしの関数、"1"の場合は1つの引数を取る関数、
   * "*"の場合は2つの引数を取る関数を意味します。
   */
  type ImplType<T extends ArgCount> = T extends "0" ? () => Promise<void>
    : T extends "1" ? (arg: string) => Promise<void>
    : (arg: string, arg2: string) => Promise<void>; // MEMO: ArgCountは*だが現状2つのみ対応している

  /**
   * コマンドのオプションを定義
   * patternは引数のパターンを指定し、completeは補完の種類を指定し、
   * rangeは範囲指定が可能かどうかを示します。
   *
   * @property {string} [pattern] - 引数のパターンを指定します。
   * @property {("file" | "shellcmd")} [complete] - 補完の種類を指定します。ファイル補完またはシェルコマンド補完が可能です。
   * @property {boolean} [range] - 範囲指定が可能かどうかを示します。
   */
  type Opts<T extends ArgCount> = {
    pattern?: T extends "0" ? undefined
      : T extends "1" ? "[<f-args>]"
      : "[<line1>, <line2>]";
    complete?: T extends "1" ? "file" | "shellcmd" : undefined;
    range?: T extends "*" ? boolean : undefined;
  };

  /**
   * Commandは、メソッド名とその実装を含むコマンドオブジェクトを定義します。
   * @property {string} methodName - Denopsディスパッチャーで使用されるメソッド名
   * @property {ImplType<ArgCount>} impl - コマンドの実装関数
   */
  type Command = {
    methodName: string;
    impl: ImplType<ArgCount>;
  };

  /**
   * Denopsディスパッチャー用のコマンドと`command!`宣言を生成します。
   *
   * @param {string} dispatcherMethod - ディスパッチャーで使用されるメソッド名。Vim側に見えるコマンド名は Claude + DispatcherMethod のようになります。
   * @param {ImplType} impl - コマンドの実装関数。
   * @param {Opts} opts - オプション。フィールドはargCountによって変わるので型を参照。
   * @returns {Promise<Command>} - メソッド名、`command!`宣言、実装を含むコマンドオブジェクト。
   */
  async function command<argCount extends ArgCount>(
    dispatcherMethod: string,
    argCount: argCount,
    impl: ImplType<argCount>,
    opts: Opts<argCount> = {} as Opts<argCount>,
  ): Promise<Command> {
    const rangePart = opts.range ? "-range" : "";

    const commandName = `Claude${dispatcherMethod.charAt(0).toUpperCase()}${
      dispatcherMethod.slice(1)
    }`;
    const completePart = opts.complete ? `-complete=${opts.complete}` : "";
    const patternPart = opts.pattern ?? "[]";

    await denops.cmd(
      `command! -nargs=${argCount} ${completePart} ${rangePart} ${commandName} call denops#notify("${denops.name}", "${dispatcherMethod}", ${patternPart})`,
    );
    return {
      methodName: dispatcherMethod,
      impl: impl,
    };
  }

  /**
   * 現在のファイルをClaude Codeに追加する関数
   * @param denops - Denopsインスタンス
   * @param openBufferType - バッファの開き方の設定
   * @param prefix - コマンドのプレフィックス
   * @param opts - オプション設定 (デフォルト: { openBuf: true })
   * @returns Promise<void>
   */
  async function addFileToClaude(
    denops: Denops,
    openBufferType: BufferLayout,
    prefix: string,
    opts = { openBuf: true },
  ): Promise<void> {
    const currentBufnr = await fn.bufnr(denops, "%");
    const claudeBuffer = await buffer.getClaudeBuffer(denops);

    if (!claudeBuffer) {
      await buffer.prepareClaudeBuffer(denops, openBufferType);
    }

    if (await buffer.checkIfTerminalBuffer(denops, currentBufnr)) {
      return;
    }

    const currentFile = await getCurrentFilePath(denops);
    const prompt = `${prefix} ${currentFile}`;
    await buffer.sendPrompt(denops, prompt, opts);
  }

  const commands: Command[] = [
    await command("sendPromptByBuffer", "0", async () => {
      await buffer.sendPromptByBuffer(
        denops,
        await buffer.getOpenBufferType(denops),
      );
    }),

    await command(
      "sendPromptByCommandline",
      "1",
      async (prompt: string) => {
        await buffer.sendPrompt(denops, prompt, { openBuf: true });
      },
      { pattern: "[<f-args>]" },
    ),

    await command(
      "silentSendPromptByCommandline",
      "1",
      async (prompt: string) => {
        await buffer.sendPrompt(denops, prompt, { openBuf: false });
        console.log(`Sent prompt: ${prompt}`);
      },
      { pattern: "[<f-args>]" },
    ),

    await command("run", "0", async () => {
      await buffer.openClaudeBuffer(
        denops,
        await buffer.getOpenBufferType(denops),
      );
    }),

    await command("silentRun", "0", () => buffer.silentRun(denops)),

    await command("hideVisualSelectFloatingWindow", "0", async () => {
      await buffer.hideVisualSelectFloatingWindow(denops);
    }),

    await command("hide", "0", async () => {
      await denops.cmd("fclose!");
      await denops.cmd("silent! e!");
    }),

    await command(
      "addFile",
      "1",
      async (path: string) => {
        const prompt = `/add ${path}`;

        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]", complete: "file" },
    ),

    await command("addBuffers", "0", async () => {
      const buffersPath = await buffer.getFileBuffers(denops);
      const prompt = buffersPath ? `/add ${buffersPath}` : `/add `;

      await buffer.sendPrompt(denops, prompt);
    }),

    await command("addCurrentFile", "0", async () => {
      await addFileToClaude(
        denops,
        await buffer.getOpenBufferType(denops),
        "/add",
      );
    }),

    await command("silentAddCurrentFile", "0", async () => {
      await addFileToClaude(
        denops,
        await buffer.getOpenBufferType(denops),
        "/add",
        { openBuf: false },
      );
      const currentFile = await getCurrentFilePath(denops);
      console.log(`Added ${currentFile} to Claude Code`);
    }),

    await command(
      "addFileReadOnly",
      "1",
      async (path: string) => {
        const prompt = `/read-only ${path}`;

        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]", complete: "file" },
    ),

    await command("addCurrentFileReadOnly", "0", async () => {
      await addFileToClaude(
        denops,
        await buffer.getOpenBufferType(denops),
        "/read-only",
      );
    }),

    await command("silentAddCurrentFileReadOnly", "0", async () => {
      await addFileToClaude(
        denops,
        await buffer.getOpenBufferType(denops),
        "/read-only",
        {
          openBuf: false,
        },
      );
      const currentFile = await getCurrentFilePath(denops);
      console.log(`Added ${currentFile} to Claude Code read-only`);
    }),

    await command("paste", "0", async () => {
      const prompt = "/paste";
      await buffer.sendPrompt(denops, prompt);
    }),

    await command(
      "ask",
      "1",
      async (question: string) => {
        const prompt = `/ask ${question}`;
        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]" },
    ),

    await command("exit", "0", async () => {
      const claudeBuffer = await buffer.getClaudeBuffer(denops);
      if (claudeBuffer) {
        buffer.exitClaudeBuffer(denops);
      }
    }),

    await command(
      "addPartialReadonlyContext",
      "*",
      async (start: string, end: string) => {
        const partialContextFile = await buffer
          .getPartialContextFilePath(
            denops,
            start,
            end,
          );
        const prompt = `/read-only ${partialContextFile}`;
        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<line1>, <line2>]", range: true },
    ),

    await command(
      "visualTextWithPrompt",
      "*",
      async (start: string, end: string) => {
        await buffer.openFloatingWindowWithSelectedCode(
          denops,
          start,
          end,
          await buffer.getOpenBufferType(denops),
        );
      },
      { pattern: "[<line1>, <line2>]", range: true },
    ),

    /**
     * コードレビューコマンドを実行する
     * @async
     * @function
     * @description
     * Claude Codeの/reviewコマンドを送信してコードレビューを開始
     */
    await command("review", "0", async () => {
      const prompt = "/review";
      await buffer.sendPrompt(denops, prompt);
    }),

    /**
     * 継続コマンドを実行する
     * @async
     * @function
     * @description
     * Claude Codeを-cフラグ付きで開始して継続処理を行う
     */
    await command("continue", "0", async () => {
      await buffer.openClaudeBuffer(
        denops,
        await buffer.getOpenBufferType(denops),
      );
      const prompt = "/continue";
      await buffer.sendPrompt(denops, prompt);
    }),
  ];

  denops.dispatcher = Object.fromEntries(
    commands.map((
      command,
    ) => [
      command.methodName,
      command.impl as (args: unknown) => Promise<void>,
    ]),
  );
}
