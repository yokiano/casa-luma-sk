import { describe, expect, it } from 'vitest';
import { FlexiPassesDatabase } from './db';

describe('FlexiPassesDatabase queryRemapFilter', () => {
	const db = new FlexiPassesDatabase({ notionSecret: 'test-key' });

	it('passes through created_time timestamp filters unchanged', () => {
		const filter = {
			timestamp: 'created_time',
			created_time: { on_or_after: '2026-04-09T00:00:00.000Z' }
		};

		expect((db as any).queryRemapFilter(filter)).toEqual(filter);
	});
});
