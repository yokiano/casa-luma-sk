## Checks
- Never run `pnpm check`, `svelte check`, or `pnpm build` in this project.
- They produce excessive output and add noise to the agent context.

## Notion schema changes
- When adding, renaming, or changing Notion database properties used by `src/lib/notion-sdk/**`, run `pnpm notion:generate` afterward so the generated SDK/types stay in sync.
- If the generator prompts about unrelated new databases, add those databases to `notion-sdk.json` `ignore` only when they are not needed by this app, then rerun the generator.
- Avoid importing generated Notion SDK database barrels such as `$lib/notion-sdk/dbs/<db>` from server/runtime code. Import concrete files instead (`/db`, `/response.dto`, `/patch.dto`, `/constants`, `/types`) to avoid Vercel/SvelteKit production-build circular initialization errors like `Cannot access 'GenericDatabaseClass' before initialization`.

## Dev server logs via tmux
- The dev server is often already running in tmux. Before starting a new server, check for an existing tmux server and panes:
  - `echo "$TMUX"` / `echo "$TMUX_PANE"` to see whether the agent shell is itself inside tmux.
  - `tmux list-sessions`, `tmux list-windows -a`, and `tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index} #{window_name} #{pane_current_command} #{pane_active} #{pane_current_path}'` to discover running panes.
- User convention: use one tmux session per project/topic. Within that session, keep one dedicated dev-server window when possible. The dev-server window is often the first window but not guaranteed; it should usually be named something recognizable like `p dev`, `dev server`, `dev`, or similar.
- If a pane looks like the dev server, read logs with `tmux capture-pane -t <session>:<window>.<pane> -p -S -200`.
- Prefer observing logs with `capture-pane` over restarting the dev server. Do not use `tmux send-keys` to interrupt or type into a user's pane unless the user explicitly asks.
- If no clear dev-server window/pane follows the convention, ask the user which tmux session/window/pane contains it and optionally remind them of the convention / offer a rename command.
