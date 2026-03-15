import { getWebsiteImagesMap } from '$lib/server/website-images';

export const load = async () => {
	const websiteImages = await getWebsiteImagesMap();

	return {
		websiteImages
	};
};
