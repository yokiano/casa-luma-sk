import { describe, it, expect } from 'vitest';
import { expenseScanParser } from './parser';
import { ocrTestCases } from './test-cases';

describe('Expense Scan Regression Tests', () => {
  ocrTestCases.forEach((testCase) => {
    it(`should correctly parse: ${testCase.name} (${testCase.id})`, () => {
      const parsed = expenseScanParser.parse(testCase.rawText);
      
      if (testCase.expected.transactionId !== undefined) {
        expect(parsed.transactionId).toBe(testCase.expected.transactionId);
      }
      
      if (testCase.expected.date !== undefined) {
        expect(parsed.date).toBe(testCase.expected.date);
      }
      
      if (testCase.expected.amount !== undefined) {
        expect(parsed.amount).toBe(testCase.expected.amount);
      }
      
      if (testCase.expected.recipientName !== undefined) {
        // Use contain for recipient name as OCR can be noisy at the end of the line
        expect(parsed.recipientName).toContain(testCase.expected.recipientName);
      }
      
      if (testCase.expected.memo !== undefined) {
        expect(parsed.memo).toBe(testCase.expected.memo);
      }
    });
  });
});
