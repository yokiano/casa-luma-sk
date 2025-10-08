import { notion } from '$lib/server/notion';

type UpdateMenuVisualsOptions = {
	id: string;
	imageUrl: string;
	gallery?: string[];
};

const MENU_PROPERTIES = {
	image: 'Image',
	gallery: 'Gallery'
} as const;

const buildFilesPayload = (urls: string[]) =>
	urls.map((url, index) => ({
		name: `Image ${index + 1}`,
		type: 'external' as const,
		external: { url }
	}));

export async function updateMenuItemVisuals({ id, imageUrl, gallery }: UpdateMenuVisualsOptions) {
	const properties: Record<string, any> = {};

	if (imageUrl) {
		properties[MENU_PROPERTIES.image] = {
			files: [
				{
					name: 'Menu Item Image',
					type: 'external',
					external: { url: imageUrl }
				}
			]
		};
	}

	if (gallery?.length) {
		properties[MENU_PROPERTIES.gallery] = {
			files: gallery.map((url, index) => ({
				name: `Gallery Image ${index + 1}`,
				type: 'external',
				external: { url }
			}))
		};
	}

	await notion.pages.update({
		page_id: id,
		properties
	});
}


