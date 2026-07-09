import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGetMembershipsDataReader } from '$lib/server/memberships-cache';

class MemoryStore<T = unknown> {
	private values = new Map<string, T>();
	async get<V = T>(key: string) {
		const value = this.values.get(key);
		return value === undefined ? undefined : (structuredClone(value) as unknown as V);
	}
	async set(key: string, value: T) {
		this.values.set(key, structuredClone(value));
		return true;
	}
}

describe('memberships live integration', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('loads recent memberships without throwing', async () => {
		const readMemberships = createGetMembershipsDataReader(new MemoryStore(), false);
		const result = await readMemberships({});
		expect(Array.isArray(result.items)).toBe(true);
	}, 60_000);

	it('serializes memberships for remote transport', async () => {
		const devalue = await import('devalue');
		const readMemberships = createGetMembershipsDataReader(new MemoryStore(), false);
		const result = await readMemberships({});
		expect(() => devalue.stringify(result)).not.toThrow();
	}, 60_000);
});
