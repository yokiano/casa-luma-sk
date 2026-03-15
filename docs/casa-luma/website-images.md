# Website Images in Notion

Casa Luma website images are managed from the `Website Images` Notion database and loaded once in the root layout.

## How it works

- Add one record per reusable website image.
- Upload the image file to the `Image` property.
- Set `Active` to checked for images that should be available on the website.
- Use the `slug` property as the stable code key.
- `Section` can still exist in Notion for organization, but the code uses `slug` as the source of truth.
- `Alt Text` is used for accessibility. If it is empty, the code falls back to the record `Name`.

## Required Notion fields

- `Name`: human-readable label for the image.
- `slug`: code-friendly unique key such as `home-page-hero-image`.
- `Image`: the uploaded file used by the website.
- `Active`: whether the image should be included in the website image map.
- `Alt Text`: accessible image description.
- `Section`: optional categorization like `Hero`, `Gallery`, or `Menu`.

## Code helpers

The shared helpers live in `src/lib/server/website-images.ts` and the app-wide state lives in `src/lib/state/website-media.svelte.ts`.

- `getWebsiteImagesMap()`: fetches all active images and returns a map keyed by slug.
- `getWebsiteImageBySlug(slug)`: returns one image by slug when direct server access is needed.
- `WebsiteMediaState`: encapsulates the reactive image map for Svelte components.
- `setWebsiteMediaContext()` / `getWebsiteMediaContext()`: provide app-wide access through Svelte context.

Returned image objects include:

- `id`
- `slug`
- `src`
- `alt`
- `name`
- `section`
- `notionUrl`

## Usage pattern

The root layout loads all active website images once in `src/routes/+layout.server.ts` and injects them into a shared context in `src/routes/+layout.svelte`.

Components then resolve images locally by slug.

Example pattern in a component:

```ts
const websiteMedia = getWebsiteMediaContext();

const heroImage = $derived(websiteMedia.get('home-page-hero-image'));
```

## Recommended workflow

1. Create or update the image record in Notion.
2. Keep the `slug` stable once code starts using it.
3. Replace the uploaded file in the same Notion record when the website image changes.
4. Update `Alt Text` whenever the image meaning changes.
5. Tell engineering only the slug when wiring a new image location.

## Notes

- Notion file URLs expire, so images are resolved server-side from live Notion data in the layout load.
- Prefer using `slug` for code references instead of the record title.
- Slugs should be lowercase kebab-case and unique across the whole database.
