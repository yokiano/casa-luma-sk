import { describe, expect, it } from 'vitest';
import { classifyEmail } from './classifier';

describe('MIME completeness boundary', () => {
  it('routes a ready financial classification to review when multipart parsing is unsupported', () => {
    const result = classifyEmail({ receivedAt: '2026-07-11T00:00:00Z', from: 'K BIZ <KBIZ@kasikornbank.com>', to: 'automations@casalumakpg.com', subject: 'Result of PromptPay Funds Transfer (Success)', attachmentCount: 1, textBody: 'Reference Number: PPFS260711123 Amount (THB): 12.00', mime: { completeness: 'unsupported', attachmentCount: 1 } });
    expect(result.processingState).toBe('review');
    expect(result.reviewReason).toMatch(/could not be safely read/i);
  });

  it('treats missing parser evidence as unsafe', () => {
    const result = classifyEmail({ receivedAt: '2026-07-11T00:00:00Z', from: 'K BIZ <KBIZ@kasikornbank.com>', to: 'automations@casalumakpg.com', subject: 'Result of PromptPay Funds Transfer (Success)', attachmentCount: 0, textBody: 'Reference Number: PPFS260711123 Amount (THB): 12.00' });
    expect(result.processingState).toBe('review');
    expect(result.reviewReason).toMatch(/evidence is missing/i);
  });
});
