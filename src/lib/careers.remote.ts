import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { NOTION_API_KEY } from '$env/static/private';
import { 
	JobOpeningsDatabase,
	JobOpeningsResponseDTO
} from '$lib/notion-sdk/dbs/job-openings';
import { toPojo } from '$lib/serialization';

// Validation schemas
const JobIdSchema = v.pipe(
	v.string(),
	v.minLength(1, 'Job ID is required')
);

/**
 * Get all open job openings sorted by opening date
 */
export const getOpenJobOpenings = query(async () => {
	try {
		const db = new JobOpeningsDatabase({
			notionSecret: NOTION_API_KEY
		});

		const response = await db.query({
			filter: {
				status: { equals: 'Open' }
			},
			sorts: [
				{ property: 'openingDate', direction: 'descending' }
			]
		});

		// Convert DTOs to POJOs for serialization
		return response.results.map(r => toPojo(new JobOpeningsResponseDTO(r)));
	} catch (err) {
		console.error('[CAREERS] Error in getOpenJobOpenings:', err);
		throw err;
	}
});

/**
 * Get a single job opening by ID
 */
export const getJobOpening = query(
	JobIdSchema,
	async (id) => {
		const db = new JobOpeningsDatabase({
			notionSecret: NOTION_API_KEY
		});

		const page = await db.getPage(id);

		if (!page) {
			throw error(404, { message: 'Job opening not found' });
		}

		// Convert DTO to POJO for serialization
		const dto = new JobOpeningsResponseDTO(page);
		console.log('[Server] DTO keys:', Object.keys(dto));
		console.log('[Server] DTO.properties keys:', Object.keys(dto.properties));
		console.log('[Server] pointOfContact from DTO:', (dto.properties as any).pointOfContact);
		const pojo = toPojo(dto);
		console.log('[Server] POJO.properties keys:', Object.keys(pojo.properties));
		console.log('[Server] pointOfContact from POJO:', (pojo.properties as any).pointOfContact);
		// Manually add pointOfContact since toPojo is not extracting it
		(pojo.properties as any).pointOfContact = (dto.properties as any).pointOfContact;
		return pojo;
	}
);
