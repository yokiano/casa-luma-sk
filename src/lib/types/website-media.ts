export type WebsiteImageSlug = string;

export type WebsiteImageAsset = {
	id: string;
	slug: WebsiteImageSlug;
	src: string;
	alt: string;
	name: string;
	section: string | null;
	notionUrl: string;
};

export type WebsiteImageMap = Record<WebsiteImageSlug, WebsiteImageAsset[]>;
