import { NOTION_API_KEY } from '$env/static/private';
import { WebsiteImagesDatabase } from '$lib/notion-sdk/dbs/website-images/db';
import { WebsiteImagesResponseDTO } from '$lib/notion-sdk/dbs/website-images/response.dto';
import { cachedNotionRead } from '$lib/server/cache/notion-cache';
import { buildNotionCacheKey } from '$lib/server/cache/notion-cache-keys';
import type { NotionCacheStore } from '$lib/server/cache/keyv';
import type { WebsiteImageAsset, WebsiteImageMap, WebsiteImageSlug } from '$lib/types/website-media';

const websiteImagesDb = new WebsiteImagesDatabase({ notionSecret: NOTION_API_KEY });
const WEBSITE_IMAGES_CACHE_TTL_MS = 5 * 60 * 1000;
const WEBSITE_IMAGES_QUERY = {
	filter: { active: { equals: true } },
	sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
	page_size: 100
} as const;
const WEBSITE_IMAGES_CACHE_KEY = buildNotionCacheKey({
	operation: 'websiteImages.queryActive',
	id: 'website-images',
	params: WEBSITE_IMAGES_QUERY
});

type WebsiteImagesQueryResponse = Awaited<ReturnType<WebsiteImagesDatabase['query']>>;

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

async function fetchWebsiteImagesResponse(): Promise<WebsiteImagesQueryResponse> {
	return websiteImagesDb.query(WEBSITE_IMAGES_QUERY as unknown as Parameters<WebsiteImagesDatabase['query']>[0]);
}

function toWebsiteImagesMap(result: WebsiteImagesQueryResponse): WebsiteImageMap {
	return result.results.reduce<WebsiteImageMap>((images, image) => {
		const asset = toWebsiteImageAsset(new WebsiteImagesResponseDTO(image));
		if (asset) {
			(images[asset.slug] ||= []).push(asset);
		}
		return images;
	}, {});
}

export const createWebsiteImagesMapReader = (
	cacheStore?: NotionCacheStore<WebsiteImagesQueryResponse>,
	cacheEnabled?: boolean
) =>
	async (): Promise<WebsiteImageMap> => {
		const result = await cachedNotionRead({
			key: WEBSITE_IMAGES_CACHE_KEY,
			op: 'websiteImages.queryActive',
			ttlMs: WEBSITE_IMAGES_CACHE_TTL_MS,
			store: cacheStore,
			enabled: cacheEnabled,
			fetcher: fetchWebsiteImagesResponse
		});

		return toWebsiteImagesMap(result);
	};

export const getWebsiteImagesMap = createWebsiteImagesMapReader();

export async function getWebsiteImageBySlug(slug: WebsiteImageSlug): Promise<WebsiteImageAsset | null> {
	const images = await getWebsiteImagesMap();
	return images[slug]?.[0] || null;
}
