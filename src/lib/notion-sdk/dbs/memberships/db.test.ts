import { describe, expect, it } from 'vitest';
import { MembershipsDatabase } from './db';

describe('MembershipsDatabase queryRemapFilter', () => {
	const db = new MembershipsDatabase({ notionSecret: 'test-key' });

	it('passes through created_time timestamp filters unchanged', () => {
		const filter = {
			timestamp: 'created_time',
			created_time: { on_or_after: '2026-04-09T00:00:00.000Z' }
		};

		expect((db as any).queryRemapFilter(filter)).toEqual(filter);
	});
});
