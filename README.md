# claudecode.vim

A minimal Neovim helper plugin for the Claude Code AI coding assistant.

## Overview

claudecode.vim integrates Claude Code CLI with Vim/Neovim through denops, providing seamless AI-assisted coding capabilities directly within your editor.

## Features

- **Claude Code Integration**: Execute Claude Code commands directly from Vim/Neovim
- **File Context Management**: Add current file or multiple files to Claude Code context
- **Visual Selection Support**: Send selected text as prompts to Claude Code
- **Floating Window Interface**: Customizable floating windows for interactive operations
- **Cross-Platform Support**: Works on all platforms supported by denops and Claude Code

## Prerequisites

- [denops.vim](https://github.com/vim-denops/denops.vim) - Required for plugin functionality
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) - Must be installed and accessible in PATH
- Deno runtime - Required by denops

## Installation

### Using lazy.nvim

```lua
{
  "nekowasabi/claudecode.vim",
  dependencies = { "vim-denops/denops.vim" },
  config = function()
    -- Optional: Set Claude Code command (defaults to "claude")
    vim.g.claude_command = "claude"
    
    -- Optional: Set buffer opening behavior (defaults to "floating")
    -- Options: "floating", "split", "vsplit"
    vim.g.claude_buffer_open_type = "floating"
    
    -- Optional: Floating window settings
    vim.g.claude_floatwin_height = 20
    vim.g.claude_floatwin_width = 100
  end,
}
```

### Using vim-plug

```vim
Plug 'vim-denops/denops.vim'
Plug 'nekowasabi/claudecode.vim'
```

## Configuration

### Global Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `g:claude_command` | String | `"claude"` | Claude Code CLI command |
| `g:claude_buffer_open_type` | String | `"floating"` | Buffer opening method (`floating`, `split`, `vsplit`) |
| `g:claude_floatwin_height` | Number | `20` | Floating window height |
| `g:claude_floatwin_width` | Number | `100` | Floating window width |
| `g:claude_floatwin_style` | String | `"minimal"` | Floating window style |
| `g:claude_floatwin_border` | String/Array | `"rounded"` | Floating window border |
| `g:claude_floatwin_blend` | Number | `0` | Floating window transparency |

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `:ClaudeRun` | Start Claude Code interactive session |
| `:ClaudeContinue` | Continue the most recent Claude Code conversation |
| `:ClaudeReview` | Request code review from Claude Code |
| `:ClaudeHide` | Hide Claude Code buffer |
| `:ClaudeExit` | Exit Claude Code session |

### File Management

| Command | Description |
|---------|-------------|
| `:ClaudeAddCurrentFile` | Add current file to Claude Code context |
| `:ClaudeAddFile {path}` | Add specified file to Claude Code context |
| `:ClaudeAddBuffers` | Add all git-tracked open buffers to context |

### Prompt Commands

| Command | Description |
|---------|-------------|
| `:ClaudeSendPromptByCommandline {prompt}` | Send prompt via command line |
| `:ClaudeVisualTextWithPrompt` | Send selected text with interactive prompt |
| `:ClaudeSendPromptByBuffer` | Send buffer content as prompt |

### Silent Commands (Background Operations)

| Command | Description |
|---------|-------------|
| `:ClaudeSilentRun` | Start Claude Code without switching focus |
| `:ClaudeSilentAddCurrentFile` | Add current file silently |
| `:ClaudeSilentSendPromptByCommandline {prompt}` | Send prompt silently |

## Usage Examples

### Basic Workflow

```vim
" Start Claude Code
:ClaudeRun

" Add current file to context
:ClaudeAddCurrentFile

" Send a prompt
:ClaudeSendPromptByCommandline "Please explain this function"

" Request code review
:ClaudeReview

" Continue previous conversation
:ClaudeContinue
```

### Visual Selection

1. Select text in visual mode
2. Run `:ClaudeVisualTextWithPrompt`
3. Enter your prompt in the floating window
4. Claude Code will process the selected text with your prompt

### Keyboard Mappings (Optional)

```vim
" Example key mappings
nnoremap <leader>cr :ClaudeRun<CR>
nnoremap <leader>ca :ClaudeAddCurrentFile<CR>
nnoremap <leader>cc :ClaudeContinue<CR>
nnoremap <leader>cv :ClaudeReview<CR>
vnoremap <leader>cp :ClaudeVisualTextWithPrompt<CR>
```

## How It Works

1. **Claude Code Integration**: The plugin spawns Claude Code CLI processes in terminal buffers
2. **Context Management**: Files are added to Claude Code's context using appropriate CLI commands
3. **Prompt Handling**: User prompts are sent to Claude Code via terminal input
4. **Response Display**: Claude Code responses appear in the terminal buffer within Vim/Neovim

## Differences from aider.vim

This plugin is based on [aider.vim](https://github.com/nekowasabi/aider.vim) but adapted for Claude Code:

### Removed Features
- Voice input support (Whisper integration)
- Web content addition
- Aider-specific commands and modes
- .aiderignore file management

### Added Features
- Claude Code `/review` command support
- Conversation continuation with `-c` flag
- Updated command structure for Claude Code CLI

### Command Mapping

| aider.vim | claudecode.vim | Claude Code Equivalent |
|-----------|----------------|----------------------|
| `:AiderRun` | `:ClaudeRun` | `claude` |
| `:AiderAddCurrentFile` | `:ClaudeAddCurrentFile` | Add file to context |
| - | `:ClaudeReview` | `/review` |
| - | `:ClaudeContinue` | `claude -c` |

## Troubleshooting

### Claude Code Not Found
```
Error: claude command not found
```
- Ensure Claude Code CLI is installed and in your PATH
- Set `g:claude_command` to the full path if needed

### Denops Issues
```
Error: denops is not available
```
- Install denops.vim plugin
- Ensure Deno runtime is installed

### Buffer Issues
If Claude Code buffer doesn't appear:
- Check `g:claude_buffer_open_type` setting
- Try different buffer opening modes (`floating`, `split`, `vsplit`)

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## License

This project is licensed under the same terms as the original aider.vim.

## Acknowledgments

- Based on [aider.vim](https://github.com/nekowasabi/aider.vim) by nekowasabi
- Powered by [denops.vim](https://github.com/vim-denops/denops.vim)
- Integrates with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) by Anthropic
