export type ShiftExpenseDraft = {
  id: string;
  title: string;
  amount: number | undefined;
  category: string;
  department: string;
  supplierId: string;
  notes: string;
};

export type ShiftExpensePreset = {
  id: string;
  key: string;
  title: string;
  category: string;
  department: string;
  supplierId?: string;
  useCount: number;
  lastUsedAt: string;
  updatedAt: string;
};

export type ShiftExpenseSubmitInput = {
  id: string;
  title: string;
  amount: number;
  category?: string;
  department?: string;
  supplierId?: string;
  notes?: string;
  shiftDate: string;
  closerName?: string;
  closeShiftReportId?: string;
};
