# Website Images in Notion

Casa Luma website images are managed from the `Website Images` Notion database.

## How it works

- Add one record per reusable website image.
- Upload the image file to the `Image` property.
- Set `Active` to checked for images that should be available on the website.
- Use the `slug` property as the stable code key.
- Optional grouping can be done with the `Section` property.
- `Alt Text` is used for accessibility. If it is empty, the code falls back to the record `Name`.

## Required Notion fields

- `Name`: human-readable label for the image.
- `slug`: code-friendly unique key such as `home-page-hero-image`.
- `Image`: the uploaded file used by the website.
- `Active`: whether the image should be included in the website image map.
- `Alt Text`: accessible image description.
- `Section`: optional categorization like `Hero`, `Gallery`, or `Menu`.

## Code helpers

The shared helpers live in `src/lib/server/website-images.ts`.

- `getWebsiteImagesMap(section?)`: fetches all active images and returns a map keyed by slug.
- `getWebsiteImageBySlug(slug, section?)`: fetches the active image map and returns one image by slug.

Returned image objects include:

- `id`
- `slug`
- `src`
- `alt`
- `name`
- `section`
- `notionUrl`

## Usage pattern

Use a slug constant in the route or server loader, then pass the resolved image to the component.

Example from the inspiration page:

```ts
const INSPIRATION_HERO_IMAGE_SLUG = 'home-page-hero-image';

const heroImage = await getWebsiteImageBySlug(INSPIRATION_HERO_IMAGE_SLUG, 'Hero');
```

## Recommended workflow

1. Create or update the image record in Notion.
2. Keep the `slug` stable once code starts using it.
3. Replace the uploaded file in the same Notion record when the website image changes.
4. Update `Alt Text` whenever the image meaning changes.
5. Tell engineering only the slug when wiring a new image location.

## Notes

- Notion file URLs expire, so images are resolved server-side from live Notion data.
- Prefer using `slug` for code references instead of the record title.
- Slugs should be lowercase kebab-case and unique across the database.
