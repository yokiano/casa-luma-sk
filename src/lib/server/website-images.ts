import { NOTION_API_KEY } from '$env/static/private';
import { dev } from '$app/environment';
import {
	WebsiteImagesDatabase,
	WebsiteImagesResponseDTO
} from '$lib/notion-sdk/dbs/website-images';
import type { WebsiteImageAsset, WebsiteImageMap, WebsiteImageSlug } from '$lib/types/website-media';

const websiteImagesDb = new WebsiteImagesDatabase({ notionSecret: NOTION_API_KEY });
const WEBSITE_IMAGES_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedImages: WebsiteImageMap | null = null;
let cachedAt = 0;
let pendingImagesRequest: Promise<WebsiteImageMap> | null = null;

function toWebsiteImageAsset(image: WebsiteImagesResponseDTO): WebsiteImageAsset | null {
	const slug = image.properties.slug.text?.trim();
	const src = image.properties.image.urls.find((url): url is string => Boolean(url));

	if (!slug || !src) {
		return null;
	}

	const name = image.properties.name.text || slug;
	const alt = image.properties.altText.text || name;

	return {
		id: image.id,
		slug,
		src,
		alt,
		name,
		section: image.properties.section?.name ?? null,
		notionUrl: image.url || ''
	};
}

async function fetchWebsiteImagesMap(): Promise<WebsiteImageMap> {
	const result = await websiteImagesDb.query({
		filter: { active: { equals: true } },
		sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
		page_size: 100
	});

	return result.results.reduce<WebsiteImageMap>((images, image) => {
		const asset = toWebsiteImageAsset(new WebsiteImagesResponseDTO(image));
		if (asset) {
			(images[asset.slug] ||= []).push(asset);
		}
		return images;
	}, {});
}

export async function getWebsiteImagesMap(): Promise<WebsiteImageMap> {
	if (dev) {
		return fetchWebsiteImagesMap();
	}

	const now = Date.now();
	if (cachedImages && now - cachedAt < WEBSITE_IMAGES_CACHE_TTL_MS) {
		return cachedImages;
	}

	if (!pendingImagesRequest) {
		pendingImagesRequest = fetchWebsiteImagesMap()
			.then((images) => {
				cachedImages = images;
				cachedAt = Date.now();
				return images;
			})
			.finally(() => {
				pendingImagesRequest = null;
			});
	}

	return pendingImagesRequest;
}

export async function getWebsiteImageBySlug(slug: WebsiteImageSlug): Promise<WebsiteImageAsset | null> {
	const images = await getWebsiteImagesMap();
	return images[slug]?.[0] || null;
}
