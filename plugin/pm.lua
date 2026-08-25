if vim.g.loaded_pm then
	return
end
vim.g.loaded_pm = true

vim.api.nvim_create_user_command("Pm", function(opts)
	require("pm").run(opts.fargs)
end, {
	nargs = "*",
	complete = function(arg_lead, cmd_line, cursor_pos)
		return require("pm").complete(arg_lead, cmd_line, cursor_pos)
	end,
	desc = "Run a pm subcommand (currently: cd)",
})

-- Lowercase `:pm` convenience: nvim can't register a lowercase user command,
-- so this expands `pm` to `Pm` only when it is the entire cmdline typed so
-- far (":pm", not ":s/pm/x/" or ":e pm_notes.txt"). Opt out with
-- `:cunabbrev pm`.
local function expand_pm_to_Pm()
	if vim.fn.getcmdtype() == ":" and vim.fn.getcmdline() == "pm" then
		return "Pm"
	end
	return "pm"
end

local has_keymap_ca = pcall(vim.keymap.set, "ca", "pm", expand_pm_to_Pm, { expr = true })
if not has_keymap_ca then
	vim.cmd([[cnoreabbrev <expr> pm (getcmdtype() ==# ':' && getcmdline() ==# 'pm') ? 'Pm' : 'pm']])
end
