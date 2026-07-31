import { describe, expect, it } from 'vitest';
import {
  UNKNOWN_DEPARTMENT,
  buildFallbackDepartmentMapping,
  departmentToReceiptGroup,
  normalizeCategory
} from './department-mapping';

describe('analytics department mapping', () => {
  it('maps dashboard departments to receipt category groups', () => {
    expect(departmentToReceiptGroup('playground')).toBe('Open Play');
    expect(departmentToReceiptGroup('cafe')).toBe('Cafe');
    expect(departmentToReceiptGroup('store')).toBe('Store');
    expect(departmentToReceiptGroup('workshops')).toBe('Others');
    expect(departmentToReceiptGroup(UNKNOWN_DEPARTMENT)).toBe('Others');
  });

  it('uses the shared fallback category definitions', () => {
    const mapping = buildFallbackDepartmentMapping().categoryToDepartment;

    expect(mapping.get(normalizeCategory('Entry'))).toBe('playground');
    expect(mapping.get(normalizeCategory('Coffee & Friends'))).toBe('cafe');
    expect(mapping.get(normalizeCategory('(store) All'))).toBe('store');
  });
});
