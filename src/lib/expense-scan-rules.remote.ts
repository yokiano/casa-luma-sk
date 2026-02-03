import { command } from '$app/server';
import * as v from 'valibot';
import { NOTION_API_KEY } from '$env/static/private';
import { ExpenseScanRulesDatabase } from '$lib/notion-sdk/dbs/expense-scan-rules/db';
import { ExpenseScanRulesPatchDTO } from '$lib/notion-sdk/dbs/expense-scan-rules/patch.dto';

const SaveRuleSchema = v.object({
  recipientMatch: v.string(),
  categoryName: v.string(),
  departmentName: v.string(),
  autoSupplierId: v.optional(v.string())
});

export const saveExpenseScanRule = command(SaveRuleSchema, async (data) => {
  const db = new ExpenseScanRulesDatabase({
    notionSecret: NOTION_API_KEY
  });

  const response = await db.createPage(
    new ExpenseScanRulesPatchDTO({
      properties: {
        recipientMatch: data.recipientMatch,
        categoryName: data.categoryName,
        departmentName: data.departmentName,
        autoSupplier: data.autoSupplierId ? [{ id: data.autoSupplierId }] : undefined
      }
    })
  );

  return { id: response.id };
});
