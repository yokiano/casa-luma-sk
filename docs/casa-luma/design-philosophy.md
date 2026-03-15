# Casa Luma Design Philosophy

This document captures the visual and interaction philosophy behind Casa Luma's public-facing website so future pages feel like they belong to the same world.

The current homepage is the main reference, especially the hero and inline text sections, which are the clearest expression of the brand's intended taste and direction.

## Current status

- There is no existing design philosophy document in `docs/casa-luma/`.
- There is a visual reference page in `src/routes/design-system/+page.svelte`, but it is only a partial design-system sandbox, not a maintained source of truth for the live website style.
- The most accurate implementation references today are:
  - `src/app.css`
  - `src/lib/components/pages/HomeLanding.svelte`
  - `src/routes/inspiration/HeroSection.svelte`
  - `src/routes/inspiration/InlineTextSection.svelte`
  - `src/routes/inspiration/PlaygroundSection.svelte`
  - `src/routes/inspiration/CafeSection.svelte`
  - `src/lib/components/home/GoogleReviewsSection.svelte`
  - `src/routes/inspiration/WorkshopsSection.svelte`

## Core feeling

Casa Luma should feel warm, composed, playful, and quietly premium.

It is not a loud kids brand, and it is not a cold luxury brand.

The sweet spot is:

- family-first, but aesthetically literate
- natural, but not rustic
- playful, but not chaotic
- premium, but still welcoming
- editorial, but still soft and human

If a design looks too corporate, too toy-store, too generic wellness, or too trendy-tech, it is probably off brand.

## The homepage rule

Use the homepage as the quality bar.

- The hero and inline text sections are the strongest reference points.
- Later sections are allowed to have their own personality, but they should still feel like variations within the same atmosphere.
- Each section can have its own "chic," but the overall page should still read as one brand story.

In practice, this means each section can shift composition, image treatment, or accent emphasis, but should still reuse the same palette, typography logic, spacing discipline, and softness.

## Brand tokens

Primary brand tokens currently live in `src/app.css` and `src/lib/utils/brand-controller.svelte.ts`.

### Colors

Base palette:

- Cream beige: `#F9EDE8` / nearby page backgrounds such as `#F9F7F2`
- Charcoal: `#333333` and nearby UI text color `#2D3A3A`
- Golden sand: `#dfbc69`
- Sage green: `#A8C3A0`
- Terracotta: `#E07A5F`

Guidelines:

- Cream and white are the primary canvases.
- Charcoal is the default reading color; avoid pure black unless necessary.
- Terracotta is the emotional accent: warmth, editorial emphasis, active states.
- Golden sand is the light-filled accent: highlights, stars, warmth, subtle luxury.
- Sage is the balancing accent: calm, nature, softness.
- Use color intentionally; do not turn every component into a multicolor object.

### Typography

- Body font: `Manrope`
- Heading font: `Poppins`

How typography should feel:

- Large headings are airy, not dense.
- Light and medium weights usually fit better than heavy bold weights.
- Italics are used as a selective flourish, not as a default style.
- Small uppercase labels with generous tracking are part of the brand voice.
- Body copy should stay readable, calm, and lightly softened with opacity when appropriate.

## Composition principles

### 1. Calm spaciousness

- Prefer generous padding and breathing room.
- Let sections feel intentionally placed, not tightly packed.
- Use large type, large image crops, and clear negative space.

### 2. Soft structure

- Layouts are structured, but edges are softened.
- Rounded corners, organic blobs, blurred color fields, and gentle shadows all help.
- Avoid harsh boxes, cramped grids, and aggressive dividers.

### 3. Editorial contrast

- Pair oversized type with a single image or a restrained line of copy.
- Mix refined typography with playful image placement.
- Let one thing lead per section: a headline, an image, or a quote collection.

### 4. Variety inside consistency

- Alternate section layouts so the page does not feel templated.
- Switching from cream to white backgrounds is good when it creates rhythm.
- Reuse recurring patterns such as eyebrow labels, large headlines, inline text links, soft cards, and image-led compositions.

## Signature homepage patterns

### Hero

The hero in `src/routes/inspiration/HeroSection.svelte` is the clearest statement of the brand.

Key traits:

- huge, almost poster-like typography
- selective italic emphasis for emotional words
- floating central image with an organic border radius
- soft ambient blobs behind the content
- restrained parallax tied to scroll
- very little UI clutter

This section succeeds because it feels confident and spacious. It does not explain everything. It creates mood first.

### Inline narrative text

The section in `src/routes/inspiration/InlineTextSection.svelte` is another gold-standard reference.

Key traits:

- text is the main event
- images appear inline as part of the sentence rhythm
- the animation reveals meaning instead of distracting from it
- the palette is used as emphasis, not decoration overload
- it feels designed, but still easy to read

This is a strong model for any section where we want brand storytelling instead of a standard marketing block.

### Supporting sections

The later homepage sections show how to stay in the same family while simplifying the pattern:

- alternating image/text compositions
- white and cream section rhythm
- eyebrow labels in tracked uppercase
- headline with one highlighted phrase
- quiet CTA links using underline or border-bottom treatment
- rounded cards with thin borders and soft shadows

## UI patterns to keep reusing

### Eyebrow labels

- Use very small uppercase text.
- Increase letter spacing noticeably.
- Keep the color softened, not full-strength charcoal.

### Headlines

- Make them short, shaped, and easy to scan.
- Break lines intentionally.
- Highlight one phrase only when it truly helps.
- Prefer emotional clarity over feature stacking.

### Body copy

- Keep it conversational and warm.
- Avoid startup phrasing and generic hospitality clichés.
- One idea per paragraph is usually enough.

### Links and CTAs

- Favor elegant text links or understated pill/outline buttons.
- Hover states should feel refined: color shift, slight translate, subtle shadow.
- Avoid heavy, loud, oversized CTA treatments unless a page truly needs one.

### Cards

- Use large radii or very soft corners.
- Pair thin borders with warm whites and restrained shadows.
- Cards should feel tactile and calm, not dashboard-like.

## Motion guidelines

Current motion references live in `src/lib/components/animations/Reveal.svelte`, `src/routes/inspiration/HeroSection.svelte`, and `src/lib/components/animations/InlineImageText.svelte`.

Motion should feel:

- slow enough to notice
- smooth and physical, not snappy
- secondary to content
- driven by reveal, drift, scale, and parallax more than bounce or gimmicks

Rules of thumb:

- Use motion to guide attention, not to decorate everything.
- One strong movement idea per section is enough.
- Prefer stagger and scroll-linked subtlety over repeated micro-animations.
- If an animation becomes the point of the section, it is probably too much.

## Imagery guidelines

- Use images that feel warm, natural, and lived in.
- Prefer natural light, tactile materials, family moments, and spatial calm.
- Avoid imagery that feels sterile, overly commercial, or saturated like a toy catalog.
- Crops should feel editorial, not purely informational.
- Irregular masks or soft rounded frames fit the brand better than hard rectangles everywhere.

Website image management is documented separately in `docs/casa-luma/website-images.md`.

## Writing tone in the UI

The visual language works best when the copy matches it.

Use copy that is:

- warm
- specific
- lightly poetic
- calm and confident

Avoid copy that is:

- loud or salesy
- overloaded with adjectives
- overly clever
- too corporate or generic

Good direction:

- "made for movement, wonder, and confidence"
- "Designed for everyday family moments"
- "Host a chic, playful celebration"

## Practical do and don't list

### Do

- start with cream, white, charcoal, and one accent
- use generous spacing before adding more decoration
- let one line, one image, or one motion idea lead the section
- combine polish with softness
- keep the page feeling human and breathable

### Don't

- make sections feel like generic SaaS marketing blocks
- use bright rainbow colors or high-saturation kids-brand styling
- overuse bold weights, heavy shadows, or dense card grids
- add motion everywhere just because it is available
- lose the calm premium feeling in pursuit of more content

## When designing a new page

Use this checklist:

1. Start from the emotional tone before picking components.
2. Use the homepage hero and inline text sections as the aesthetic benchmark.
3. Pull colors and type from `src/app.css` rather than inventing a new palette.
4. Give the page one visual idea that feels memorable but controlled.
5. Make sure supporting sections simplify gracefully rather than competing with the hero moment.
6. Check that desktop and mobile both keep the same mood, not just the same content.

## Source of truth for now

Until a fuller brand system exists, treat the live homepage plus `src/app.css` as the source of truth.

If the homepage style changes materially, this document should be updated alongside it.
