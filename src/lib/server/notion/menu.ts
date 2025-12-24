import { notion } from '$lib/server/notion';
import { uploadToNotion } from './upload';

type UpdateMenuVisualsOptions = {
	id: string;
	imageUrl: string;
	gallery?: string[];
};

const MENU_PROPERTIES = {
	image: 'Image',
	gallery: 'Gallery'
} as const;

async function prepareFilePayload(url: string, name: string) {
	// If it's already a Notion URL or not an external URL we want to host, keep as external
	// However, most URLs from Replicate/S3 will expire, so we upload them
	if (url.includes('replicate.delivery') || url.includes('replicate.com') || url.includes('myreplicate.azureedge.net')) {
		try {
			const uploadedFile = await uploadToNotion(url, name);
			return uploadedFile;
		} catch (error) {
			console.error(`Failed to upload ${url} to Notion, falling back to external link:`, error);
		}
	}

	return {
		name,
		type: 'external' as const,
		external: { url }
	};
}

export async function updateMenuItemVisuals({ id, imageUrl, gallery }: UpdateMenuVisualsOptions) {
	const properties: Record<string, any> = {};

	if (imageUrl) {
		const filePayload = await prepareFilePayload(imageUrl, 'Menu Item Image');
		properties[MENU_PROPERTIES.image] = {
			files: [filePayload]
		};
	}

	if (gallery?.length) {
		const galleryFiles = await Promise.all(
			gallery.map((url, index) => prepareFilePayload(url, `Gallery Image ${index + 1}`))
		);
		properties[MENU_PROPERTIES.gallery] = {
			files: galleryFiles
		};
	}

	await notion.pages.update({
		page_id: id,
		properties
	});
}


