export function normalizeExpenseText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function getShiftExpensePresetKey(input: {
  title: string;
  supplierId?: string;
  category?: string;
  department?: string;
}) {
  const title = normalizeExpenseText(input.title);
  const supplier = input.supplierId?.trim() || 'no-supplier';
  const category = normalizeExpenseText(input.category || '');
  const department = normalizeExpenseText(input.department || '');

  return [title, supplier, category, department].filter(Boolean).join('|');
}

export function getShiftExpenseTitleMatchKey(title: string) {
  return normalizeExpenseText(title);
}
