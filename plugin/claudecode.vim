if exists('g:loaded_claudecode')
  finish
endif
let g:loaded_claudecode = 1

" denops.vimがロードされているか確認
if !exists('g:loaded_denops')
  echomsg 'claudecode.vim requires denops.vim'
  finish
endif

let s:plugin_root = expand('<sfile>:p:h:h')
let s:denops_path = s:plugin_root . '/denops/claudecode/main.ts'

" denopsの準備が整うまで登録を遅延させる
augroup claudecode_plugin_internal
  autocmd!
  autocmd User DenopsReady call s:register_plugin()
augroup END

function! s:register_plugin() abort
  if !exists('*denops#plugin#load')
    echomsg 'denops#plugin#load function not found. Please ensure denops.vim is properly loaded.'
    return
  endif

  if !filereadable(s:denops_path)
    echomsg 'claudecode main.ts not found at: ' . s:denops_path
    return
  endif

  call denops#plugin#load('claudecode', s:denops_path)
endfunction
