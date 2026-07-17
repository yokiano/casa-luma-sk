export type ExpenseScanRule = {
  id: string;
  match: string;
  category: string;
  department: string;
  supplierId: string;
};

/** Keep rule matching identical to the expense-scan UI. */
export const normalizeExpenseScanMatch = (value: string) => value.toLowerCase().replace(/\s+/g, '');

export const findMatchingExpenseScanRule = (recipientName: string | undefined, rules: readonly ExpenseScanRule[]) => {
  if (!recipientName) return undefined;
  const normalizedRecipient = normalizeExpenseScanMatch(recipientName);
  if (!normalizedRecipient) return undefined;

  return rules.find((rule) => {
    const matchPattern = normalizeExpenseScanMatch(rule.match);
    return Boolean(matchPattern) && normalizedRecipient.includes(matchPattern);
  });
};
