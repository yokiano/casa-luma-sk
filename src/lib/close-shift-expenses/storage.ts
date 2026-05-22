import type { ShiftExpensePreset } from './types';

export const SHIFT_EXPENSE_PRESETS_STORAGE_KEY = 'casa-luma.close-shift-expense-presets.v1';
export const MAX_SHIFT_EXPENSE_PRESETS = 30;

export function loadShiftExpensePresets(): ShiftExpensePreset[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const raw = localStorage.getItem(SHIFT_EXPENSE_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPreset);
  } catch {
    return [];
  }
}

export function saveShiftExpensePresets(presets: ShiftExpensePreset[]) {
  if (typeof localStorage === 'undefined') return;

  const trimmed = [...presets]
    .sort((a, b) => {
      const usageDiff = (b.useCount || 0) - (a.useCount || 0);
      if (usageDiff !== 0) return usageDiff;
      return (b.lastUsedAt || '').localeCompare(a.lastUsedAt || '');
    })
    .slice(0, MAX_SHIFT_EXPENSE_PRESETS);

  try {
    localStorage.setItem(SHIFT_EXPENSE_PRESETS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Presets are convenience only.
  }
}

function isValidPreset(value: unknown): value is ShiftExpensePreset {
  if (!value || typeof value !== 'object') return false;
  const preset = value as Partial<ShiftExpensePreset>;
  return Boolean(preset.id && preset.key && preset.title && preset.category && preset.department);
}
