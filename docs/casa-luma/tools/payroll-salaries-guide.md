# Casa Luma Payroll System - Logic & Calculation Guide

This document explains the internal logic and mathematical formulas used by the Casa Luma bi-monthly payroll generator.

> **CRITICAL:** This document is the source of truth for payroll logic. Any changes to the code (`src/lib/salary.ts`) **MUST** be reflected in this document simultaneously.

---

## 1. Core Principles

The system operates on a **bi-monthly independent period model**.
- **Period 1:** 1st to 15th of the month.
- **Period 2:** 16th to the end of the month.

Each period is calculated based on its own attendance data, but shares a monthly "Source of Truth" for base salary.

---

## 2. Key Constants (Thai LPA Standards)

| Constant | Value | Description |
| --- | --- | --- |
| **Standard Month** | 30 Days | The divisor used for all monthly staff to calculate daily rates. |
| **Standard Day** | 8 Hours | Standard working hours used to calculate hourly rates. |
| **SSO Employee Deduction** | 0 THB | Casa Luma covers the employee and company Social Security Office contribution. |
| **OT Multiplier** | 1.5x default | Payroll calculations default to 1.5x. The payslip UI can adjust displayed OT to 2.0x when needed. |

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
1. **Unpaid Days:** Any day marked as "Unpaid Leave", "Absent", or remaining "No Data" results in a deduction of `1 * Daily Rate`.
2. **Expected Weekly Day Off:** There is no fixed business day off. For each employee, one missing shift per Monday-Sunday week is treated as the expected paid day off, so a normal 6-day work week does not create an absence deduction. Additional missing shifts in that week remain unpaid unless Notion or the UI marks them otherwise.
3. **Late/Early Out:** Any hours manually entered as "Hours Absent" result in a deduction of `Hours * Hourly Rate`.

### D. Overtime (OT)
- **OT Pay** = `Total OT Hours in Period * Hourly Rate * 1.5`.
- Note: While the attendance UI allows selecting different OT types (1.0, 3.0), the current salary engine defaults to **1.5x** for all hours. The payslip can display OT at **2.0x** when selected.

### E. Social Security (SSO)
- No employee-side SSO deduction is subtracted from payroll.
- Casa Luma pays the employee and company contribution on the employee's behalf.
- The payslip shows a note on the end-of-month run instead of a 5% deduction row.

### F. Adjustments (Notion Integration)
Adjustments are fetched from the Notion "Salary Adjustments" database and applied based on type:
- **Additions:** Bonus, Reimbursement.
- **Subtractions:** Advance, Deduction, Loan Repayment, Late Penalty.

---

## 4. Final Formulas

### Total Gross Earned (Period)
`Gross = (Monthly Salary / 2) + OT Pay + Bonuses - Attendance Deductions`

### Net Payout (Period)
`Net = Gross - Regular Deductions - Salary Advances`

---

## 5. Visual Indicators in UI

- **Expected Weekly Day Off:** Marked as "Day Off" when inferred from a missing shift. It is **paid by default** for monthly staff, up to one per Monday-Sunday week.
- **Shift Data:** Days found in the Notion "Shifts" database are marked with a blue "Shift" badge and inherit their status automatically.
- **Manual Overrides:** Any manual change to a day's status or OT in the UI is immediately reflected in the reactive calculation.

---

## 6. Maintenance Note
The calculation engine is located in `src/lib/salary.ts`. When updating logic:
1. Update `SalaryResult` type if new metrics are added.
2. Update `calculateSalary` function.
3. Update this document.
4. Verify the `Payslip.svelte` component correctly displays the new logic.
