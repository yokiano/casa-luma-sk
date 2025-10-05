// Casa Luma Workshop Remote Functions
import { query, command } from '$app/server';
import { error } from '@sveltejs/kit';
import { notion, NOTION_DBS, validateNotionConfig } from '$lib/server/notion';
import * as v from 'valibot';
import type { Event, RSVPFormData, RSVPResponse } from '$lib/types/workshops';
import {
	getTextContent,
	getSelectValue,
	getNumberValue,
	getDateValue,
	getMultiSelectValues,
	getFilesUrls,
	getRollupNumber,
	getFormulaValue,
	getPeopleNames
} from '$lib/server/notion';

// Validation schemas
const SlugSchema = v.pipe(
	v.string(),
	v.minLength(1, 'Slug is required'),
	v.maxLength(200, 'Slug too long')
);

const RSVPFormSchema = v.object({
	eventId: v.pipe(v.string(), v.minLength(1)),
	guestName: v.pipe(v.string(), v.minLength(2), v.maxLength(100)),
	email: v.pipe(v.string(), v.email()),
	phone: v.optional(v.string()),
	numberOfGuests: v.pipe(v.number(), v.minValue(1), v.maxValue(10)),
	dietaryRestrictions: v.optional(v.array(v.string())),
	notes: v.optional(v.string()),
	source: v.optional(v.string()),
	acceptTerms: v.literal(true, 'You must accept terms and conditions')
});

// Transform Notion page to Event
const transformNotionPageToEvent = (page: any): Event => {
	const props = page.properties;

	return {
		id: page.id,
		eventName: getTextContent(props['Event Name']),
		slug: getFormulaValue(props['Slug']) as string,
		eventType: getSelectValue(props['Event Type']) as any,
		date: getDateValue(props['Date']) || '',
		endDate: getDateValue(props['End Date']),
		description: getTextContent(props['Description']),
		shortDescription: getTextContent(props['Short Description']),
		instructor: getPeopleNames(props['Instructor']).join(', ') || 'TBD',
		capacity: getNumberValue(props['Capacity']),
		currentAttendees: getRollupNumber(props['Current Attendees']),
		availableSpots: getFormulaValue(props['Available Spots']) as number,
		status: getSelectValue(props['Status']) as any,
		registrationStatus: getSelectValue(props['Registration Status']) as any,
		price: getNumberValue(props['Price']),
		location: getSelectValue(props['Location']) as any,
		featuredImage: getFilesUrls(props['Featured Image'])[0],
		gallery: getFilesUrls(props['Gallery']),
		tags: getMultiSelectValues(props['Tags']),
		language: getSelectValue(props['Language']) as any,
		requirements: getTextContent(props['Requirements']),
		created: page.created_time,
		updated: page.last_edited_time
	};
};

/**
 * Get all upcoming published events
 */
export const getUpcomingEvents = query(async () => {
	validateNotionConfig();

	const response = await notion.dataSources.query({
		data_source_id: NOTION_DBS.EVENTS,
		filter: {
			and: [
				{
					property: 'Date',
					date: { on_or_after: new Date().toISOString() }
				},
				{
					property: 'Status',
					select: { equals: 'Published' }
				}
			]
		},
		sorts: [{ property: 'Date', direction: 'ascending' }]
	});

	return response.results.map(transformNotionPageToEvent);
});

/**
 * Get single event by slug
 */
export const getEvent = query(SlugSchema, async (slug) => {
	validateNotionConfig();

	const response = await notion.dataSources.query({
		data_source_id: NOTION_DBS.EVENTS,
		filter: {
			and: [
				{
					property: 'Slug',
					formula: { string: { equals: slug } }
				},
				{
					property: 'Status',
					select: { equals: 'Published' }
				}
			]
		}
	});

	if (response.results.length === 0) {
		throw error(404, { message: 'Event not found' });
	}

	return transformNotionPageToEvent(response.results[0]);
});

/**
 * Get all events (admin view - includes drafts)
 */
export const getAllEvents = query(async () => {
	validateNotionConfig();

	const response = await notion.dataSources.query({
		data_source_id: NOTION_DBS.EVENTS,
		sorts: [{ property: 'Date', direction: 'descending' }]
	});

	return response.results.map(transformNotionPageToEvent);
});

/**
 * Get events by type
 */
export const getEventsByType = query(
	v.pipe(v.string(), v.minLength(1)),
	async (eventType) => {
		validateNotionConfig();

		const response = await notion.dataSources.query({
			data_source_id: NOTION_DBS.EVENTS,
			filter: {
				and: [
					{
						property: 'Event Type',
						select: { equals: eventType }
					},
					{
						property: 'Status',
						select: { equals: 'Published' }
					},
					{
						property: 'Date',
						date: { on_or_after: new Date().toISOString() }
					}
				]
			},
			sorts: [{ property: 'Date', direction: 'ascending' }]
		});

		return response.results.map(transformNotionPageToEvent);
	}
);

/**
 * Get events by date range
 */
export const getEventsByDateRange = query(
	v.object({
		startDate: v.pipe(v.string(), v.isoDateTime()),
		endDate: v.pipe(v.string(), v.isoDateTime()),
		eventType: v.optional(v.pipe(v.string(), v.minLength(1)))
	}),
	async ({ startDate, endDate, eventType }) => {
		validateNotionConfig();

		const filters: any[] = [
			{
				property: 'Status',
				select: { equals: 'Published' }
			},
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

		const response = await notion.dataSources.query({
			data_source_id: NOTION_DBS.EVENTS,
			filter: {
				and: filters
			},
			sorts: [{ property: 'Date', direction: 'ascending' }]
		});

		return response.results.map(transformNotionPageToEvent);
	}
);

/**
 * Submit RSVP
 */
export const submitRSVP = command(RSVPFormSchema, async (data) => {
	validateNotionConfig();

	// Check if event exists and has available spots
	const event = await notion.pages.retrieve({ page_id: data.eventId });

	if (!event) {
		throw error(404, { message: 'Event not found' });
	}

	// Check for duplicate RSVP (same email for same event)
	const existingRSVPs = await notion.dataSources.query({
		data_source_id: NOTION_DBS.RSVPS,
		filter: {
			and: [
				{
					property: 'Event',
					relation: { contains: data.eventId }
				},
				{
					property: 'Email',
					email: { equals: data.email }
				},
				{
					property: 'Status',
					select: { does_not_equal: 'Cancelled' }
				}
			]
		}
	});

	if (existingRSVPs.results.length > 0) {
		return {
			success: false,
			message: 'You have already registered for this event with this email address'
		} satisfies RSVPResponse;
	}

	// Generate RSVP ID
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8).toUpperCase();
	const rsvpId = `RSVP-${timestamp}-${random}`;

	// Create RSVP in Notion
	await notion.pages.create({
		parent: { data_source_id: NOTION_DBS.RSVPS },
		properties: {
			'RSVP ID': {
				title: [{ text: { content: rsvpId } }]
			},
			Event: {
				relation: [{ id: data.eventId }]
			},
			'Guest Name': {
				rich_text: [{ text: { content: data.guestName } }]
			},
			Email: {
				email: data.email
			},
			...(data.phone && {
				Phone: {
					phone_number: data.phone
				}
			}),
			'Number of Guests': {
				number: data.numberOfGuests
			},
			Status: {
				select: { name: 'Confirmed' }
			},
			'Payment Status': {
				select: { name: 'N/A' }
			},
			...(data.notes && {
				Notes: {
					rich_text: [{ text: { content: data.notes } }]
				}
			}),
			...(data.dietaryRestrictions &&
				data.dietaryRestrictions.length > 0 && {
					'Dietary Restrictions': {
						multi_select: data.dietaryRestrictions.map((restriction) => ({
							name: restriction
						}))
					}
				}),
			...(data.source && {
				Source: {
					select: { name: data.source }
				}
			}),
			'Check-in Status': {
				checkbox: false
			}
		}
	});

	return {
		success: true,
		message: 'RSVP submitted successfully! You will receive a confirmation email shortly.',
		rsvp: {
			id: rsvpId,
			rsvpId,
			eventId: data.eventId,
			guestName: data.guestName,
			email: data.email,
			phone: data.phone,
			numberOfGuests: data.numberOfGuests,
			status: 'Confirmed',
			paymentStatus: 'N/A',
			notes: data.notes,
			dietaryRestrictions: data.dietaryRestrictions as any,
			source: data.source as any,
			createdAt: new Date().toISOString(),
			checkInStatus: false
		}
	} satisfies RSVPResponse;
});

