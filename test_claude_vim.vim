" claudecode.vim 動作確認用テストファイル
" このファイルをVimで開いて、Claudeコマンドをテストできます

" サンプル関数
function! HelloWorld()
  echo "Hello, World!"
  return "This is a test function"
endfunction

" フィボナッチ数列
function! Fibonacci(n)
  if a:n <= 1
    return a:n
  else
    return Fibonacci(a:n - 1) + Fibonacci(a:n - 2)
  endif
endfunction

" TODO: この関数にエラーハンドリングを追加
function! DivideNumbers(a, b)
  return a:a / a:b
endfunction

" テスト用のクラス風の実装
let s:Calculator = {}

function! s:Calculator.new()
  let instance = copy(self)
  let instance.result = 0
  return instance
endfunction

function! s:Calculator.add(n)
  let self.result += a:n
  return self
endfunction

function! s:Calculator.multiply(n)
  let self.result *= a:n
  return self
endfunction

function! s:Calculator.getResult()
  return self.result
endfunction

" 使用例:
" :ClaudeRun
" :ClaudeAddCurrentFile
" :ClaudeSendPromptByCommandline "Please review this code and suggest improvements"
" :ClaudeReview

" ビジュアル選択してテスト:
" 1. この関数を選択
" 2. :ClaudeVisualTextWithPrompt
" 3. プロンプト入力: "この関数の目的を説明してください"