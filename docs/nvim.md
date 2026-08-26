# Neovim

A thin wrapper around `pm cd` that opens the result in [oil.nvim](https://github.com/stevearc/oil.nvim).

## Install

The plugin lives at the repo root (`lua/`, `plugin/`) since lazy.nvim can't install from a subdirectory.

```lua
{
  "fdarian/better-pm",
  dependencies = { "stevearc/oil.nvim" },
}
```

Requires the `pm` binary on `$PATH` (see the [main README](../README.md#install)) and oil.nvim.

## Usage

```
:pm cd <package-name>   Open a workspace package in oil.nvim
:pm cd                  Open the monorepo root in oil.nvim
:pm                     Same as :pm cd
```

`:pm` is a cmdline abbreviation that expands to the underlying `:Pm` user command (Neovim can't register a lowercase command). It only expands at the very start of a `:` command line, so `:s/pm/x/` and `:e pm_notes.txt` are untouched. To turn it off, run `:cunabbrev pm`.

Tab-completion works for the `cd` subcommand and for package names (sourced from `pm cd --completions`, cached per-cwd for 5s). Note: `:pm<Tab>` with no space does not expand or complete — the abbreviation only fires on a space, `<CR>`, or similar; type the space (`:pm <Tab>`) first.

This never changes Neovim's cwd — it only opens the oil buffer.

## Configuration

```lua
require("pm").setup({
  cmd = "pm", -- binary to invoke, e.g. point at a dev build
})
```

`setup()` is optional; the plugin works with no configuration.
