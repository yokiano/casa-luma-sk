# Expense Scan Engine

This directory contains the logic for parsing OCR text from bank slips into structured expense data.

## Directory Structure

- `parsers/`: Individual parser implementations for different slip types (e.g., K-Bank Transfer, Bill Payment).
- `ocr.ts`: Integration with OCR services.
- `parser.ts`: Main entry point that orchestrates different parsers.
- `types.ts`: TypeScript definitions for parsed results and parser interfaces.
- `test-cases.ts`: A collection of raw OCR outputs and their expected parsed results.
- `regression.test.ts`: Automated test suite that verifies parsers against all cases in `test-cases.ts`.

## Regression Testing Workflow

To ensure that changes to parsers don't introduce regressions, we use a collection of real OCR samples.

### 1. Collect New Test Cases

When you find a slip that fails to parse correctly or you want to ensure a new slip type is supported:

1.  Upload the slip in the **Expense Scan** tool in the UI.
2.  Once scanned, click **Show Raw OCR**.
3.  Click **Copy as Test Case**.
4.  Paste the resulting JSON into the `ocrTestCases` array in `src/lib/expense-scan/test-cases.ts`.
5.  Adjust the `expected` values in the JSON to match what the parser *should* produce.

### 2. Run Tests

Run the regression suite using Vitest:

```bash
pnpm vitest run src/lib/expense-scan/regression.test.ts
```

## Adding a New Parser

1.  Create a new class in `parsers/` that implements the `ExpenseParser` interface.
2.  Register the new parser in the `parsers` array within `src/lib/expense-scan/parser.ts`.
3.  Add test cases to `test-cases.ts` to verify the new parser.
