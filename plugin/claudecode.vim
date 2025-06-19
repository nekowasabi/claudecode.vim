if exists('g:loaded_claudecode')
  finish
endif
let g:loaded_claudecode = 1

" denops.vimがロードされているか確認
if !exists('g:loaded_denops')
  echomsg 'claudecode.vim requires denops.vim'
  finish
endif

" claudecodeプラグインを登録
let s:plugin_root = expand('<sfile>:p:h:h')
let s:denops_path = s:plugin_root . '/denops/claudecode/main.ts'

" denops関数が利用可能か確認
if !exists('*denops#plugin#register')
  echomsg 'denops#plugin#register function not found. Please ensure denops.vim is properly loaded.'
  finish
endif

" main.tsファイルが存在するか確認
if !filereadable(s:denops_path)
  echomsg 'claudecode main.ts not found at: ' . s:denops_path
  finish
endif

call denops#plugin#register('claudecode', s:denops_path)