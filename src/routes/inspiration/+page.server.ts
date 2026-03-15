import { getWebsiteImageBySlug } from '$lib/server/website-images';
import type { PageServerLoad } from './$types';

const INSPIRATION_HERO_IMAGE_SLUG = 'home-page-hero-image';

export const load: PageServerLoad = async () => {
	const heroImage = await getWebsiteImageBySlug(INSPIRATION_HERO_IMAGE_SLUG, 'Hero');

	return {
		heroImage
	};
};
