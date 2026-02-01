import { getSuppliers } from '$lib/suppliers.remote';
import { COMPANY_LEDGER_PROP_VALUES } from '$lib/notion-sdk/dbs/company-ledger/constants';

export const load = async () => {
  const suppliers = await getSuppliers({ search: undefined });

  return {
    suppliers,
    categories: COMPANY_LEDGER_PROP_VALUES.category as unknown as string[],
    departments: COMPANY_LEDGER_PROP_VALUES.department as unknown as string[]
  };
};
