import { getSuppliers } from '$lib/suppliers.remote';
import { COMPANY_LEDGER_PROP_VALUES } from '$lib/notion-sdk/dbs/company-ledger/constants';
import { ExpenseScanRulesDatabase } from '$lib/notion-sdk/dbs/expense-scan-rules/db';
import { NOTION_API_KEY } from '$env/static/private';

export const load = async () => {
  const suppliers = await getSuppliers({ search: undefined });
  const rulesDb = new ExpenseScanRulesDatabase({ notionSecret: NOTION_API_KEY });
  const rules = await rulesDb.query({
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }]
  });

  return {
    suppliers,
    categories: COMPANY_LEDGER_PROP_VALUES.category as unknown as string[],
    departments: COMPANY_LEDGER_PROP_VALUES.department as unknown as string[],
    bankAccounts: COMPANY_LEDGER_PROP_VALUES.bankAccount as unknown as string[],
    paymentMethods: COMPANY_LEDGER_PROP_VALUES.paymentMethod as unknown as string[],
    rules: rules.results.map(r => ({
      match: r.properties["Recipient Match"]?.title?.[0]?.plain_text || '',
      category: r.properties["Category Name"]?.rich_text?.[0]?.plain_text || '',
      department: r.properties["Department Name"]?.rich_text?.[0]?.plain_text || '',
      supplierId: r.properties["Auto-Supplier"]?.relation?.[0]?.id || ''
    })).filter(r => r.match)
  };
};
