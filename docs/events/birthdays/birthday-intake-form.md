# Birthday Event Intake Form Overview

This document describes the structure, flow, and user experience for the Casa Luma Birthday Party Booking Form (intake form). It is designed for parents organizing birthday events at our venue.

**Implementation source of truth for prices and catalog:** `src/lib/birthday-pricing.ts`

---

## 1. Core Objectives
- **Zero Friction**: Parents expect a clean, intuitive experience without boring form inputs.
- **Dynamic Adaptability**: The form adjusts subsequent questions based on date, capacity bucket, guest count, playground choice, and optional add-ons.
- **Accurate Quoting**: Real-time price estimation with line items tied to specific answers.
- **Seamless Notion Sync**: Submissions persist as event bookings in the Notion event database.

---

## 2. Pricing Logic & Business Rules

The form does **not** ask users to pick a named package card. It asks for concrete event details and derives the booking track automatically. Each step captures one decision; the quote explains why each amount appears.

### Derived booking tracks

#### A. Full Hosted Birthday — Mon–Sat
Automatically selected when:
- The event date falls on Monday–Saturday (Bangkok timezone).
- The family chooses the **up to 15 kids** capacity bucket.

Pricing and inclusions:
- **Base price**: 8,000 THB.
- **Included children**: Up to 15 children.
- **Extra children**: +700 THB / child above 15.
- **Included areas**: Garden & Pool (3 hours).
- **Hospitality included**: Waiter, decorations, birthday cake, buffet food, and background music.
- **Indoor playground**: Optional add-on (see below), not included in base.

#### B. Full Hosted Birthday — Sunday
Automatically selected when:
- The event date falls on Sunday.
- The family chooses the **up to 15 kids** capacity bucket.

Pricing and inclusions:
- **Base price**: 10,000 THB.
- **Included children**: Up to 15 children.
- **Extra children**: +500 THB / child above 15.
- **Included areas**: Garden & Pool (3 hours).
- **Hospitality included**: Same as weekday full hosted.
- **Indoor playground**: Optional add-on (see below), not included in base.

When the user selects a Sunday date on the date step, show an inline note that the hosted base price is 10,000 THB (weekdays and Saturdays are 8,000 THB before playground). Sunday is intentionally higher because it is usually busier.

#### C. Simple Table Birthday — Up to 8 Kids
Selected via the **up to 8 kids** capacity bucket.

Pricing and inclusions:
- **Base event fee**: 0 THB.
- **Eligibility**: Sized for up to 8 children.
- **Setup**: Dedicated table in the garden.
- **DIY by default**: Parents handle decorations and cake unless upgrades are added.
- **Optional upgrades**: Buffet +500 THB/child, cake +700 THB, decorations +500 THB.

### Indoor playground add-on (explicit step)

Users choose **with playground** or **without playground** on a dedicated step after guest count.

| Capacity bucket | Playground pricing when selected |
|-----------------|----------------------------------|
| Up to 15 (full hosted) | 4,000 THB flat + 300 THB per child above 15 |
| Up to 8 (simple table) | 320 THB per child |

Playground is never implicit from the day of week. Sunday vs weekday only affects the **base** hosted price. For 15 children, weekday base + playground equals 12,000 THB.

### Mutually exclusive decision categories

1. **Date** → weekday/Sunday base price for full hosted.
2. **Capacity bucket** → up to 8 (simple table) vs up to 15 (full hosted).
3. **Guest count** → extra-child surcharges and playground add-on math.
4. **Playground** → with or without (priced add-on).
5. **Food/cake/decor** → included for full hosted; optional for simple table.
6. **Activities** → optional add-ons.

---

## 3. Dynamic Flow & Questions

The intake flow is question-led. The derived track is stored internally; users see plain-language steps and a transparent quote.

```json
[
  { "id": "organizer", "title": "Tell us about yourself", "required": true },
  { "id": "child-details", "title": "Who are we celebrating?", "required": true },
  { "id": "event-details", "title": "When should we celebrate?", "required": true },
  { "id": "capacity-choice", "title": "How many kids are you planning for?", "required": true },
  { "id": "kids-count", "title": "Precise guest count", "required": true },
  { "id": "playground-choice", "title": "Include the indoor playground?", "required": true },
  { "id": "derived-track-summary", "title": "Your birthday setup", "required": false },
  { "id": "simple-table-upgrades", "condition": "capacityBucket === 'up-to-8'" },
  { "id": "buffet-menu", "condition": "full hosted OR simple table with buffet upgrade" },
  { "id": "add-on-activities", "required": false },
  { "id": "notes", "required": false },
  { "id": "rules", "required": true }
]
```

### Suggested UX order

1. Parent details
2. Child details
3. Date and time (Sunday pricing note when applicable)
4. Capacity bucket (up to 8 vs up to 15)
5. Precise guest count
6. Playground add-on choice
7. Quote summary (line items)
8. Simple-table upgrades (if applicable)
9. Buffet main course (if applicable)
10. Activity add-ons
11. Notes and rules (submit disabled until rules accepted)

---

## 4. Real-Time Price Estimator

Line items are built in `calculateBirthdayQuote()` (`src/lib/birthday-pricing.ts`).

### Base setup

- **Mon–Sat full hosted**: 8,000 THB base; extra children above 15 at 700 THB each.
- **Sunday full hosted**: 10,000 THB base; extra children above 15 at 500 THB each.
- **Simple table**: 0 THB base; optional buffet/cake/decor upgrades.

### Playground add-on

- If `includePlayground` and up to 15: 4,000 + max(0, kids − 15) × 300 THB.
- If `includePlayground` and up to 8: kids × 320 THB.

### Activities

- Face painting: 3,000 THB
- Movement activity: 5,000 THB
- Planting workshop: 6,000 THB minimum

### Quote language examples

- “Your date is a Sunday, so the full hosted birthday base is 10,000 THB.”
- “You selected the indoor playground add-on: 4,000 THB + 300 THB for each child above 15.”
- “Simple table birthdays can add buffet, cake, and decorations individually.”

---

## 5. Technical Stack

- **Framework**: Svelte 5 + SvelteKit
- **Styling**: TailwindCSS
- **Components**: shadcn-svelte where helpful
- **State**: `BirthdayFormState` in `src/lib/birthday-registration/birthday-form.state.svelte.ts`
- **Pricing/catalog**: `src/lib/birthday-pricing.ts`

---

## 6. Summary & Print Route

After a successful booking, redirect to: `/birthdays/summary?ref={bookingReference}`

### Features
- Printable contract-style layout
- Selected options and estimated total
- Copy as Markdown for staff follow-up
- Print-optimized (hides chrome)
- Signature area for on-site confirmation
