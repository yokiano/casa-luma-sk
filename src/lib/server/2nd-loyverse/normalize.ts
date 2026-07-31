/** Unicode NFC, trim, collapse whitespace, case-fold for entity name matching. */
export const normalizeEntityName = (value?: string | null): string => {
  if (!value) return '';
  return value
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
};

export const namesEqual = (a?: string | null, b?: string | null): boolean =>
  normalizeEntityName(a) === normalizeEntityName(b) && normalizeEntityName(a).length > 0;

export const variantOptionTupleKey = (values: Array<string | null | undefined>): string =>
  values.map((value) => normalizeEntityName(value ?? '')).join('\u0001');

export const roughlyEqualNumber = (a?: number | null, b?: number | null, epsilon = 0.0001): boolean => {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= epsilon;
};
