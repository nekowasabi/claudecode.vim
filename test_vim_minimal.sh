#!/bin/bash
# claudecode.vim Vim動作確認スクリプト

echo "=== claudecode.vim Vim Compatibility Test ==="
echo ""

# Vimのバージョン確認
echo "Checking Vim version..."
vim --version | head -n1

# ターミナルサポート確認
echo ""
echo "Checking terminal support..."
vim --version | grep -E '\+terminal|\-terminal'

# ポップアップウィンドウサポート確認
echo ""
echo "Checking popup window support..."
vim --version | grep -E '\+popupwin|\-popupwin'

echo ""
echo "Starting Vim with test configuration..."
echo "Press Enter to continue..."
read

# テスト用vimrcでVimを起動
vim -u test_vimrc