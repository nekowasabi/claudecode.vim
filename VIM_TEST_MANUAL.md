# Vim互換性テスト手順書

このドキュメントでは、VimとNeovimの両方でClaudeコマンドが正しくウィンドウを分割するかを確認する手順を説明します。

## 前提条件

- Vim 8.1以上（ターミナルサポート付き）
- Neovim 
- denops.vimがインストール済み
- Denoがインストール済み
- Claude Code CLIがインストール済み

## テスト手順

### 1. Vimでのテスト

```bash
# Vimを起動
vim

# プラグインが読み込まれていることを確認
:echo exists(':ClaudeRun')
# 2が表示されればOK

# 分割モードに設定
:let g:claude_buffer_open_type = 'split'

# 現在のウィンドウ数を確認
:echo winnr('$')
# 通常は1が表示される

# ClaudeRunを実行
:ClaudeRun

# ウィンドウ数を再確認
:echo winnr('$')
# 2が表示されれば成功（ウィンドウが分割された）

# ターミナルバッファが作成されたか確認
:ls
# term://... claude というバッファが表示されるはず

# 垂直分割も確認
:ClaudeExit
:let g:claude_buffer_open_type = 'vsplit'
:ClaudeRun
# 垂直に分割されることを確認
```

### 2. Neovimでのテスト

```bash
# Neovimを起動
nvim

# 同様のテストを実行
:let g:claude_buffer_open_type = 'split'
:echo winnr('$')
:ClaudeRun
:echo winnr('$')
# Neovimでも2が表示されれば成功

# フローティングウィンドウのテスト（Neovimのみ）
:ClaudeExit
:let g:claude_buffer_open_type = 'floating'
:ClaudeRun
# フローティングウィンドウが表示されることを確認
```

### 3. 自動検証スクリプトの使用

denopsプラグインとして検証スクリプトを作成しました：

```vim
" Vimで実行
:VerifySplit

" 出力例：
" === Window Split Verification ===
" Editor: Vim
" Windows before ClaudeRun: 1
" Windows after ClaudeRun: 2
" ✓ SUCCESS: Window was split
```

## トラブルシューティング

### ウィンドウが分割されない場合

1. **denopsが正しく動作しているか確認**
   ```vim
   :echo denops#server#status()
   " "running"が表示されるはず
   ```

2. **エラーメッセージを確認**
   ```vim
   :messages
   ```

3. **Claudeコマンドが存在するか確認**
   ```vim
   :!which claude
   ```

### Vimでフローティングウィンドウが使えない場合

Vim 8.2以降でポップアップウィンドウがサポートされていますが、
フローティングモードで問題がある場合は分割モードを使用してください：

```vim
:let g:claude_buffer_open_type = 'split'
```

## 期待される動作

- **Vim/Neovim共通**：
  - `split`モードで水平分割
  - `vsplit`モードで垂直分割
  - ターミナルバッファでClaude Codeが起動

- **Neovim特有**：
  - `floating`モードでフローティングウィンドウ表示

- **Vim特有**：
  - `floating`モードはポップアップウィンドウまたは分割にフォールバック

## 結論

このテストにより、VimとNeovimの両方で：
1. ClaudeRunコマンドが正しく動作する
2. ウィンドウが適切に分割される
3. Claude Codeのターミナルバッファが作成される

ことが確認できれば、Vim互換性の実装は成功です。