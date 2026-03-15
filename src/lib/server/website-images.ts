import { NOTION_API_KEY } from '$env/static/private';
import {
	WebsiteImagesDatabase,
	WebsiteImagesResponseDTO,
	type WebsiteImagesSectionPropertyType
} from '$lib/notion-sdk/dbs/website-images';

export type WebsiteImageSlug = string;

export type WebsiteImageAsset = {
	id: string;
	slug: WebsiteImageSlug;
	src: string;
	alt: string;
	name: string;
	section: WebsiteImagesSectionPropertyType | null;
	notionUrl: string;
};

export type WebsiteImageMap = Record<WebsiteImageSlug, WebsiteImageAsset>;

const websiteImagesDb = new WebsiteImagesDatabase({ notionSecret: NOTION_API_KEY });

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

export async function getWebsiteImagesMap(section?: WebsiteImagesSectionPropertyType): Promise<WebsiteImageMap> {
	const result = await websiteImagesDb.query({
		filter: section
			? {
				and: [{ active: { equals: true } }, { section: { equals: section } }]
			}
			: { active: { equals: true } },
		sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
		page_size: 100
	});

	return result.results.reduce<WebsiteImageMap>((images, image) => {
		const asset = toWebsiteImageAsset(new WebsiteImagesResponseDTO(image));
		if (asset) {
			images[asset.slug] = asset;
		}
		return images;
	}, {});
}

export async function getWebsiteImageBySlug(
	slug: WebsiteImageSlug,
	section?: WebsiteImagesSectionPropertyType
): Promise<WebsiteImageAsset | null> {
	const images = await getWebsiteImagesMap(section);
	return images[slug] || null;
}
