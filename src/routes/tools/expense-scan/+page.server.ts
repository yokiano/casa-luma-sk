import { getSuppliers } from '$lib/suppliers.remote';
import { EXPENSES_TRACKER_PROP_VALUES } from '$lib/notion-sdk/dbs/expenses-tracker/constants';

export const load = async () => {
  const suppliers = await getSuppliers({ search: undefined });

  return {
    suppliers,
    categories: EXPENSES_TRACKER_PROP_VALUES.category,
    departments: EXPENSES_TRACKER_PROP_VALUES.department
  };
};
