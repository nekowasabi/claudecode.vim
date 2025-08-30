# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code)
へのガイダンスを提供します。

## 開発コマンド

### テスト

```bash
deno test -A
```

### フォーマット

```bash
deno fmt
```

### リント

```bash
deno lint
```

## アーキテクチャ概要

これはClaude Code
CLIを統合するVim/Neovimプラグインで、denops.vim（DenoベースのVimプラグインフレームワーク）で構築されています。

### コアコンポーネント

1. **統合アーキテクチャ**: 環境に応じてClaude
   Codeの実行方法を切り替える統一されたシステム：
   - `backend/claudeBackend.ts`: 共通インターフェースとベースクラス定義
   - `backend/terminalBackend.ts`: Vimのターミナルバッファを使用する実装
   - `backend/tmuxBackend.ts`: tmuxペインを使用する実装（tmux環境用）
   - `backend/backendFactory.ts`: 環境を検出し適切なBackendを作成
   - `claudeSession.ts`: BackendFactoryと統合されたセッション管理

2. **コマンドインターフェースパターン**:
   `claudeCommand.ts`がインターフェースを定義し、本番用に`actualClaudeCommand.ts`、テスト用に`mockClaudeCommand.ts`を実装。`actualClaudeCommand.ts`はClaudeSessionを通じてBackendと連携します。

3. **バッファ管理**: `bufferOperation.ts`は3つの表示モードを処理します：
   - フローティングウィンドウ（デフォルト、Neovim専用）
   - 分割ウィンドウ（tmux環境では自動的にtmuxペイン分割）
   - 垂直分割ウィンドウ（tmux環境では自動的にtmuxペイン分割）

   ClaudeSessionとBackendシステムと連携して、環境に応じた適切な表示を行います。

4. **プラグインエントリーポイント**:
   `main.ts`はdenopsディスパッチャーパターンを通じてすべてのVimコマンドを登録します。コマンドは`:Claude{アクション}`のパターンに従い、引数指定（`"0"`、`"1"`、`"*"`）を持ちます。

5. **互換性レイヤー**:
   `compatibility/`ディレクトリ内のコードがVim/Neovim間の差異を吸収します：
   - `editorDetector.ts`: エディタタイプを検出
   - `editorAdapter.ts`: 共通インターフェースを定義
   - `neovimAdapter.ts`: Neovim固有の実装
   - `vimAdapter.ts`: Vim固有の実装（ポップアップウィンドウを使用）
   - `adapterFactory.ts`: 適切なアダプターを返すファクトリー

### 主要な実装詳細

- **Backend選択ロジック**:
  - tmux環境 + split/vsplitモード → TmuxBackend（tmuxペイン使用）
  - tmux環境 + floatingモード → TerminalBackend（Vimターミナルバッファ使用）
  - 非tmux環境 → TerminalBackend（すべてのモードでVimターミナルバッファ使用）
- **tmuxペイン管理**:
  - `split-window`: 新規ペイン作成
  - `break-pane -d`: ペインをデタッチ（hide機能）
  - `join-pane`: ペインを再アタッチ（show機能）
  - `kill-pane`: ペインを削除（exit機能）
- **ターミナル統合**: TerminalBackendではClaude
  Codeがターミナルバッファ（`term://`スキーム）で実行されます。プラグインはこれらのターミナルプロセスを管理し、`chansend()`経由でコマンドを送信します。
- **ファイルコンテキスト**: ファイルはターミナル経由でパスを送信することでClaude
  Codeのコンテキストに追加されます。`-r`フラグで読み取り専用モードがサポートされています。
- **ビジュアル選択**:
  選択されたテキストは`getline()`でキャプチャされ、適切な改行処理を行ってプロンプトとして送信されます。
- **セッション継続性**: `-c`フラグによりClaude
  Codeセッション間での会話の継続が可能です。

### テストアプローチ

テストはモックコマンド実装を使用して以下を検証します：

- コマンド登録と引数解析
- 異なる表示モードでのバッファ操作
- 様々なフラグの組み合わせでのファイル追加
- プロンプト送信メカニズム

統合テストはGitHub Actions経由で実際のVim/Neovim環境で実行されます。

### 重要なパターン

1. **非同期操作**:
   すべてのdenops操作は非同期です。バッファ操作には`await`を使用してください。
2. **型安全性**: unknownutilがVim-Denops通信のランタイム型を検証します。
3. **エラーハンドリング**:
   CLI操作をtry-catchでラップし、プロセス失敗を適切に処理してください。
4. **バッファライフサイクル**:
   操作前に常にClaudeバッファの存在を確認してください。終了時にターミナルプロセスをクリーンアップしてください。
5. **エディタ互換性**:
   Neovim固有のAPI（`nvim_*`関数、フローティングウィンドウなど）は互換性レイヤーを通じて使用してください。
6. **Backend抽象化**:
   環境固有のロジック（tmux判定など）はBackendクラス内に隔離し、上位レイヤーではClaudeSessionを通じて統一的にアクセスしてください。

### ディレクトリ構造

```
denops/claudecode/
├── backend/                  # Backend抽象化レイヤー（Phase 5）
│   ├── claudeBackend.ts      # インターフェースと基底クラス
│   ├── terminalBackend.ts    # Vimターミナルバッファ実装
│   ├── tmuxBackend.ts        # tmuxペイン実装
│   └── backendFactory.ts     # Backendファクトリー
├── compatibility/            # Vim/Neovim互換性レイヤー
│   ├── adapterFactory.ts
│   ├── editorAdapter.ts
│   ├── editorDetector.ts
│   ├── neovimAdapter.ts
│   └── vimAdapter.ts
├── actualClaudeCommand.ts    # 本番用コマンド実装
├── bufferOperation.ts        # バッファ操作
├── claudeCommand.ts          # コマンドインターフェース
├── claudeSession.ts          # セッション管理
├── editorDetector.ts         # エディタ検出
├── main.ts                   # プラグインエントリポイント
├── mockClaudeCommand.ts      # テスト用モック実装
└── utils.ts                  # ユーティリティ関数
```
