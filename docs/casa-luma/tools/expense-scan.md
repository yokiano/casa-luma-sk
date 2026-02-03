# Expense Scanning & Notion Sync Mechanism

The Expense Scan tool allows staff to upload bank transfer slips and bill payment receipts, automatically extract transaction details using OCR, and sync them directly to the **Expenses Tracker** database in Notion.

## How It Works

The system follows a 4-step process:

1.  **Image Upload**: The user drops one or more image files (JPG/PNG) into the UI.
2.  **OCR Processing**: The browser sends the image to the server via a `remote` command. The server uses **Tesseract.js** to perform Optical Character Recognition, supporting both English and Thai.
3.  **Parsing**: The raw OCR text is passed through a chain of specialized **Parsers** that identify the slip type (e.g., K-Bank Transfer vs. K-Bank Bill Payment) and extract key fields using Regex and line-by-line analysis.
4.  **Notion Sync**: After the user verifies and completes the metadata (Category, Department), the data is sent to the **Expenses Tracker** database. The system automatically checks for duplicate `Reference Number`s to prevent double-entry.

---

## Automation Rules (New)

To speed up data entry for recurring expenses (like salaries or utility bills), the system includes an **Automation Rules** mechanism:
- **Rule Matching**: Upon loading the tool, all rules from the **Expense Scan Rules** database are fetched once. When a slip is scanned, the system matches the extracted `recipientName` against these rules in the browser.
- **Auto-fill**: If a match is found, the **Category**, **Department**, and **Supplier** fields are automatically populated.
- **Matched Indicator**: Slips that were auto-filled display a "Matched with Rule" badge.
- **Save as Rule**: Users can create new rules directly from the UI by clicking "Save as Rule" after manually filling in the details for a new recipient.

---

## Technical Architecture

### 1. OCR Service (`src/lib/server/ocr.service.ts`)
Uses `tesseract.js` with `eng+tha` languages. It converts the image to text and then calls the `ExpenseScanParser`.

### 2. Parsing Logic (`src/lib/server/expense-scan/`)
-   `parser.ts`: The orchestrator that holds an array of available parsers.
-   `types.ts`: Defines the `ParsedExpense` interface and the `ExpenseParser` contract.
-   `parsers/`: Directory containing specific implementations for different slip types.

### 3. Data Schema
The parsers aim to extract the following fields:
-   `transactionId`: The unique reference number (e.g., `TRTS...` or `BILS...`).
-   `date`: Transaction date and time in `DD/MM/YYYY HH:mm` format.
-   `amount`: Numeric value of the total paid.
-   `recipientName`: The name of the person or business receiving the money.
-   `memo`: Any note or memo included in the transaction.

---

## How to Write a New Parser

If you encounter a new slip format that isn't being recognized:

1.  **Create a new file** in `src/lib/server/expense-scan/parsers/` (e.g., `my-bank-parser.ts`).
2.  **Implement the `ExpenseParser` interface**:
    ```typescript
    export class MyBankParser implements ExpenseParser {
      id = 'my-bank-id';
      name = 'My Bank Name';

      validate(rawText: string): boolean {
        // Return true if the rawText looks like it belongs to this bank
        // Usually check for keywords like 'MyBank' or specific Thai headers
        return rawText.toLowerCase().includes('mybank');
      }

      parse(rawText: string): ParsedExpense {
        // Use Regex to extract fields
        return {
          transactionId: this.extractId(rawText),
          amount: this.extractAmount(rawText),
          // ...
        };
      }
    }
    ```
3.  **Register the parser** in `src/lib/server/expense-scan/parser.ts` by adding it to the `parsers` array.

---

## Notion Integration

### Database
The tool syncs to the **Expenses Tracker** database (ID: `2b5fc77db4f380658975e282f1aab7d2`).

### Duplicate Prevention
Before creating a new page in Notion, the `submitExpenseSlip` command queries the database for an existing entry with the same `Reference Number`. If found, it throws an error to prevent duplicates.

### Field Mapping
| Slip Field | Notion Property |
| :--- | :--- |
| `memo` | `Expense` (Title) |
| `amount` | `Amount (THB)` |
| `date` | `Date` |
| `transactionId` | `Reference Number` |
| `category` | `Category` (Select) |
| `department` | `Department` (Select) |
| `supplierId` | `Supplier` (Relation) |

---

## Tips for Better Parsing
-   **Thai OCR**: Thai characters often come with extra spaces in OCR (e.g., `โ อ น เ ง ิ น`). Always use regex that accounts for `\s*` or normalized versions of strings.
-   **Amount Extraction**: Look for keywords like `Total`, `Amount`, or `To` followed by a number with two decimal places.
-   **Recipient**: On K-Bank slips, the recipient is often preceded by a `To` or `ไปยัง` label.
