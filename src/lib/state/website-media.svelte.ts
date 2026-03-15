import type { WebsiteImageAsset, WebsiteImageMap, WebsiteImageSlug } from '$lib/types/website-media';

export class WebsiteMediaState {
	images = $state<WebsiteImageMap>({});

	constructor(images: WebsiteImageMap = {}) {
		this.images = images;
	}

	setImages(images: WebsiteImageMap) {
		this.images = images;
	}

	getAll(slug: WebsiteImageSlug): WebsiteImageAsset[] {
		return this.images[slug] || [];
	}

	get(slug: WebsiteImageSlug): WebsiteImageAsset | null {
		return this.getAll(slug)[0] || null;
	}

	has(slug: WebsiteImageSlug): boolean {
		return this.getAll(slug).length > 0;
	}

	get all() {
		return this.images;
	}

	get count() {
		return Object.keys(this.images).length;
	}
}
