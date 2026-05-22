import type { ShiftExpenseDraft, ShiftExpensePreset } from './types';
import { getShiftExpensePresetKey, getShiftExpenseTitleMatchKey } from './normalize';

export function presetToDraft(preset: ShiftExpensePreset): ShiftExpenseDraft {
  return {
    id: crypto.randomUUID(),
    title: preset.title,
    amount: undefined,
    category: preset.category,
    department: preset.department,
    supplierId: preset.supplierId || '',
    notes: ''
  };
}

export function upsertPresetFromDraft(
  presets: ShiftExpensePreset[],
  draft: ShiftExpenseDraft
): ShiftExpensePreset[] {
  if (!draft.title.trim() || !draft.category || !draft.department) return presets;

  const now = new Date().toISOString();
  const key = getShiftExpensePresetKey({
    title: draft.title,
    supplierId: draft.supplierId,
    category: draft.category,
    department: draft.department
  });

  const existing = presets.find((preset) => preset.key === key);
  if (existing) {
    return presets.map((preset) =>
      preset.key === key
        ? {
            ...preset,
            title: draft.title.trim(),
            category: draft.category,
            department: draft.department,
            supplierId: draft.supplierId || undefined,
            useCount: (preset.useCount || 0) + 1,
            lastUsedAt: now,
            updatedAt: now
          }
        : preset
    );
  }

  return [
    {
      id: crypto.randomUUID(),
      key,
      title: draft.title.trim(),
      category: draft.category,
      department: draft.department,
      supplierId: draft.supplierId || undefined,
      useCount: 1,
      lastUsedAt: now,
      updatedAt: now
    },
    ...presets
  ];
}

export function findPresetForTitle(presets: ShiftExpensePreset[], title: string) {
  const matchKey = getShiftExpenseTitleMatchKey(title);
  if (!matchKey) return undefined;

  return presets
    .filter((preset) => getShiftExpenseTitleMatchKey(preset.title) === matchKey)
    .sort((a, b) => {
      const usageDiff = (b.useCount || 0) - (a.useCount || 0);
      if (usageDiff !== 0) return usageDiff;
      return (b.lastUsedAt || '').localeCompare(a.lastUsedAt || '');
    })[0];
}

export function sortPresetsForPicker(presets: ShiftExpensePreset[]) {
  return [...presets].sort((a, b) => {
    const recent = (b.lastUsedAt || '').localeCompare(a.lastUsedAt || '');
    if (recent !== 0) return recent;
    return (b.useCount || 0) - (a.useCount || 0);
  });
}
