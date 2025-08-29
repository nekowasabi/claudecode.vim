#!/bin/bash
# 非tmux環境での後方互換性テストスクリプト

set -e

echo "=== Claude Code Non-tmux Compatibility Test ==="
echo ""

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# tmux環境でないことを確認
if [ -n "$TMUX" ]; then
    echo -e "${YELLOW}Warning: Currently in tmux environment${NC}"
    echo "For accurate testing, please run this script outside of tmux"
    echo ""
fi

# Neovimが利用可能かチェック
if command -v nvim &> /dev/null; then
    EDITOR="nvim"
    EDITOR_NAME="Neovim"
else
    EDITOR="vim"
    EDITOR_NAME="Vim"
fi

echo "Testing with: $EDITOR_NAME"
echo ""

# テスト用の一時ファイル作成
TEMP_VIM_SCRIPT=$(mktemp /tmp/claude_test.XXXXXX.vim)
TEMP_OUTPUT=$(mktemp /tmp/claude_output.XXXXXX.txt)

# Vimスクリプトを作成
cat > "$TEMP_VIM_SCRIPT" << 'EOF'
" Claude Code非tmux環境テストスクリプト
set nocompatible
let g:test_results = []

" claudecode.vimが読み込まれているか確認
function! TestPluginLoaded()
    if exists('g:loaded_claudecode')
        call add(g:test_results, "PASS: Plugin loaded")
    else
        call add(g:test_results, "FAIL: Plugin not loaded")
    endif
endfunction

" コマンドの存在確認
function! TestCommandsExist()
    let commands = ['ClaudeRun', 'ClaudeSendPrompt', 'ClaudeExit', 'ClaudeHide']
    for cmd in commands
        if exists(':' . cmd)
            call add(g:test_results, "PASS: Command exists - " . cmd)
        else
            call add(g:test_results, "FAIL: Command missing - " . cmd)
        endif
    endfor
endfunction

" terminal機能の確認
function! TestTerminalSupport()
    if has('terminal')
        call add(g:test_results, "PASS: Terminal support available")
    else
        call add(g:test_results, "FAIL: No terminal support")
    endif
endfunction

" フローティングウィンドウ/ポップアップのサポート確認
function! TestWindowSupport()
    if has('nvim')
        if exists('*nvim_open_win')
            call add(g:test_results, "PASS: Floating window support (Neovim)")
        else
            call add(g:test_results, "FAIL: No floating window support")
        endif
    else
        if exists('*popup_create')
            call add(g:test_results, "PASS: Popup window support (Vim)")
        else
            call add(g:test_results, "FAIL: No popup window support")
        endif
    endif
endfunction

" デフォルト設定の確認
function! TestDefaultSettings()
    " g:claude_buffer_open_typeのデフォルト値確認
    if !exists('g:claude_buffer_open_type')
        let g:claude_buffer_open_type = 'floating'
    endif
    
    if g:claude_buffer_open_type == 'floating'
        call add(g:test_results, "PASS: Default open type is 'floating' (non-tmux)")
    else
        call add(g:test_results, "INFO: Open type is '" . g:claude_buffer_open_type . "'")
    endif
    
    " g:claude_commandのデフォルト値確認
    if !exists('g:claude_command')
        let g:claude_command = 'claude'
    endif
    call add(g:test_results, "INFO: Claude command is '" . g:claude_command . "'")
endfunction

" テスト実行
call TestPluginLoaded()
call TestCommandsExist()
call TestTerminalSupport()
call TestWindowSupport()
call TestDefaultSettings()

" 結果を出力
for result in g:test_results
    echo result
endfor

" ファイルに結果を保存
call writefile(g:test_results, $TEMP_OUTPUT)

" 終了
qa!
EOF

# Vimでテストスクリプトを実行
echo "Running compatibility tests..."
"$EDITOR" -u NONE -S "$TEMP_VIM_SCRIPT" -c "let \$TEMP_OUTPUT='$TEMP_OUTPUT'" 2>/dev/null || true

# 結果を表示
echo ""
echo "Test Results:"
echo "-------------"

if [ -f "$TEMP_OUTPUT" ]; then
    while IFS= read -r line; do
        if [[ $line == PASS:* ]]; then
            echo -e "${GREEN}✓ ${line}${NC}"
        elif [[ $line == FAIL:* ]]; then
            echo -e "${RED}✗ ${line}${NC}"
        elif [[ $line == INFO:* ]]; then
            echo -e "${YELLOW}ℹ ${line}${NC}"
        else
            echo "$line"
        fi
    done < "$TEMP_OUTPUT"
else
    echo -e "${RED}Error: Could not read test results${NC}"
fi

# クリーンアップ
rm -f "$TEMP_VIM_SCRIPT" "$TEMP_OUTPUT"

echo ""
echo "=============================="
echo -e "${YELLOW}Manual Testing Required:${NC}"
echo "=============================="
echo ""
echo "Please manually test the following in $EDITOR_NAME (outside tmux):"
echo ""
echo "1. Open $EDITOR_NAME"
echo "2. Run :ClaudeRun"
echo "   - Should open terminal buffer with Claude Code"
echo "   - Should use floating window (Neovim) or split (Vim)"
echo ""
echo "3. Run :ClaudeSendPrompt 'test message'"
echo "   - Should send prompt to terminal buffer"
echo ""
echo "4. Run :ClaudeHide"
echo "   - Should hide the Claude buffer"
echo ""
echo "5. Run :ClaudeRun again"
echo "   - Should restore the hidden buffer"
echo ""
echo "6. Run :ClaudeExit"
echo "   - Should close the terminal and buffer"
echo ""
echo -e "${GREEN}If all manual tests pass, non-tmux compatibility is confirmed!${NC}"