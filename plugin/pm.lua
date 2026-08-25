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
