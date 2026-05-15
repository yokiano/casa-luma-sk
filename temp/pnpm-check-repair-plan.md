# pnpm check repair plan

Current baseline from `temp/check-output.txt`: **26 errors, 0 warnings in 16 files**.

After the new filtered check wrapper, generated Notion SDK errors under `src/lib/notion-sdk/**` should be hidden from `pnpm check` output and should not cause the command to fail. That should reduce the visible/actionable baseline to roughly **20 errors, 0 warnings**.

## 0. Generated Notion SDK diagnostics

- Files currently reported:
  - `src/lib/notion-sdk/dbs/employees/patch.dto.ts` — 1 error
  - `src/lib/notion-sdk/dbs/memberships/patch.dto.ts` — 2 errors
  - `src/lib/notion-sdk/dbs/end-of-shift-reports/patch.dto.ts` — 3 errors
- Count: **6 errors**
- Root cause: generated patch DTOs include Notion `formula` properties, but formula properties are read-only and not valid in Notion page update payloads.
- Current mitigation implemented:
  - Added `scripts/check-filtered.mjs`.
  - Updated `package.json` `check` script to run the wrapper.
  - The wrapper runs `svelte-kit sync`, then `svelte-check`, then filters diagnostics whose path contains `/src/lib/notion-sdk/`.
- Impact:
  - Visible `pnpm check` noise drops by 6 errors now.
  - Generation will not overwrite this mitigation because no generated file is edited.
- Caveat:
  - This hides all diagnostics in the generated SDK, not only formula DTO errors.
- Better long-term fix:
  - Fix/configure `notion-ts-client` generation so formula fields are omitted from patch DTOs.
  - If generator cannot be configured, add a post-generation script that patches generated files deterministically.

## 1. `src/lib/category-sync.remote.ts`

- Count: **4 errors**
- Symptoms:
  - `v.enum_(['CREATE', 'DELETE'])` is typed incorrectly for the installed Valibot API.
  - `catToSync.action` becomes too wide: `EnumValues<Enum>` instead of `'CREATE' | 'DELETE'`.
  - Result status type only allows `'SUCCESS' | 'ERROR'`, but code emits `'SKIP'`.
- Likely fix:
  - Replace the enum schema with the correct Valibot literal/union form, for example a picked enum object or `v.union([v.literal('CREATE'), v.literal('DELETE')])` depending on local Valibot version style.
  - Define explicit types:
    - `type CategoryAction = 'CREATE' | 'DELETE';`
    - `type SyncStatus = 'SUCCESS' | 'ERROR' | 'SKIP';`
  - Ensure report result entries use those types.
- Impact:
  - Removes **4 errors**.
  - Low-to-medium risk: touches remote validation and report typing; runtime behavior should remain the same.
- Verification focus:
  - Validate category sync form/action still accepts only `CREATE` and `DELETE`.
  - Confirm skipped delete result is intended and displayed correctly.

## 2. `src/lib/server/memberships.ts`

- Count: **1 error**
- Symptom:
  - Fallback `FamilySummary` object is missing required `loyverseCustomerId`.
- Likely fix:
  - Add `loyverseCustomerId: null` to the fallback family object, or make the type optional if this fallback truly cannot know it.
- Impact:
  - Removes **1 error**.
  - Low risk.
- Verification focus:
  - Membership creation/edit fallback path still renders family summary correctly.

## 3. `src/lib/server/notion/procurementMeta.ts`

- Count: **2 errors**
- Symptom:
  - `pushName` accepts `string | undefined`, but callers pass `string | null | undefined` from Notion option names.
- Likely fix:
  - Either change `pushName` signature to accept `string | null | undefined`, or call `pushName(option?.name ?? undefined)`.
- Impact:
  - Removes **2 errors**.
  - Very low risk if nulls are simply ignored.
- Verification focus:
  - Procurement metadata option names still aggregate/deduplicate correctly.

## 4. `src/routes/tools/salary-payment/SalaryPaymentState.svelte.ts`

- Count: **1 error**
- Symptom:
  - Incoming shift `ot` is `number | null`, but `SalaryShift.ot` expects `number | undefined`.
- Likely fix:
  - Normalize mapper output: `ot: shift.properties.ot ?? undefined`.
  - Or update `SalaryShift` type to allow `null` if null has semantic meaning.
- Impact:
  - Removes **1 error**.
  - Low risk if `null` and `undefined` both mean “no overtime”.
- Verification focus:
  - Salary totals still calculate correctly when OT is absent.

## 5. `src/lib/components/expense-scan/AdvancedOcrTools.svelte`

- Count: **1 error**
- Symptom:
  - `ScannedSlip` is imported as a named exported type from `SlipCard.svelte`, but that component does not export it.
- Likely fix options:
  - Move `ScannedSlip` to a shared `.ts` type file and import it from both components.
  - Or export `type ScannedSlip` from `SlipCard.svelte` if the type is defined there.
- Impact:
  - Removes **1 error**.
  - Low risk if only a type import changes.
- Verification focus:
  - Expense scan UI still passes slip data shape consistently.

## 6. `src/lib/components/graphics/GraphicRenderer.svelte`

- Count: **1 error**
- Symptom:
  - `cacheBust` is not a known option for the installed `modern-screenshot`/`domToPng` option type.
- Likely fix:
  - Remove `cacheBust: true`, or replace with the library-supported equivalent if one exists.
- Impact:
  - Removes **1 error**.
  - Low risk, unless cache busting was masking stale image fetches.
- Verification focus:
  - Generate/export graphic still works after removing option.

## 7. Business constants used by home/footer

- Files:
  - `src/lib/components/home/Hero.svelte` — 1 error
  - `src/lib/components/layout/Footer.svelte` — 2 errors
- Count: **3 errors**
- Symptoms:
  - `BUSINESS_INFO.tagline` does not exist.
  - `BUSINESS_INFO.phone` does not exist.
- Likely fix options:
  - Add `tagline` and `phone` to `BUSINESS_INFO` in constants if content is known.
  - Or change components to use existing `description` and hide/replace phone.
- Impact:
  - Removes **3 errors**.
  - Low risk, but content decision needed for correct public-facing copy.
- Verification focus:
  - Homepage and footer copy look correct.

## 8. `src/lib/components/menu/MenuItemIcons.svelte`

- Count: **1 error**
- Symptom:
  - Passing `title={title}` to Iconify `Icon` component is not accepted by its typed props.
- Likely fix options:
  - Remove the `title` prop and wrap with accessible text/`aria-label` if needed.
  - Or render a local `<svg><title>...</title>...</svg>` pattern if title is important.
- Impact:
  - Removes **1 error**.
  - Low risk.
- Verification focus:
  - Menu icons remain accessible; decorative icons should have `aria-hidden`/presentation semantics.

## 9. `src/routes/careers/+page.svelte`

- Count: **3 errors**
- Symptoms:
  - `opening.properties.expectedSalary` may be `null`.
  - `opening.properties.openPositions` may be `null`.
- Likely fix:
  - Use local normalized values inside the each block, for example:
    - `const expectedSalary = opening.properties.expectedSalary ?? 0`
    - `const openPositions = opening.properties.openPositions ?? 0`
  - In Svelte markup, this may require a helper function or pre-normalized data in the load/derived layer.
- Impact:
  - Removes **3 errors**.
  - Low risk if null should mean zero/not shown.
- Verification focus:
  - Salary and open-position sections still hide when values are missing.

## 10. Checklist print view prop typing

- Files:
  - `src/routes/print/checklist/[id]/+page.svelte` — 1 error
  - `src/routes/tools/checklist/+page.svelte` — 1 error
- Count: **2 errors**
- Symptom:
  - `ChecklistPrintView` expects `sop.name: string`, but supplied SOP has `name: string | undefined`.
- Likely fix options:
  - Normalize selected SOP data before passing: `name: data.sop.name ?? 'Untitled checklist'`.
  - Or relax `ChecklistPrintView` prop type if it can handle missing names.
- Impact:
  - Removes **2 errors**.
  - Low risk.
- Verification focus:
  - Print checklist title displays sane fallback when Notion title is missing.

## 11. `src/routes/tools/memberships/MembershipDialog.svelte`

- Count: **1 error**
- Symptom:
  - `calculateEndDate` is referenced but not defined/imported. TypeScript suggests `calculatedEndDate`, but that is likely a variable, not the function.
- Likely fix:
  - Import the existing date calculation helper if one exists.
  - Or replace with the same local calculation function used elsewhere in the memberships feature.
- Impact:
  - Removes **1 error**.
  - Medium risk: date calculation behavior affects membership end dates.
- Verification focus:
  - Weekly/monthly membership end date auto-calculation and manual override behavior.

## Recommended repair order

1. `category-sync.remote.ts` — highest remaining single-file impact: **4 errors**.
2. Business constants — **3 errors**, likely simple content/type fix.
3. Careers null handling — **3 errors**, likely straightforward.
4. Checklist prop normalization — **2 errors**.
5. Procurement null handling — **2 errors**.
6. Remaining one-off errors — **1 each**.
7. Long-term generated SDK fix, if desired, replacing the current filtered-check mitigation.
