# Parallel task: management dashboard flexi/membership health-check

You are in a separate Pi session/window. Keep this work separate from the active flexi pass automation review session.

Task: Add a management dashboard health-check indicator showing green/pass if flexi or membership records were created last week; if none, flag that the automation/business flow needs checking.

Important constraints:
- Do not mix this into the flexi automation review session.
- Inspect the current working tree first; there are unrelated in-progress changes.
- Keep scope tight to the management dashboard health-check indicator.
- Do not run `pnpm check`, `svelte check`, or `pnpm build` in this repo.
- Use targeted tests only if practical.
- Be careful with Notion SDK/generated files; if adding/changing Notion database properties, `pnpm notion:generate` is required, but avoid live schema changes unless explicitly authorized.

Useful starting points likely include:
- `docs/casa-luma/tools/mgmt-dashboard.md`
- `src/lib/mgmt-dashboard.remote.ts`
- `src/routes/mgmt-dashboard/+page.svelte`
- `src/routes/mgmt-dashboard/+layout.svelte`
- `src/lib/server/membership-automation.ts`
- `src/lib/server/memberships.ts`
- `src/lib/receipts/automations/flexi-pass-purchase.ts`

Desired outcome:
- Dashboard indicator is visible and understandable.
- Green/pass when flexi or membership records were created last week.
- Warning/fail state when none were created, with copy that suggests checking automation/business flow.
- Report exactly what changed and any tests run.
