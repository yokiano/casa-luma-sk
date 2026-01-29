# Casa Luma Payroll System - Logic & Calculation Guide

This document explains the internal logic and mathematical formulas used by the Casa Luma bi-monthly payroll generator.

> **CRITICAL:** This document is the source of truth for payroll logic. Any changes to the code (`src/lib/salary.ts`) **MUST** be reflected in this document simultaneously.

---

## 1. Core Principles

The system operates on a **bi-monthly independent period model**.
- **Period 1:** 1st to 15th of the month.
- **Period 2:** 16th to the end of the month.

Each period is calculated based on its own attendance data, but shares a monthly "Source of Truth" for base salary and Social Security (SSF) caps.

---

## 2. Key Constants (Thai LPA Standards)

| Constant | Value | Description |
| --- | --- | --- |
| **Standard Month** | 30 Days | The divisor used for all monthly staff to calculate daily rates. |
| **Standard Day** | 8 Hours | Standard working hours used to calculate hourly rates. |
| **SSF Rate** | 5% | Social Security Fund contribution rate. |
| **SSF Cap** | 750 THB | Maximum monthly deduction (based on 15,000 THB max salary). |
| **OT Multiplier** | 1.5x | All overtime hours are currently calculated at a fixed 1.5x rate for all staff. |

---

## 3. The Calculation Flow

### A. Base Rates
1. **Daily Rate** = `Monthly Salary / 30`
2. **Hourly Rate** = `Daily Rate / 8`

### B. Period Base Salary
The system uses a **50% Fixed Base** model:
- Every period (Run 1 or Run 2) starts with a credit of exactly `Monthly Salary / 2`.
- This ensures that if an employee has perfect attendance, they receive exactly 100% of their salary at the end of the month, regardless of whether the month has 28 or 31 days.

### C. Attendance Deductions
Deductions are subtracted from the 50% base based on the **Attendance Review**:
1. **Unpaid Days:** Any day marked as "Unpaid Leave", "Absent", or "No Data" results in a deduction of `1 * Daily Rate`.
2. **Late/Early Out:** Any hours manually entered as "Hours Absent" result in a deduction of `Hours * Hourly Rate`.

### D. Overtime (OT)
- **OT Pay** = `Total OT Hours in Period * Hourly Rate * 1.5`.
- Note: While the UI allows selecting different OT types (1.0, 3.0), the current business rule overrides this to **1.5x** for all hours.

### E. Social Security (SSF)
- **Applicable Run:** Only calculated during the **End-of-Month (Run 2)**.
- **Calculation:** `min(Monthly Salary, 15000) * 0.05`, rounded to the nearest THB.
- **Toggle:** Can be disabled via the "Include SSF" checkbox in the UI.

### F. Adjustments (Notion Integration)
Adjustments are fetched from the Notion "Salary Adjustments" database and applied based on type:
- **Additions:** Bonus, Reimbursement.
- **Subtractions:** Advance, Deduction, Loan Repayment, Late Penalty.

---

## 4. Final Formulas

### Total Gross Earned (Period)
`Gross = (Monthly Salary / 2) + OT Pay + Bonuses - Attendance Deductions - Regular Deductions`

### Net Payout (Period)
`Net = Gross - SSF (if Run 2) - Salary Advances`

---

## 5. Visual Indicators in UI

- **Business Day-Off:** (Typically Wednesday) Marked as "Biz Off" and is **paid by default**.
- **Shift Data:** Days found in the Notion "Shifts" database are marked with a blue "Shift" badge and inherit their status automatically.
- **Manual Overrides:** Any manual change to a day's status or OT in the UI is immediately reflected in the reactive calculation.

---

## 6. Maintenance Note
The calculation engine is located in `src/lib/salary.ts`. When updating logic:
1. Update `SalaryResult` type if new metrics are added.
2. Update `calculateSalary` function.
3. Update this document.
4. Verify the `Payslip.svelte` component correctly displays the new logic.
