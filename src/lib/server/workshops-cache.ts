import { NOTION_DBS, notion, validateNotionConfig } from '$lib/server/notion';
import { cachedNotionRead } from '$lib/server/cache/notion-cache';
import { buildNotionCacheKey } from '$lib/server/cache/notion-cache-keys';
import type { NotionCacheStore } from '$lib/server/cache/keyv';

const EVENTS_CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLISHED_STATUS_FILTER = {
	property: 'Status',
	select: { equals: 'Published' }
} as const;

const getEventsDataSourceId = () => {
	validateNotionConfig();
	const dataSourceId = NOTION_DBS.EVENTS;
	if (!dataSourceId) {
		throw new Error('NOTION_EVENTS_DB_ID is not defined');
	}
	return dataSourceId;
};

const getEventsCacheTimeBucket = () => Math.floor(Date.now() / EVENTS_CACHE_TTL_MS);

const bucketedNowIso = () => new Date(getEventsCacheTimeBucket() * EVENTS_CACHE_TTL_MS).toISOString();

const buildUpcomingEventsQuery = (onOrAfter: string) => ({
	filter: {
		and: [
			{
				property: 'Date',
				date: { on_or_after: onOrAfter }
			},
			PUBLISHED_STATUS_FILTER
		]
	},
	sorts: [{ property: 'Date', direction: 'ascending' }]
});

const buildEventBySlugQuery = (slug: string) => ({
	filter: {
		and: [
			{
				property: 'Slug',
				formula: { string: { equals: slug } }
			},
			PUBLISHED_STATUS_FILTER
		]
	}
});

const buildEventsByTypeQuery = (eventType: string, onOrAfter: string) => ({
	filter: {
		and: [
			{
				property: 'Event Type',
				select: { equals: eventType }
			},
			PUBLISHED_STATUS_FILTER,
			{
				property: 'Date',
				date: { on_or_after: onOrAfter }
			}
		]
	},
	sorts: [{ property: 'Date', direction: 'ascending' }]
});

const buildEventsByDateRangeQuery = (startDate: string, endDate: string, eventType?: string) => {
	const filters: Record<string, unknown>[] = [
		PUBLISHED_STATUS_FILTER,
		{
			property: 'Date',
			date: { on_or_after: startDate }
		},
		{
			property: 'Date',
			date: { before: endDate }
		}
	];

	if (eventType && eventType !== 'All') {
		filters.push({
			property: 'Event Type',
			select: { equals: eventType }
		});
	}

	return {
		filter: { and: filters },
		sorts: [{ property: 'Date', direction: 'ascending' }]
	};
};

const fetchUpcomingEventPages = async () => {
	const response = await notion.dataSources.query({
		data_source_id: getEventsDataSourceId(),
		...buildUpcomingEventsQuery(new Date().toISOString())
	});
	return response.results;
};

const fetchEventPagesBySlug = async (slug: string) => {
	const response = await notion.dataSources.query({
		data_source_id: getEventsDataSourceId(),
		...buildEventBySlugQuery(slug)
	});
	return response.results;
};

const fetchEventPagesByType = async (eventType: string) => {
	const response = await notion.dataSources.query({
		data_source_id: getEventsDataSourceId(),
		...buildEventsByTypeQuery(eventType, new Date().toISOString())
	});
	return response.results;
};

const fetchEventPagesByDateRange = async ({
	startDate,
	endDate,
	eventType
}: {
	startDate: string;
	endDate: string;
	eventType?: string;
}) => {
	const response = await notion.dataSources.query({
		data_source_id: getEventsDataSourceId(),
		...buildEventsByDateRangeQuery(startDate, endDate, eventType)
	});
	return response.results;
};

export const createUpcomingEventPagesReader = (
	cacheStore?: NotionCacheStore<unknown[]>,
	cacheEnabled?: boolean
) =>
	async () => {
		const dataSourceId = getEventsDataSourceId();
		const bucket = getEventsCacheTimeBucket();
		return cachedNotionRead({
			key: buildNotionCacheKey({
				operation: 'events.queryUpcoming',
				id: dataSourceId,
				params: {
					...buildUpcomingEventsQuery(bucketedNowIso()),
					bucket
				}
			}),
			op: 'events.queryUpcoming',
			ttlMs: EVENTS_CACHE_TTL_MS,
			store: cacheStore,
			enabled: cacheEnabled,
			fetcher: fetchUpcomingEventPages
		});
	};

export const createEventPagesBySlugReader = (
	cacheStore?: NotionCacheStore<unknown[]>,
	cacheEnabled?: boolean
) =>
	async (slug: string) => {
		const dataSourceId = getEventsDataSourceId();
		return cachedNotionRead({
			key: buildNotionCacheKey({
				operation: 'events.queryBySlug',
				id: dataSourceId,
				params: buildEventBySlugQuery(slug)
			}),
			op: 'events.queryBySlug',
			ttlMs: EVENTS_CACHE_TTL_MS,
			store: cacheStore,
			enabled: cacheEnabled,
			fetcher: () => fetchEventPagesBySlug(slug)
		});
	};

export const createEventPagesByTypeReader = (
	cacheStore?: NotionCacheStore<unknown[]>,
	cacheEnabled?: boolean
) =>
	async (eventType: string) => {
		const dataSourceId = getEventsDataSourceId();
		const bucket = getEventsCacheTimeBucket();
		return cachedNotionRead({
			key: buildNotionCacheKey({
				operation: 'events.queryByType',
				id: dataSourceId,
				params: {
					...buildEventsByTypeQuery(eventType, bucketedNowIso()),
					bucket
				}
			}),
			op: 'events.queryByType',
			ttlMs: EVENTS_CACHE_TTL_MS,
			store: cacheStore,
			enabled: cacheEnabled,
			fetcher: () => fetchEventPagesByType(eventType)
		});
	};

export const createEventPagesByDateRangeReader = (
	cacheStore?: NotionCacheStore<unknown[]>,
	cacheEnabled?: boolean
) =>
	async ({
		startDate,
		endDate,
		eventType
	}: {
		startDate: string;
		endDate: string;
		eventType?: string;
	}) => {
		const dataSourceId = getEventsDataSourceId();
		return cachedNotionRead({
			key: buildNotionCacheKey({
				operation: 'events.queryByDateRange',
				id: dataSourceId,
				params: buildEventsByDateRangeQuery(startDate, endDate, eventType)
			}),
			op: 'events.queryByDateRange',
			ttlMs: EVENTS_CACHE_TTL_MS,
			store: cacheStore,
			enabled: cacheEnabled,
			fetcher: () => fetchEventPagesByDateRange({ startDate, endDate, eventType })
		});
	};
