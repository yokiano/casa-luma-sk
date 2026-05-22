import { command } from '$app/server';
import * as v from 'valibot';
import { createSupplierData } from '$lib/server/suppliers';

export const createSupplier = command(
	v.object({
		name: v.string()
	}),
	async ({ name }) => {
		return createSupplierData(name);
	}
);
