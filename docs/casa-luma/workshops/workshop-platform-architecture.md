# Workshop Platform Architecture and Setup

This document tracks the Casa Luma workshop information architecture, landing page, intake form plans, and future Notion integration.

Status: early draft.

## Goal

Create one clear place for workshop-related information and gradually turn it into a public facilitator journey:

1. Internal source-of-truth documentation.
2. Public landing page for people interested in hosting a workshop.
3. CTA to an intake form.
4. Intake data saved into the Casa Luma Notion database.
5. Operational workflow for reviewing, approving, scheduling, and promoting workshops.

## Current implementation

### Documentation

Workshop documentation lives under:

- `docs/casa-luma/workshops/facilitator-information.md`
- `docs/casa-luma/workshops/workshop-platform-architecture.md`

The facilitator information file contains the practical, dry information we can share with workshop hosts.

This architecture file tracks the system and future implementation plan.

### Landing page route

Initial public route:

- `/workshops/host-a-workshop`
- SvelteKit file: `src/routes/workshops/host-a-workshop/+page.svelte`
- Current contact email: `info@casalumakpg.com`

Purpose:

- Give facilitators a friendly overview of the opportunity.
- Explain spaces, capacity, time blocks, music support, light promotion support, and responsibilities.
- Set expectations that the program is still evolving.
- Prepare for a future CTA that sends users to an intake form.

## Future intake form

The future CTA should collect enough information to decide whether a workshop is a good fit and to prepare operations.

Suggested intake fields:

### Facilitator details

- Full name.
- Contact email.
- Phone / WhatsApp.
- Business name or professional profile, if relevant.
- Website, Instagram, or portfolio link.
- Short facilitator bio.

### Workshop details

- Workshop title.
- Workshop category.
- Short public description.
- Detailed internal description.
- Target audience.
- Is it child-focused, adult-focused, family-focused, or mixed?
- Ideal participant age range.
- Minimum and maximum number of participants.
- Expected workshop duration.
- Preferred dates or recurring schedule.
- Preferred time of day.
- Required setup time.
- Required pack-down time.

### Space and equipment needs

- Preferred space: ground-floor workshop room, upper space, or unsure.
- Movement/floor-space requirements.
- Music or audio needs.
- Tables/chairs/cushions needs.
- Yoga mats or props supplied by facilitator or participants.
- Any materials brought by the facilitator.
- Any mess, water, paint, food, candles, smoke, heat, or safety-sensitive materials.

### Commercial model

- Suggested participant price.
- Who collects participant payments: facilitator or Casa Luma.
- One-off workshop or recurring class.
- Internal agreement model or requested alternative.

### Legal and safety

- Work permit / legal permission confirmation.
- Relevant certifications, if any.
- Insurance, if any.
- Safety considerations.
- Agreement that the facilitator is responsible for participants and activity delivery.

### Promotion

- Public image or poster.
- Facilitator photo.
- Social media caption.
- Links for promotion.
- Whether Casa Luma may promote the workshop on its channels.
- Whether the workshop can be listed on the Casa Luma schedule.

## Notion integration plan

Future intake submissions should be saved to a Notion database.

Potential database name:

- `Workshop Leads`
- or `Workshop Facilitator Intake`

Suggested status flow:

1. New inquiry.
2. Needs review.
3. Need more information.
4. Approved.
5. Scheduled.
6. Promoted.
7. Completed.
8. Rejected / not a fit.
9. Cancelled.

Possible Notion properties:

- Facilitator name.
- Email.
- WhatsApp / phone.
- Workshop title.
- Category.
- Audience.
- Preferred date/time.
- Preferred space.
- Capacity requested.
- Internal commercial model.
- Status.
- Internal notes.
- Public description.
- Promotion assets.
- Legal/safety confirmation.

## Future public page improvements

- Add a primary CTA button: `Apply to host a workshop`.
- Link CTA to the intake form.
- Add photos of the ground-floor workshop room.
- Add a small FAQ section.
- Add clearer operational details once decided: promotion support, recurring class rules, and house rules.
- Add examples of suitable workshop types.
- Add a downloadable or shareable facilitator information sheet if needed.

## Operational notes

- This page should be facilitator-facing, not customer-facing.
- Avoid over-promising capacity, equipment, or promotion results. Phrase schedule visibility as practical exposure to families already looking for activities, not as a guarantee of bookings.
- Keep the legal responsibility wording clear: Casa Luma rents the space; the facilitator is responsible for permissions, participants, and activity delivery.
- When Notion database properties are added or changed in `src/lib/notion-sdk/**`, run `pnpm notion:generate` afterward.
