#!/bin/bash
# tmux統合テストスクリプト

set -e

echo "=== Claude Code tmux Integration Test ==="
echo ""

# tmux環境チェック
if [ -z "$TMUX" ]; then
    echo "Error: This script must be run inside tmux"
    echo "Please run: tmux new-session -s claude-test"
    exit 1
fi

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# テスト結果
PASSED=0
FAILED=0

# テスト関数
run_test() {
    local test_name=$1
    local test_cmd=$2
    
    echo -n "Testing: $test_name ... "
    
    if eval "$test_cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC}"
        ((FAILED++))
    fi
}

echo "1. Basic tmux pane operations"
echo "------------------------------"

# テスト用の一時的なtmuxセッション作成
TEST_SESSION="claude-test-$$"
tmux new-session -d -s "$TEST_SESSION"

# テスト1: ペインの作成
run_test "Create new pane" \
    "tmux split-window -h -t $TEST_SESSION && tmux list-panes -t $TEST_SESSION | grep -q '2:'"

# テスト2: ペインIDの取得
PANE_ID=$(tmux list-panes -t "$TEST_SESSION" -F '#{pane_id}' | tail -1)
run_test "Get pane ID" \
    "[ -n '$PANE_ID' ]"

# テスト3: ペインへのコマンド送信
run_test "Send command to pane" \
    "tmux send-keys -t '$PANE_ID' 'echo test' C-m"

# テスト4: ペインのデタッチ
run_test "Detach pane" \
    "tmux break-pane -d -s '$PANE_ID'"

# テスト5: ペインの再アタッチ
run_test "Reattach pane" \
    "tmux join-pane -h -s '$PANE_ID' -t $TEST_SESSION"

# テスト6: ペインの削除
run_test "Kill pane" \
    "tmux kill-pane -t '$PANE_ID'"

# クリーンアップ
tmux kill-session -t "$TEST_SESSION" 2>/dev/null || true

echo ""
echo "2. Cross-session pane operations"
echo "---------------------------------"

# 複数セッションでのテスト
SESSION1="claude-test1-$$"
SESSION2="claude-test2-$$"

tmux new-session -d -s "$SESSION1"
tmux new-session -d -s "$SESSION2"

# セッション1でペイン作成
tmux split-window -h -t "$SESSION1"
PANE_ID=$(tmux list-panes -t "$SESSION1" -F '#{pane_id}' | tail -1)

# セッション間でのペイン移動
run_test "Move pane between sessions" \
    "tmux join-pane -h -s '$PANE_ID' -t '$SESSION2'"

# 全セッションからペインを検索
run_test "Find pane across all sessions" \
    "tmux list-panes -a -F '#{pane_id}' | grep -q '$PANE_ID'"

# クリーンアップ
tmux kill-session -t "$SESSION1" 2>/dev/null || true
tmux kill-session -t "$SESSION2" 2>/dev/null || true

echo ""
echo "3. Error handling"
echo "-----------------"

# 存在しないペインIDのテスト
FAKE_PANE_ID="%99999"
run_test "Handle non-existent pane" \
    "! tmux send-keys -t '$FAKE_PANE_ID' 'test' 2>/dev/null"

# 無効なコマンドのテスト
run_test "Handle invalid command" \
    "! tmux invalid-command 2>/dev/null"

echo ""
echo "4. Performance tests"
echo "--------------------"

# パフォーマンステスト
START_TIME=$(date +%s%N)
tmux list-panes -a -F '#{pane_id}' > /dev/null
END_TIME=$(date +%s%N)
ELAPSED=$((($END_TIME - $START_TIME) / 1000000))

if [ $ELAPSED -lt 100 ]; then
    echo -e "List all panes performance: ${GREEN}${ELAPSED}ms${NC} (< 100ms) ✓"
    ((PASSED++))
else
    echo -e "List all panes performance: ${RED}${ELAPSED}ms${NC} (> 100ms) ✗"
    ((FAILED++))
fi

echo ""
echo "5. Claude Code specific tests"
echo "------------------------------"

# Vim/Neovimでのテスト（実際の環境で手動実行が必要）
echo -e "${YELLOW}Note: The following tests require manual execution in Vim/Neovim:${NC}"
echo "  1. Open Vim/Neovim in tmux"
echo "  2. Run :ClaudeRun (should create tmux pane)"
echo "  3. Run :ClaudeSendPrompt 'Hello' (should send to existing pane)"
echo "  4. Run :ClaudeHide (should detach pane)"
echo "  5. Run :ClaudeRun again (should reattach existing pane)"
echo "  6. Run :ClaudeExit (should kill pane)"

echo ""
echo "=============================="
echo "Test Summary:"
echo -e "  Passed: ${GREEN}$PASSED${NC}"
echo -e "  Failed: ${RED}$FAILED${NC}"
echo "=============================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All automated tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi