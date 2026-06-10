import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotionCacheStore } from '$lib/server/cache/keyv';

const queryMock = vi.hoisted(() => vi.fn());

vi.mock('$env/static/private', () => ({ NOTION_API_KEY: 'test-notion-key' }));
vi.mock('$lib/notion-sdk/dbs/website-images/db', () => ({
	WebsiteImagesDatabase: vi.fn().mockImplementation(() => ({ query: queryMock }))
}));

class MemoryStore<T = unknown> implements NotionCacheStore<T> {
	private values = new Map<string, T>();

	async get<V = T>(key: string): Promise<V | undefined> {
		const value = this.values.get(key);
		return value === undefined ? undefined : structuredClone(value) as unknown as V;
	}

	async set(key: string, value: T): Promise<boolean> {
		this.values.set(key, structuredClone(value));
		return true;
	}
}

const page = (id: string, slug: string, imageUrl: string, altText = 'Alt text') => ({
	id,
	url: `https://notion.test/${id}`,
	properties: {
		Page: { select: { name: 'Home' } },
		Active: { checkbox: true },
		'Alt Text': { rich_text: [{ plain_text: altText, href: null }] },
		Image: { files: [{ type: 'external', external: { url: imageUrl } }] },
		Name: { title: [{ plain_text: `Image ${slug}`, href: null }] },
		slug: { rich_text: [{ plain_text: slug, href: null }] }
	}
});

describe('website-images cache integration', () => {
	beforeEach(() => {
		queryMock.mockReset();
	});

	it('uses the Notion read cache so repeated calls avoid the database query', async () => {
		const { createWebsiteImagesMapReader } = await import('./website-images');
		const store = new MemoryStore<Awaited<ReturnType<typeof queryMock>>>();
		const readImages = createWebsiteImagesMapReader(store, true);
		queryMock.mockResolvedValue({ results: [page('page-a', 'hero', 'https://img.test/hero.jpg')] });

		const first = await readImages();
		const second = await readImages();

		expect(first.hero?.[0]).toMatchObject({
			id: 'page-a',
			slug: 'hero',
			src: 'https://img.test/hero.jpg',
			alt: 'Alt text'
		});
		expect(second).toEqual(first);
		expect(queryMock).toHaveBeenCalledOnce();
	});

	it('bypasses the persistent cache when the kill switch is disabled', async () => {
		const { createWebsiteImagesMapReader } = await import('./website-images');
		const store = new MemoryStore<Awaited<ReturnType<typeof queryMock>>>();
		const readImages = createWebsiteImagesMapReader(store, false);
		queryMock.mockResolvedValue({ results: [page('page-a', 'hero', 'https://img.test/hero.jpg')] });

		await readImages();
		await readImages();

		expect(queryMock).toHaveBeenCalledTimes(2);
	});
});
