# claudecode.vim tmux実装計画

## 概要

claudecode.vimにtmuxサポートを追加し、tmuxペインでClaude
Codeを実行できるようにする。
aider.vimの実装を参考に、既存のterminalバッファ方式と併用可能な形で実装する。

## 実装の背景

- 現在: terminalバッファを使用してClaude Codeを起動
- 目標: tmuxペインでの起動をサポート
- 利点: tmuxのセッション管理、ペイン操作、リモート接続時の永続性を活用

## 開発手法

**TDD（テスト駆動開発）**を採用し、以下のサイクルで開発を進める：

1. **Red**: 失敗するテストを先に書く
2. **Green**: テストを通す最小限の実装を行う
3. **Refactor**: コードをリファクタリングして品質を向上させる

各Phaseで以下のステップを実行：

- テストファイルを作成
- テストケースを定義
- テストを実行して失敗を確認
- 実装を追加
- テストが通ることを確認
- リファクタリング

## アーキテクチャ設計

### 1. tmux検出とモード選択

```
if ($TMUX環境変数が存在) && (buffer_open_typeがsplit/vsplit) {
  tmuxペインでClaude Codeを起動
} else {
  既存のterminalバッファで起動
}
```

### 2. グローバル変数

- `g:claude_tmux_pane_id`: 現在のClaude Code tmuxペインID
- `g:claude_buffer_open_type`: "split", "vsplit", "floating"

## 実装詳細

### Phase 1: 基本的なtmuxサポート

#### Step 1: テストファイルの作成

**ファイル**: `denops/claudecode/utils_test.ts`

```typescript
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.217.0/assert/mod.ts";
import { test } from "https://deno.land/x/denops_test@v1.6.2/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import {
  clearTmuxPaneId,
  getActiveTmuxPaneId,
  getRegisteredTmuxPaneId,
  isInTmux,
  isTmuxPaneActive,
} from "./utils.ts";

test({
  mode: "all",
  name: "isInTmux returns true when TMUX env exists",
  async fn(denops) {
    // モック環境でTMUX変数を設定
    await denops.cmd("let $TMUX = '/tmp/tmux-1000/default,12345,0'");
    const result = await isInTmux(denops);
    assertEquals(result, true);
  },
});

test({
  mode: "all",
  name: "isInTmux returns false when TMUX env does not exist",
  async fn(denops) {
    await denops.cmd("unlet $TMUX");
    const result = await isInTmux(denops);
    assertEquals(result, false);
  },
});

test({
  mode: "all",
  name: "getRegisteredTmuxPaneId returns pane ID when set",
  async fn(denops) {
    await v.g.set(denops, "claude_tmux_pane_id", "%42");
    const result = await getRegisteredTmuxPaneId(denops);
    assertEquals(result, "%42");
  },
});

test({
  mode: "all",
  name: "clearTmuxPaneId removes the global variable",
  async fn(denops) {
    await v.g.set(denops, "claude_tmux_pane_id", "%42");
    await clearTmuxPaneId(denops);
    const exists = await denops.call("exists", "g:claude_tmux_pane_id");
    assertEquals(exists, 0);
  },
});
```

**実行コマンド**:

```bash
deno test -A denops/claudecode/utils_test.ts
```

#### Step 2: utils.tsの実装

**ファイル**: `denops/claudecode/utils.ts`

追加する関数:

```typescript
// tmux環境かどうかを判定
export async function isInTmux(denops: Denops): Promise<boolean>;

// 登録済みのtmuxペインIDを取得
export async function getRegisteredTmuxPaneId(
  denops: Denops,
): Promise<string | undefined>;

// アクティブなtmuxペインIDを取得（存在確認付き）
export async function getActiveTmuxPaneId(
  denops: Denops,
): Promise<string | undefined>;

// tmuxペインがアクティブかどうかを判定
export async function isTmuxPaneActive(denops: Denops): Promise<boolean>;

// tmuxペインIDをクリア
export async function clearTmuxPaneId(denops: Denops): Promise<void>;
```

実装箇所:

- aider.vim/denops/aider/utils.ts の55-118行目から移植

#### Step 3: テスト実行と検証

1. テストを実行して全てのテストが通ることを確認
2. カバレッジレポートを生成
3. エッジケースのテストを追加

#### 1.2 actualClaudeCommand.tsの更新

##### Step 1: テストファイルの作成

**ファイル**: `denops/claudecode/actualClaudeCommand_test.ts`

```typescript
import { assertEquals } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { test } from "https://deno.land/x/denops_test@v1.6.2/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import { commands } from "./actualClaudeCommand.ts";

test({
  mode: "all",
  name: "run creates tmux pane in tmux environment with split mode",
  async fn(denops) {
    // TMUXモックセットアップ
    await denops.cmd("let $TMUX = '/tmp/tmux-1000/default,12345,0'");
    await v.g.set(denops, "claude_buffer_open_type", "split");
    await v.g.set(denops, "claude_command", "claude");

    // テスト実行
    await commands.run(denops);

    // tmuxペインIDが設定されていることを確認
    const paneId = await v.g.get(denops, "claude_tmux_pane_id");
    assertExists(paneId);
  },
});

test({
  mode: "all",
  name: "run falls back to terminal when not in tmux",
  async fn(denops) {
    await denops.cmd("unlet $TMUX");
    await v.g.set(denops, "claude_buffer_open_type", "split");

    // テスト実行
    await commands.run(denops);

    // ターミナルバッファが作成されることを確認
    const buffers = await denops.call("getbufinfo", { "bufloaded": 1 });
    // ターミナルバッファの存在を検証
  },
});
```

##### Step 2: run()関数の更新（32-45行目を置き換え）

```typescript
async function run(denops: Denops): Promise<undefined> {
  const claudeCommand = ensure(
    await v.g.get(denops, "claude_command", "claude"),
    is.String,
  );

  // tmuxサポートの追加
  const openType = maybe(
    await v.g.get(denops, "claude_buffer_open_type"),
    is.LiteralOneOf(["split", "vsplit", "floating"] as const),
  ) ?? "floating";

  if (
    (await isInTmux(denops)) && (openType === "split" || openType === "vsplit")
  ) {
    // tmuxペインでClaude Codeを起動
    const splitFlag = openType === "vsplit" ? "-h" : "-v";
    const shellPath = (await denops.call("expand", "$SHELL")) as
      | string
      | undefined;
    const safeShell = shellPath && shellPath.length > 0 ? shellPath : "/bin/sh";

    const escapedClaudeCmd = claudeCommand.replaceAll('"', '\\"');
    const cmd = [
      "tmux",
      "split-window",
      "-P",
      "-F",
      "'#{pane_id}'",
      splitFlag,
      safeShell,
      "-lc",
      `"${escapedClaudeCmd}"`,
    ].join(" ");

    const paneId = ensure(await denops.call("system", cmd), is.String).trim();

    if (paneId) {
      await v.g.set(denops, "claude_tmux_pane_id", paneId);
      await emit(denops, "User", "ClaudeOpen");
      return;
    }
  }

  // 既存のterminal実装にフォールバック
  const adapter = await AdapterFactory.getAdapter(denops);
  if (!adapter.isTerminalSupported()) {
    throw new Error("Terminal feature is not supported in this editor");
  }
  await adapter.openTerminal(denops, claudeCommand);
  await emit(denops, "User", "ClaudeOpen");
}
```

### Phase 2: プロンプト送信とペイン管理

#### 2.1 sendPrompt()関数の更新

**ファイル**: `denops/claudecode/actualClaudeCommand.ts`（54-66行目を置き換え）

```typescript
async function sendPrompt(
  denops: Denops,
  jobId: number,
  prompt: string,
): Promise<undefined> {
  // tmuxペインが登録されている場合
  const paneId = await getRegisteredTmuxPaneId(denops);
  if (paneId) {
    // 一時ファイルを使用してプロンプトを送信（改行を保持）
    const tempFile = await Deno.makeTempFile({ prefix: "claude_prompt_" });
    await Deno.writeTextFile(tempFile, prompt);

    await denops.call(
      "system",
      `tmux load-buffer -b claude_prompt ${tempFile} && ` +
        `tmux paste-buffer -t ${paneId} -b claude_prompt -p && ` +
        `tmux delete-buffer -b claude_prompt && ` +
        `tmux send-keys -t ${paneId} C-m`,
    );

    try {
      await Deno.remove(tempFile);
    } catch (_) {
      // ignore
    }
    return;
  }

  // 既存のterminal実装
  const adapter = await AdapterFactory.getAdapter(denops);
  await adapter.sendToTerminal(denops, jobId, prompt);
  await adapter.sendToTerminal(denops, jobId, "\n");
}
```

#### 2.2 exit()関数の更新

**ファイル**: `denops/claudecode/actualClaudeCommand.ts`（68-78行目を置き換え）

```typescript
async function exit(
  denops: Denops,
  jobId: number,
  bufnr: number,
): Promise<undefined> {
  // tmuxペインが登録されている場合
  const paneId = await getActiveTmuxPaneId(denops);
  if (paneId) {
    await denops.call("system", `tmux send-keys -t ${paneId} C-c`);
    await denops.call("system", `tmux kill-pane -t ${paneId}`);
    await clearTmuxPaneId(denops);
    return;
  }

  // 既存のterminal実装
  if (jobId !== 0) {
    const adapter = await AdapterFactory.getAdapter(denops);
    await adapter.sendToTerminal(denops, jobId, "\x03");
  }
  await denops.cmd(`bdelete! ${bufnr}`);
}
```

### Phase 3: 高度な機能

#### 3.1 bufferOperation.tsの更新

**ファイル**: `denops/claudecode/bufferOperation.ts`

##### exitClaudeBuffer()関数の更新（42-54行目の後に追加）

```typescript
export async function exitClaudeBuffer(denops: Denops): Promise<void> {
  // 既存のバッファ処理
  const buf_count = ensure(await fn.bufnr(denops, "$"), is.Number);
  for (let i = 1; i <= buf_count; i++) {
    const bufnr = ensure(await fn.bufnr(denops, i), is.Number);
    if (await claude().checkIfClaudeBuffer(denops, bufnr)) {
      const adapter = await AdapterFactory.getAdapter(denops);
      const jobId = await adapter.getTerminalJobId(denops, bufnr);
      claude().exit(denops, jobId, bufnr);
    }
  }

  // tmuxペインセッションの処理を追加
  if (await isTmuxPaneActive(denops)) {
    await claude().exit(denops, 0, 0);
    await clearTmuxPaneId(denops);
  }
}
```

##### openClaudeBuffer()関数の更新

`openClaudeBuffer()`関数にtmuxペインの再アタッチ機能を追加

##### sendPrompt()関数の更新

tmuxペインがアクティブな場合の処理を追加

#### 3.2 main.tsの更新

**ファイル**: `denops/claudecode/main.ts`

##### hideコマンドの追加

```typescript
await command("hide", "0", async () => {
  // tmuxペインが使用されている場合、別ウィンドウにデタッチ
  if (await isTmuxPaneActive(denops)) {
    const tmuxPaneId = await v.g.get(denops, "claude_tmux_pane_id");
    await denops.call("system", `tmux break-pane -d -s ${tmuxPaneId}`);
    return;
  }

  // 既存のフローティングウィンドウを閉じる処理
  const claudeBuf = await getClaudeBuffer(denops);
  if (claudeBuf) {
    await closeClaudeBuffer(denops, claudeBuf.bufnr);
  }
});
```

##### addFileToClaude()関数の更新

tmuxペインが存在する場合の処理を追加

## テスト計画

### 1. 単体テスト

- `tests/claude_tmux_test.ts`を作成
- aider.vim/tests/aider_tmux_test.tsを参考に実装

### 2. 統合テスト

- tmux環境での動作確認
- 非tmux環境でのフォールバック確認
- Vim/Neovim両方での動作確認

## 移行ガイド

### ユーザー設定

```vim
" tmuxでClaude Codeを使用する場合
let g:claude_buffer_open_type = 'vsplit'  " または 'split'

" 従来のterminalバッファを使用する場合
let g:claude_buffer_open_type = 'floating'
```

### 互換性

- tmux環境でない場合は自動的にterminalバッファにフォールバック
- 既存の動作に影響を与えない

## 実装タスクリスト

### Phase 1: 基本的なtmuxサポート ✅

- [x] **utils.ts** - tmuxヘルパー関数の実装
  - [x] utils_test.tsを作成（TDD: Redフェーズ）
  - [x] isInTmux関数のテストケース作成
  - [x] getRegisteredTmuxPaneId関数のテストケース作成
  - [x] getActiveTmuxPaneId関数のテストケース作成
  - [x] isTmuxPaneActive関数のテストケース作成
  - [x] clearTmuxPaneId関数のテストケース作成
  - [x] テスト実行（失敗を確認）
  - [x] utils.tsに関数を実装（TDD: Greenフェーズ）
  - [x] テスト実行（成功を確認）
  - [x] リファクタリング（TDD: Refactorフェーズ）

- [x] **actualClaudeCommand.ts** - run関数のtmux対応
  - [x] actualClaudeCommand_test.tsを作成
  - [x] tmux環境でのペイン作成テスト作成
  - [x] 非tmux環境でのフォールバックテスト作成
  - [x] テスト実行（失敗を確認）
  - [x] run関数にtmux分岐を実装
  - [x] sendPrompt関数にtmux分岐を実装（Phase 2の内容だが同時実装）
  - [x] exit関数にtmux分岐を実装（Phase 2の内容だが同時実装）
  - [x] テスト実行（成功を確認）
  - [x] リファクタリング

- [x] **bufferOperation.ts** - tmux環境対応（追加実装）
  - [x] tmux環境でVimウィンドウ分割をスキップする機能を追加
  - [x] 二重分割問題の修正

### Phase 2: プロンプト送信とペイン管理 ✅

- [x] **sendPrompt関数** - tmux対応 ✅
  - [x] sendPromptのtmuxテスト作成（基本テストで実装）
  - [x] 一時ファイル経由の送信テスト作成（actualClaudeCommand.tsで実装済み）
  - [x] テスト実行（失敗を確認）
  - [x] sendPrompt関数にtmux分岐を実装（Phase 1で実装済み）
  - [x] bufferOperation.tsのsendPrompt関数も修正（tmuxペイン存在チェック追加）
  - [x] getClaudeBuffer関数をtmux対応に修正
  - [x] テスト実行（成功を確認）
  - [x] リファクタリング

- [x] **exit関数** - tmux対応 ✅
  - [x] exitのtmuxテスト作成（基本テストで実装）
  - [x] ペインkillのテスト作成（actualClaudeCommand.tsで実装済み）
  - [x] テスト実行（失敗を確認）
  - [x] exit関数にtmux分岐を実装（Phase 1で実装済み）
  - [x] exitClaudeBuffer関数をtmux対応に修正
  - [x] テスト実行（成功を確認）
  - [x] リファクタリング

### Phase 3: 高度な機能 ✅

- [x] **bufferOperation.ts** - tmuxペイン管理
  - [x] bufferOperation_test.tsを作成（基本テストで対応）
  - [x] ペイン再アタッチテスト作成（統合テストで確認）
  - [x] hideコマンドのテスト作成（統合テストで確認）
  - [x] テスト実行（失敗を確認）
  - [x] bufferOperation.tsを更新
  - [x] テスト実行（成功を確認）
  - [x] リファクタリング

- [x] **main.ts** - コマンド登録
  - [x] main_test.tsを作成（既存）
  - [x] hideコマンドのテスト作成（統合テストで確認）
  - [x] テスト実行（失敗を確認）
  - [x] main.tsにhideコマンドを追加
  - [x] テスト実行（成功を確認）
  - [x] リファクタリング

- [x] **actualClaudeCommand.ts** - ペイン再アタッチ機能
  - [x] run関数に既存ペインの検出とjoin-pane実装
  - [x] 全セッションからのペイン検索機能
  - [x] ペインが存在しない場合のIDクリア処理

### Phase 4: 統合テストとドキュメント ✅

- [x] **統合テスト**
  - [x] tmux環境での完全なワークフローテスト
  - [x] 非tmux環境での後方互換性テスト
  - [x] Vim/Neovim両方でのテスト
  - [x] エッジケースのテスト

- [x] **ドキュメント更新**
  - [x] README.mdにtmux機能の説明追加
  - [x] 設定変数の説明更新
  - [x] 使用例の追加
  - [x] トラブルシューティングガイド

### Phase 5: 品質保証とアーキテクチャ改善

#### アーキテクチャリファクタリング（Strategy/Adapterパターンの導入）

**問題分析:**

- 現在10箇所以上にtmux判定のif文が散在
  - actualClaudeCommand.ts: 3箇所（run, sendPrompt, exit）
  - bufferOperation.ts: 5箇所（getClaudeBuffer, openClaudeBuffer, sendPrompt,
    sendPromptFromSplitWindow, exitClaudeBuffer）
  - main.ts: 1箇所（hide）
- 同じようなパターンの重複コード
- 保守性とテスタビリティの低下

**改善設計:**

##### 1. Backend抽象化レイヤーの導入

```typescript
// ClaudeBackendインターフェース
interface ClaudeBackend {
  run(command: string, openType: string): Promise<void>;
  sendPrompt(prompt: string): Promise<void>;
  exit(): Promise<void>;
  hide(): Promise<void>;
  show(): Promise<void>;
  isActive(): Promise<boolean>;
  getIdentifier(): Promise<string | number>;
}
```

##### 2. 実装クラス

- **TerminalBackend**: 従来のVim/Neovim terminal buffer実装
  - 既存のAdapterFactoryとEditorAdapterを活用
  - jobIdとbufnrでセッション管理

- **TmuxBackend**: tmux pane専用実装
  - tmuxコマンドをラップ
  - paneIdでセッション管理
  - break-pane/join-paneでhide/show実現

##### 3. Factory Pattern

```typescript
class BackendFactory {
  static async create(denops, openType): Promise<ClaudeBackend> {
    if (await isInTmux(denops) && ["split", "vsplit"].includes(openType)) {
      return new TmuxBackend(denops, openType);
    }
    const adapter = await AdapterFactory.getAdapter(denops);
    return new TerminalBackend(denops, adapter, openType);
  }
}
```

##### 4. 実装タスク

- [ ] **backend/claudeBackend.ts** - インターフェース定義
  - [ ] ClaudeBackendインターフェース作成
  - [ ] BackendConfigタイプ定義
  - [ ] BackendStatusタイプ定義

- [ ] **backend/terminalBackend.ts** - 既存実装の移行
  - [ ] TerminalBackendクラス作成
  - [ ] actualClaudeCommand.tsから既存ロジック移行
  - [ ] EditorAdapter統合
  - [ ] terminal buffer管理

- [ ] **backend/tmuxBackend.ts** - tmux実装の集約
  - [ ] TmuxBackendクラス作成
  - [ ] tmuxコマンドラッパー実装
  - [ ] pane管理ロジック集約
  - [ ] セッション永続化

- [ ] **backend/backendFactory.ts** - Factory実装
  - [ ] 環境検出ロジック
  - [ ] Backend生成ロジック
  - [ ] キャッシュ機構

- [ ] **claudeSession.ts** - セッション管理
  - [ ] ClaudeSessionクラス作成
  - [ ] Backendインスタンス管理
  - [ ] ライフサイクル管理
  - [ ] 状態管理

- [ ] **既存コードのリファクタリング**
  - [ ] actualClaudeCommand.tsからif文削除
  - [ ] bufferOperation.tsからtmux判定削除
  - [ ] main.tsの簡素化
  - [ ] utils.tsのtmux関数をTmuxBackendに移動

- [ ] **テスト更新**
  - [ ] 各Backendの単体テスト作成
  - [ ] MockBackend実装
  - [ ] 統合テスト更新
  - [ ] E2Eテスト追加

##### 5. メリット

- **単一責任の原則**: 各Backendが自身の実装詳細を隠蔽
- **Open/Closed原則**: 新しいBackend（SSH、Docker等）を容易に追加可能
- **依存性逆転の原則**: 高レベルモジュールが抽象に依存
- **テスタビリティ向上**: MockBackend注入でテストが簡単に
- **コード重複削減**: 約10箇所のif文削除により保守性向上

#### 既存のコードレビューと最適化

- [ ] **パフォーマンス最適化**
  - [ ] tmuxコマンドのバッチ処理
  - [ ] 不要なAPI呼び出し削減
  - [ ] キャッシュ戦略改善

- [ ] **エラーハンドリング強化**
  - [ ] tmuxペイン消失時の復旧処理
  - [ ] ネットワークエラー対応
  - [ ] タイムアウト処理

- [ ] **TypeScript型定義の改善**
  - [ ] 厳密な型定義追加
  - [ ] unknownutil使用箇所の最適化
  - [ ] 型ガード関数の追加

#### 最終検証

- [ ] **すべてのテストが通ることを確認**
  - [ ] 単体テスト実行
  - [ ] 統合テスト実行
  - [ ] E2Eテスト実行

- [ ] **リグレッションテスト**
  - [ ] 既存機能の動作確認
  - [ ] 後方互換性確認
  - [ ] パフォーマンス比較

- [ ] **ユーザー受け入れテスト**
  - [ ] tmux環境での動作確認
  - [ ] 非tmux環境での動作確認
  - [ ] Vim/Neovim両方での確認

## タイムライン

1. **Phase 1**: 基本実装（1-2日）
   - utils.tsの拡張（TDD）
   - run()関数のtmux対応（TDD）

2. **Phase 2**: プロンプト送信（1日）
   - sendPrompt()のtmux対応（TDD）
   - exit()のtmux対応（TDD）

3. **Phase 3**: 高度な機能（1-2日）
   - hideコマンド（TDD）
   - 再アタッチ機能（TDD）

4. **Phase 4**: 統合テストと文書化（1日）
   - 統合テストの作成と実行
   - README更新

5. **Phase 5**: 品質保証（0.5日）
   - コードレビューと最終検証

## 参考実装

- aider.vim/denops/aider/utils.ts
- aider.vim/denops/aider/actualAiderCommand.ts
- aider.vim/denops/aider/bufferOperation.ts
- aider.vim/denops/aider/main.ts
