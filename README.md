# claudecode.vim

A minimal Vim/Neovim helper plugin for the Claude Code AI coding assistant.

## Overview

claudecode.vim integrates Claude Code CLI with Vim/Neovim through denops,
providing seamless AI-assisted coding capabilities directly within your editor.

## Features

- **Claude Code Integration**: Execute Claude Code commands directly from
  Vim/Neovim
- **File Context Management**: Add current file or multiple files to Claude Code
  context
- **Visual Selection Support**: Send selected text as prompts to Claude Code
- **Floating Window Interface**: Customizable floating windows for interactive
  operations
- **Cross-Platform Support**: Works on all platforms supported by denops and
  Claude Code
- **Vim/Neovim Compatibility**: Supports both Vim 8.1+ and Neovim with automatic
  editor detection
- **Automatic Editor Detection**: Seamless compatibility layer adapts behavior
  for each editor

## Prerequisites

- [denops.vim](https://github.com/vim-denops/denops.vim) - Required for plugin
  functionality
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) - Must be
  installed and accessible in PATH
- Deno runtime - Required by denops
- Vim 8.1+ with terminal support OR Neovim (Vim 8.2+ recommended for full
  feature support)

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

| Variable                    | Type         | Default      | Description                                           |
| --------------------------- | ------------ | ------------ | ----------------------------------------------------- |
| `g:claude_command`          | String       | `"claude"`   | Claude Code CLI command                               |
| `g:claude_buffer_open_type` | String       | `"floating"` | Buffer opening method (`floating`, `split`, `vsplit`) |
| `g:claude_floatwin_height`  | Number       | `20`         | Floating window height                                |
| `g:claude_floatwin_width`   | Number       | `100`        | Floating window width                                 |
| `g:claude_floatwin_style`   | String       | `"minimal"`  | Floating window style (Neovim only)                   |
| `g:claude_floatwin_border`  | String/Array | `"rounded"`  | Floating window border                                |
| `g:claude_floatwin_blend`   | Number       | `0`          | Floating window transparency (Neovim only)            |

## Commands

### Core Commands

| Command              | Description                                       |
| -------------------- | ------------------------------------------------- |
| `:ClaudeRun`         | Start Claude Code interactive session             |
| `:ClaudeRunFloating` | Start Claude Code in floating window             |
| `:ClaudeRunSplit`    | Start Claude Code in horizontal split window     |
| `:ClaudeRunVsplit`   | Start Claude Code in vertical split window       |
| `:ClaudeRunToggle`   | Toggle between floating and split window modes   |
| `:ClaudeContinue`    | Continue the most recent Claude Code conversation |
| `:ClaudeReview`      | Request code review from Claude Code              |
| `:ClaudeHide`        | Hide Claude Code buffer (smart window handling)   |
| `:ClaudeExit`        | Exit Claude Code session                          |

### File Management

| Command                 | Description                                 |
| ----------------------- | ------------------------------------------- |
| `:ClaudeAddCurrentFile` | Add current file to Claude Code context     |
| `:ClaudeAddFile {path}` | Add specified file to Claude Code context   |
| `:ClaudeAddBuffers`     | Add all git-tracked open buffers to context |

### Prompt Commands

| Command                                   | Description                                |
| ----------------------------------------- | ------------------------------------------ |
| `:ClaudeSendPromptByCommandline {prompt}` | Send prompt via command line               |
| `:ClaudeVisualTextWithPrompt`             | Send selected text with interactive prompt |
| `:ClaudeSendPromptByBuffer`               | Send buffer content as prompt              |

### Silent Commands (Background Operations)

| Command                                         | Description                               |
| ----------------------------------------------- | ----------------------------------------- |
| `:ClaudeSilentRun`                              | Start Claude Code without switching focus |
| `:ClaudeSilentAddCurrentFile`                   | Add current file silently                 |
| `:ClaudeSilentSendPromptByCommandline {prompt}` | Send prompt silently                      |

## Usage Examples

### Basic Workflow

```vim
" Start Claude Code (uses default window type)
:ClaudeRun

" Or start with specific window type
:ClaudeRunFloating    " Force floating window
:ClaudeRunSplit       " Force horizontal split
:ClaudeRunVsplit      " Force vertical split

" Toggle between floating and split modes
:ClaudeRunToggle

" Add current file to context
:ClaudeAddCurrentFile

" Send a prompt
:ClaudeSendPromptByCommandline "Please explain this function"

" Request code review
:ClaudeReview

" Hide Claude window (smart: preserves terminal in split mode)
:ClaudeHide

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
nnoremap <leader>cf :ClaudeRunFloating<CR>
nnoremap <leader>cs :ClaudeRunSplit<CR>
nnoremap <leader>ct :ClaudeRunToggle<CR>
nnoremap <leader>ca :ClaudeAddCurrentFile<CR>
nnoremap <leader>cc :ClaudeContinue<CR>
nnoremap <leader>cv :ClaudeReview<CR>
nnoremap <leader>ch :ClaudeHide<CR>
vnoremap <leader>cp :ClaudeVisualTextWithPrompt<CR>
```

### Window Management

The plugin provides flexible window management options:

#### Display Modes

- **Floating Window** (default): Modern overlay window that doesn't affect your current layout
- **Horizontal Split**: Traditional split that divides the window horizontally
- **Vertical Split**: Traditional split that divides the window vertically

#### Smart Window Commands

- **`:ClaudeRunToggle`**: Intelligently switches between floating and split modes
  - If currently floating → switches to horizontal split
  - If currently split → switches to floating
  - If no Claude session exists → starts in floating mode

#### Enhanced Hide Behavior

**`:ClaudeHide`** now provides smart window management:

- **Floating/Popup windows**: Closes the window completely (traditional behavior)
- **Split windows**: Closes only the window while preserving the terminal process
  - Terminal session remains active in background
  - Can be reopened with `:ClaudeRun` to continue the same session
  - Prevents accidental loss of conversation history

This enhancement allows you to temporarily hide Claude when working in split mode without losing your session progress.

## How It Works

1. **Claude Code Integration**: The plugin spawns Claude Code CLI processes in
   terminal buffers
2. **Context Management**: Files are added to Claude Code's context using
   appropriate CLI commands
3. **Prompt Handling**: User prompts are sent to Claude Code via terminal input
4. **Response Display**: Claude Code responses appear in the terminal buffer
   within Vim/Neovim

## Differences from aider.vim

This plugin is based on [aider.vim](https://github.com/nekowasabi/aider.vim) but
adapted for Claude Code:

### Removed Features

- Voice input support (Whisper integration)
- Web content addition
- Aider-specific commands and modes
- .aiderignore file management

### Added Features

- Claude Code `/review` command support
- Conversation continuation with `-c` flag
- Updated command structure for Claude Code CLI
- **Multiple window launch modes**: Direct commands for floating, split, and vsplit windows
- **Smart window toggle**: `:ClaudeRunToggle` to switch between display modes
- **Enhanced hide behavior**: Smart window management that preserves terminal sessions in split mode

### Command Mapping

| aider.vim              | claudecode.vim          | Claude Code Equivalent |
| ---------------------- | ----------------------- | ---------------------- |
| `:AiderRun`            | `:ClaudeRun`            | `claude`               |
| `:AiderAddCurrentFile` | `:ClaudeAddCurrentFile` | Add file to context    |
| -                      | `:ClaudeReview`         | `/review`              |
| -                      | `:ClaudeContinue`       | `claude -c`            |

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
- Note: Floating windows require Neovim or Vim 8.2+ with popup support

### Vim Compatibility

#### Automatic Editor Detection

The plugin automatically detects whether you're using Vim or Neovim and adapts
its behavior accordingly.

#### Feature Differences

- **Floating windows**:
  - Neovim: Uses native floating windows
  - Vim 8.2+: Uses popup windows
  - Vim 8.1: Falls back to split windows
- **Terminal handling**: Automatically uses the appropriate terminal API for
  each editor
- **All core features work in both editors** with appropriate adaptations

#### Technical Implementation

The plugin includes a compatibility layer (`compatibility/` directory) that:

- Abstracts editor-specific APIs
- Provides consistent behavior across both editors
- Handles terminal operations transparently (`chansend` in Neovim,
  `term_sendkeys` in Vim)
- Manages window creation and positioning based on available features

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests,
or pull requests.

## License

This project is licensed under the same terms as the original aider.vim.

## Acknowledgments

- Based on [aider.vim](https://github.com/nekowasabi/aider.vim) by nekowasabi
- Powered by [denops.vim](https://github.com/vim-denops/denops.vim)
- Integrates with [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
  by Anthropic
