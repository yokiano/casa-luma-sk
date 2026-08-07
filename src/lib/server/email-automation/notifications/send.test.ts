import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmailAutomationInput, EmailClassification } from '../classifier';

const telegramEnv = vi.hoisted(() => ({
  TELEGRAM_BOT_TOKEN: 'bot-token',
  TELEGRAM_ALERT_TIMEOUT_MS: '3000',
  EMAIL_AUTOMATION_TELEGRAM_CHAT_ID: '-1002',
  EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_CHAT_ID: '-1003'
}));

vi.mock('$env/dynamic/private', () => ({ env: telegramEnv }));

import { selectEmailAutomationDestination, sendEmailAutomationNotification } from './send';

const expense: EmailClassification = {
  classification: 'expense',
  subtype: 'promptpay_transfer_success',
  processingState: 'ready',
  notify: true,
  handlerKey: 'company_ledger_expense'
};

const input: EmailAutomationInput = {
  receivedAt: '2026-08-07T10:00:00.000Z',
  from: 'K BIZ <kbiz@example.com>',
  to: 'automations@example.com',
  subject: 'PromptPay transfer',
  attachmentCount: 0,
  textBody: 'Amount (THB): 123.45'
};

describe('email automation Telegram routing', () => {
  beforeEach(() => {
    telegramEnv.EMAIL_AUTOMATION_TELEGRAM_CHAT_ID = '-1002';
    telegramEnv.EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_CHAT_ID = '-1003';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
  });
  it('routes a successfully recorded expense to financial transactions', () => {
    expect(selectEmailAutomationDestination(expense, {
      actionStatus: 'succeeded',
      externalObjectId: 'ledger-page-1'
    })).toBe('financial_transactions');
  });

  it('routes reconciled income records to financial transactions too', () => {
    expect(selectEmailAutomationDestination({
      ...expense,
      classification: 'income',
      handlerKey: 'financial_ledger_income'
    }, {
      actionStatus: 'reconciled',
      externalObjectId: 'ledger-page-2'
    })).toBe('financial_transactions');
  });

  it('publishes a recorded Ledger transaction to the financial group', async () => {
    await sendEmailAutomationNotification(input, expense, 42, 'ledger-page-1', {
      actionStatus: 'succeeded',
      externalObjectId: 'ledger-page-1',
      processingState: 'action_succeeded'
    });
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.chat_id).toBe('-1003');
  });

  it('publishes an unrecorded candidate to the existing email group', async () => {
    await sendEmailAutomationNotification(input, expense, 42, undefined, {
      actionStatus: 'failed',
      actionMessage: 'No Ledger record was created.'
    });
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.chat_id).toBe('-1002');
  });

  it('does not fall back when the financial destination is missing', async () => {
    telegramEnv.EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_CHAT_ID = '';
    const result = await sendEmailAutomationNotification(input, expense, 42, 'ledger-page-1', {
      actionStatus: 'succeeded',
      externalObjectId: 'ledger-page-1'
    });
    expect(result).toBe('not_configured');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps unrecorded, failed, and review candidates in the existing email group', () => {
    expect(selectEmailAutomationDestination(expense)).toBe('email_default');
    expect(selectEmailAutomationDestination(expense, {
      actionStatus: 'failed',
      actionMessage: 'No Ledger record was created.'
    })).toBe('email_default');
    expect(selectEmailAutomationDestination({
      ...expense,
      processingState: 'review',
      classification: 'review'
    }, {
      actionStatus: 'succeeded',
      externalObjectId: 'not-a-ledger-record'
    })).toBe('email_default');
  });
});
