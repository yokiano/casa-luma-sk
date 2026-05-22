import { COMPANY_LEDGER_PROP_VALUES } from '$lib/notion-sdk/dbs/company-ledger/constants';
import { getSuppliersData } from '$lib/server/suppliers';

export const load = async () => {
	let suppliers: { id: string; name: string }[] = [];

	try {
		suppliers = await getSuppliersData();
	} catch (e) {
		console.error('close-shift: failed to load suppliers', e);
	}

	return {
		suppliers,
		categories: COMPANY_LEDGER_PROP_VALUES.category as unknown as string[],
		departments: COMPANY_LEDGER_PROP_VALUES.department as unknown as string[]
	};
};
