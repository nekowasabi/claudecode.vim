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
call denops#plugin#register('claudecode', s:denops_path)