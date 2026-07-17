import { describe, expect, it } from 'vitest';
import { findMatchingExpenseScanRule } from './rules';

const rules = [
  { id: 'makto', match: 'Makto', category: 'Food & Groceries', department: 'Cafe', supplierId: 'supplier-1' },
  { id: 'fruit', match: 'Fruit', category: 'Consumable Product', department: 'General', supplierId: '' }
];

describe('expense-scan rule matching', () => {
  it('matches case-insensitively and ignores whitespace like the OCR flow', () => {
    expect(findMatchingExpenseScanRule('Mak to Supermarket', rules)?.id).toBe('makto');
  });

  it('keeps the first matching rule and does not fuzzy-match different names', () => {
    expect(findMatchingExpenseScanRule('Makto', rules)?.id).toBe('makto');
    expect(findMatchingExpenseScanRule('Makro', rules)).toBeUndefined();
  });
});
