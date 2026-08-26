local M = {}

local config = {
	cmd = "pm",
}

--- @param opts { cmd?: string }?
function M.setup(opts)
	opts = opts or {}
	if opts.cmd then
		config.cmd = opts.cmd
	end
end

local COMPLETIONS_TTL_MS = 5000
local completions_cache = {}

--- Runs `<cmd> cd --completions` for the given cwd, memoized per-cwd for
--- COMPLETIONS_TTL_MS. Cmdline-completion plugins call the complete function
--- on every keystroke, so this avoids a process spawn per keystroke.
--- A failure here (not a monorepo, binary missing) legitimately means there
--- are no candidates, so it returns {} without notifying.
--- @param cwd string
--- @return string[]
local function get_package_completions(cwd)
	local now = (vim.uv or vim.loop).now()
	local cached = completions_cache[cwd]
	if cached and (now - cached.fetched_at) < COMPLETIONS_TTL_MS then
		return cached.names
	end

	local ok, result = pcall(function()
		return vim.system({ config.cmd, "cd", "--completions" }, { cwd = cwd, text = true }):wait()
	end)
	if not ok or result.code ~= 0 then
		return {}
	end

	local names = {}
	for _, line in ipairs(vim.split(vim.trim(result.stdout or ""), "\n")) do
		if line ~= "" then
			table.insert(names, line)
		end
	end

	completions_cache[cwd] = { names = names, fetched_at = now }
	return names
end

--- Runs `<cmd> cd [name]` and opens the resulting directory in oil.nvim.
--- @param name string? package name; nil opens the monorepo root
function M.cd(name)
	local cwd = vim.fn.getcwd()
	local args = { config.cmd, "cd" }
	if name and name ~= "" then
		table.insert(args, name)
	end

	local ok, result = pcall(function()
		return vim.system(args, { cwd = cwd, text = true }):wait()
	end)
	if not ok then
		vim.notify(string.format("Failed to run `%s cd`: %s", config.cmd, tostring(result)), vim.log.levels.ERROR)
		return
	end

	if result.code ~= 0 then
		-- Effect CLI's default error logger writes to stdout rather than
		-- stderr, so fall back to stdout if stderr is empty.
		local message = vim.trim(result.stderr or "")
		if message == "" then
			message = vim.trim(result.stdout or "")
		end
		vim.notify(message ~= "" and message or "`pm cd` failed", vim.log.levels.ERROR)
		return
	end

	local path = vim.trim(result.stdout or "")

	local ok_oil, oil = pcall(require, "oil")
	if not ok_oil then
		vim.notify("oil.nvim is required for :Pm cd", vim.log.levels.ERROR)
		return
	end

	oil.open(path)
end

--- Dispatches `:Pm [subcommand] [args...]`. Bare `:Pm` and `:Pm cd` both
--- fall through to M.cd with no name, matching the CLI's own `pm cd`
--- (no arg) behavior of opening the monorepo root.
--- @param fargs string[]
function M.run(fargs)
	local subcommand = fargs[1]

	if subcommand == nil or subcommand == "cd" then
		M.cd(fargs[2])
		return
	end

	vim.notify(
		string.format('Unknown subcommand "%s" for :Pm. Valid subcommand: cd', subcommand),
		vim.log.levels.ERROR
	)
end

--- Lua `complete` callback for the `:Pm` user command. Behaves like
--- `-complete=customlist`: nvim does not filter by arg_lead, so we must.
--- @param arg_lead string
--- @param cmd_line string
--- @param cursor_pos number
--- @return string[]
function M.complete(arg_lead, cmd_line, cursor_pos)
	local before_cursor = cmd_line:sub(1, cursor_pos)
	local tokens = vim.split(before_cursor, "%s+", { trimempty = true })

	-- tokens[1] is the command name itself (e.g. "Pm"); position counts
	-- args after it. If arg_lead is empty, the cursor sits after trailing
	-- whitespace and isn't part of `tokens`, so it starts a new position.
	local position = #tokens - 1
	if arg_lead == "" then
		position = position + 1
	end

	local candidates
	if position == 1 then
		candidates = { "cd" }
	elseif position == 2 and tokens[2] == "cd" then
		candidates = get_package_completions(vim.fn.getcwd())
	else
		candidates = {}
	end

	return vim.tbl_filter(function(candidate)
		return vim.startswith(candidate, arg_lead)
	end, candidates)
end

return M
