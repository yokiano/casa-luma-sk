# Customer Intake Step Form -- Plan

## Goal

Replace the current single-page intake form with a **Typeform-style multi-step form**. Full viewport, one question per screen, minimal UI, snappy transitions. Touch-friendly, zero cognitive load.

---

## UX Flow

### Branching Logic

```
Step 0: Residency
  ├─ "I live in Koh Phangan"  →  Full flow (steps 1-5)
  └─ "I'm only visiting"      →  Short flow (steps 1-2 only → submit)
```

### Full Flow (Resident)

| Step | Title | Input | Required | Explainer |
|------|-------|-------|----------|-----------|
| 0 | Welcome | Two big buttons: Resident / Visitor | yes | Discounts available for long-term residents on some packages |
| 1 | Family Name | Single text input + short welcome line | yes | -- |
| 2 | Phone Number | Tel input | yes | This is for safety only. We will never call or message you without reason. |
| 3 | Guardians | Guardian cards (1 pre-added, open for input) | yes (min 1) | In case you'd like more people we can reach if needed |
| 4 | Kids | Kid cards (1 pre-added, open for input) | no (skippable) | We offer birthday perks and benefits. Also helps us know your kids by name. |
| 5 | Extras | Nationality, dietary, how-heard, special notes -- all in one screen | no (skippable) | Helps us personalize your experience |
| 6 | Rules | Rules approval (EN/HE/RU) + Submit button | yes | Please read and accept before submitting |

### Short Flow (Visitor)

| Step | Title | Input | Required |
|------|-------|-------|----------|
| 0 | Welcome | (same) | yes |
| 1 | Family Name | Single text input | yes |
| 2 | Phone Number | Tel input | yes |
| 3 | Rules | Rules approval + submit | yes |

### Rules Approval Step (Both Flows)

Shown as the **final step before submission** in both resident and visitor flows. Displayed as bold, skimmable, numbered rules with a language switcher (EN / HE / RU). The user must acknowledge before submitting.

**Rules content** (EN version -- translated into Hebrew and Russian too):

1. Children must be supervised by a parent or guardian at all times. You may not leave the venue without your child.
2. Casa Luma is not liable for any injuries or accidents on the premises. Parents and guardians are fully responsible for their children's safety.
3. For everyone's wellbeing, please do not bring children who are sick or showing symptoms of illness.

**Language switcher**: Three small buttons/tabs at the top of the rules block (EN | HE | RU). Minimal, no full i18n framework -- just a local record of translations keyed by language code.

**Component**: `RulesApproval.svelte` -- self-contained, owns its own translations, emits an `onAccept` callback. Has a checkbox or "I agree" button.

### After Submission

Full-screen success state with confetti, family code display, and "submit another" button. Same as current form.

---

## Technical Architecture

### No External Libraries Needed

Everything we need is already available:
- **Transitions**: Svelte built-in `fly`, `fade` from `svelte/transition`
- **Icons**: `lucide-svelte` (already installed)
- **Toast**: `svelte-sonner` (already installed)
- **Confetti**: `canvas-confetti` (already installed)
- **UI**: Tailwind CSS (already installed)

### File Structure

```
src/lib/customer-registration/
├── PLAN.md                              # This file
├── CustomerIntakeStepForm.svelte        # Main orchestrator component
├── StepShell.svelte                     # Reusable step layout (title, content, explainer, buttons)
├── intake-form.state.svelte.ts          # Svelte 5 state class for all form data + step logic
├── steps.ts                             # Step definitions array (metadata only)
├── KidCardStep.svelte                   # Adapted KidCard for step context (no remove on first)
├── GuardianCardStep.svelte              # Adapted GuardianCard for step context (no remove on first)
└── RulesApproval.svelte                 # Rules with EN/HE/RU switcher, checkbox to accept

src/routes/customer-intake-steps/
├── +page.svelte                         # Route page (auth gate + renders form)
└── +page.server.ts                      # Imports shared submission logic

src/lib/server/
└── intake-actions.ts                    # Extracted submit/check logic (shared between both routes)
```

### Component Responsibilities

#### `CustomerIntakeStepForm.svelte`
- Top-level component. Owns the state class instance.
- Renders `{#key currentStep}` with `fly` transitions for step changes.
- Defines step content as **snippets** (one per step), rendered inside `StepShell`.
- Handles form submission via `fetch` to the route's `?/submit` action.
- Handles success/reset state.
- Full viewport: `h-dvh w-full overflow-hidden` with flex centering.

#### `StepShell.svelte`
- Receives: `title`, `explainer`, `required`, `showSkip`, `showBack`, `onNext`, `onSkip`, `onBack`, `children` snippet.
- Renders the consistent layout:
  - Top: step indicator (subtle dots or thin progress bar)
  - Center: title + content (children snippet)
  - Below content: explainer text (small, muted)
  - Bottom: button row (Back | Skip | Next)
- Handles keyboard: Enter to advance.

#### `intake-form.state.svelte.ts`
Svelte 5 state class following the documented pattern:

```ts
export class IntakeFormState {
  // Form data
  familyName = $state('');
  mainPhone = $state('');
  email = $state('');
  kids = $state<Kid[]>([]);
  caregivers = $state<Caregiver[]>([]);
  livesInPhangan = $state<boolean | null>(null);
  nationality = $state('');
  dietaryPreference = $state('None');
  howDidYouHear = $state('');
  specialNotes = $state('');

  // Step navigation
  currentStep = $state(0);
  direction = $state<'forward' | 'backward'>('forward');

  // Rules
  rulesAccepted = $state(false);

  // Flow control
  isVisitor = $derived(this.livesInPhangan === false);
  // Visitor: residency → name → phone → rules (4 steps)
  // Resident: residency → name → phone → guardians → kids → extras → rules (7 steps)
  totalSteps = $derived(this.isVisitor ? 4 : 7);
  isLastStep = $derived(this.currentStep === this.totalSteps - 1);

  // Submission state
  submitting = $state(false);
  success = $state(false);
  customerCode = $state<string | undefined>(undefined);

  // Methods
  next() { ... }
  back() { ... }
  skip() { ... }  // same as next but doesn't validate
  canProceed() { ... }  // validates current step
  addKid() { ... }
  removeKid(id: string) { ... }
  addCaregiver() { ... }
  removeCaregiver(id: string) { ... }
  toFormData(): IntakeFormData { ... }  // serialize for submission
  reset() { ... }
}
```

#### `steps.ts`
Array of step metadata. Drives `StepShell` rendering:

```ts
interface StepDef {
  id: string;
  title: string;
  explainer?: string;
  required: boolean;
  visitorOnly?: boolean;  // if true, only shown in visitor flow (not used currently)
  residentOnly?: boolean; // if true, only shown in resident flow
}

export const STEPS: StepDef[] = [
  { id: 'residency', title: 'Welcome to Casa Luma', required: true },
  { id: 'family-name', title: "What's your family name?", required: true },
  { id: 'phone', title: 'Your phone number', required: true, explainer: '...' },
  { id: 'guardians', title: 'Who can we reach?', required: true, residentOnly: true, explainer: '...' },
  { id: 'kids', title: 'Tell us about your kids', required: false, residentOnly: true, explainer: '...' },
  { id: 'extras', title: 'A few more details', required: false, residentOnly: true, explainer: '...' },
  { id: 'rules', title: 'Before we finish', required: true, explainer: 'Please read and accept' },
];
```

#### `KidCardStep.svelte` / `GuardianCardStep.svelte`
Adapted versions of the existing cards:
- Copied from `src/lib/components/intake/` to `src/lib/customer-registration/`
- Adapted for the step context:
  - First card cannot be removed (no remove button on index 0 for guardians since min 1 required)
  - Slightly different styling to match full-viewport aesthetic (less border-radius, more breathing room)
  - Guardian card starts open/visible by default (no "Add caregiver" button needed for the first one)

### Route Setup

#### `+page.server.ts` (new route)
- **Load**: Same secret-based auth as current route. Import `CUSTOMER_INTAKE_SECRET` from env, check `?secret=` param.
- **Actions**: Import and call the shared `submitIntakeForm()` and `checkExistingCustomer()` from `$lib/server/intake-actions.ts`.

#### `+page.svelte` (new route)
- Same pattern as current: check `data.authorized`, show form or access-denied screen.
- Strip `?secret` from URL on mount.

### Shared Server Logic (`$lib/server/intake-actions.ts`)
Extract the following from the current `+page.server.ts`:
- `submitIntakeForm(data: IntakeFormData)` -- the entire submit action body
- `checkExistingCustomer(email?: string, phone?: string)` -- the check action body
- Helper functions: `normalizeDietaryPreference`, `normalizeHowDidYouHear`, `getNewLoyverseName`

Both the old and new route's `+page.server.ts` will import these. The old route keeps working exactly as-is.

---

## Transition Design

### Step Transitions
- Use `{#key currentStep}` to trigger mount/unmount
- `in:fly` and `out:fly` with direction-aware `x` offset:
  - Forward: content flies in from right (+300), old content flies out left (-300)
  - Backward: content flies in from left (-300), old content flies out right (+300)
- Duration: ~300ms, easing: `cubicOut`
- The `direction` state on the class controls which way the fly goes

### Layout Strategy (No Overflow)
```
┌─────────────────────────────────┐  ← h-dvh w-full
│  (progress dots)                │  ← fixed top, minimal
│                                 │
│                                 │
│       Title                     │  ← centered vertically
│       [Input Component]         │
│       explainer text            │
│                                 │
│                                 │
│   [Back]     [Skip]    [Next]   │  ← fixed bottom
└─────────────────────────────────┘
```

- Container: `h-dvh w-full flex flex-col overflow-hidden`
- Content area: `flex-1 overflow-y-auto` (only scrolls if step content is tall, e.g. guardians/kids)
- Button bar: `flex-shrink-0` pinned to bottom
- Safe area padding for mobile (`pb-safe` or manual `pb-6`)

### Progress Indicator
Subtle dots at the top. Current dot highlighted. No numbers, no labels. Just position awareness.

---

## Step-by-Step Implementation Order

### Phase 1: Foundation
1. Extract shared server logic to `$lib/server/intake-actions.ts`
2. Refactor current route's `+page.server.ts` to use the shared module (verify nothing breaks)
3. Create `intake-form.state.svelte.ts` state class
4. Create `steps.ts` step definitions

### Phase 2: UI Components
5. Create `StepShell.svelte`
6. Create `GuardianCardStep.svelte` (adapt from existing)
7. Create `KidCardStep.svelte` (adapt from existing)
8. Create `RulesApproval.svelte` (self-contained, EN/HE/RU translations)
9. Create `CustomerIntakeStepForm.svelte` (the main component)

### Phase 3: Route & Integration
10. Create `/customer-intake-steps/+page.server.ts`
11. Create `/customer-intake-steps/+page.svelte`
12. Relax caregiver validation in shared server logic for visitors
13. Test full flow (both resident and visitor paths)

### Phase 4: Polish
14. Transition tuning
15. Mobile testing / viewport fixes
16. Keyboard navigation (Enter to proceed)
17. Edge cases (empty guardians, validation messages)

---

## Validation Rules

| Field | Rule |
|-------|------|
| livesInPhangan | Must select one option before proceeding |
| familyName | Non-empty string |
| mainPhone | Non-empty string |
| caregivers | At least 1 for residents, each must have name. Skipped entirely for visitors. |
| kids | Optional, but if added each must have name |
| extras | All optional, no validation |
| rulesAccepted | Must be true before submit |

Validation is checked on `next()`. If invalid, show inline feedback (not a toast -- keep it in-step).

---

## Key Design Decisions

1. **No page reload on submit** -- use `fetch` directly to post to `?/submit`, same as current form's `use:enhance` but without the form element wrapper around the whole multi-step flow.
2. **Single form data object** -- state class accumulates data across steps, serializes to `IntakeFormData` on submit. Same shape, same server-side handling.
3. **Visitor short-circuit** -- after phone step, visitor goes straight to rules/submit. No guardian/kid/extras steps. Caregiver array will be empty. **Server validation relaxed**: allow empty caregivers when `livesInPhangan === false`.
4. **Pre-populated entries** -- Guardians step starts with 1 blank guardian card visible. Kids step starts with 1 blank kid card visible. User can add more or remove down to 0 (for kids only).
5. **No duplicate check in step flow** -- the existing customer check (`?/check`) runs debounced after phone entry, same as current form. Keep it.
6. **Rules approval** -- final step in both flows. Must accept before submit button is enabled. Rules have EN/HE/RU translations, self-contained in `RulesApproval.svelte`.
