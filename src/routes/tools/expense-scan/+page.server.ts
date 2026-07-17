import { getSuppliersData } from '$lib/server/suppliers';
import { COMPANY_LEDGER_PROP_VALUES } from '$lib/notion-sdk/dbs/company-ledger/constants';
import { loadExpenseScanRules } from '$lib/server/expense-scan-rules';

export const load = async () => {
  const suppliers = await getSuppliersData();
  const rules = await loadExpenseScanRules();

  const expenseTypes = (COMPANY_LEDGER_PROP_VALUES.type as readonly string[]).filter((type) =>
    type.toLowerCase().includes('expense')
  );

  return {
    suppliers,
    categories: COMPANY_LEDGER_PROP_VALUES.category as unknown as string[],
    departments: COMPANY_LEDGER_PROP_VALUES.department as unknown as string[],
    bankAccounts: COMPANY_LEDGER_PROP_VALUES.bankAccount as unknown as string[],
    paymentMethods: COMPANY_LEDGER_PROP_VALUES.paymentMethod as unknown as string[],
    expenseTypes,
    rules
  };
};
