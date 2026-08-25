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
:Pm cd <package-name>   Open a workspace package in oil.nvim
:Pm cd                  Open the monorepo root in oil.nvim
:Pm                     Same as :Pm cd
```

Tab-completion works for the `cd` subcommand and for package names (sourced from `pm cd --completions`, cached per-cwd for 5s).

This never changes Neovim's cwd — it only opens the oil buffer.

## Configuration

```lua
require("pm").setup({
  cmd = "pm", -- binary to invoke, e.g. point at a dev build
})
```

`setup()` is optional; the plugin works with no configuration.
