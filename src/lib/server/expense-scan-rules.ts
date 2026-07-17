import { NOTION_API_KEY } from '$env/static/private';
import { ExpenseScanRulesDatabase } from '$lib/notion-sdk/dbs/expense-scan-rules/db';
import { findMatchingExpenseScanRule, type ExpenseScanRule } from '$lib/expense-scan/rules';

const plainText = (property: unknown) => {
  if (!property || typeof property !== 'object') return '';
  const candidate = property as { title?: Array<{ plain_text?: string }>; rich_text?: Array<{ plain_text?: string }> };
  return [...(candidate.title ?? []), ...(candidate.rich_text ?? [])]
    .map((part) => part.plain_text ?? '')
    .join('')
    .trim();
};

const supplierId = (property: unknown) => {
  if (!property || typeof property !== 'object') return '';
  const relation = (property as { relation?: Array<{ id?: string }> }).relation;
  return relation?.[0]?.id ?? '';
};

/** Loads the same Notion rules used by the expense-scan screen. */
export const loadExpenseScanRules = async (): Promise<ExpenseScanRule[]> => {
  const db = new ExpenseScanRulesDatabase({ notionSecret: NOTION_API_KEY });
  const response = await db.query({
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }]
  });

  return response.results.map((page) => ({
    id: page.id,
    match: plainText(page.properties['Recipient Match']),
    category: plainText(page.properties['Category Name']),
    department: plainText(page.properties['Department Name']),
    supplierId: supplierId(page.properties['Auto-Supplier'])
  })).filter((rule) => rule.match);
};

export const findExpenseScanRule = async (recipientName: string | undefined) => {
  const rules = await loadExpenseScanRules();
  return findMatchingExpenseScanRule(recipientName, rules);
};
