import { describe, expect, it } from 'vitest';
import {
  createTelegramDestinationPublisher,
  resolveTelegramDestination,
  type TelegramRuntimeEnv
} from './destinations';

const configuredEnv: TelegramRuntimeEnv = {
  TELEGRAM_BOT_TOKEN: 'bot-token',
  TELEGRAM_ALERT_TIMEOUT_MS: '5000',
  TELEGRAM_CHAT_ID: '-1001',
  TELEGRAM_MESSAGE_THREAD_ID: '11',
  EMAIL_AUTOMATION_TELEGRAM_CHAT_ID: '-1002',
  EMAIL_AUTOMATION_TELEGRAM_MESSAGE_THREAD_ID: '22',
  EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_CHAT_ID: '-1003',
  EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_MESSAGE_THREAD_ID: '33',
  RECEIPT_CASHIER_ALERT_TELEGRAM_CHAT_ID: '-1004',
  RECEIPT_CASHIER_ALERT_TELEGRAM_MESSAGE_THREAD_ID: '44'
};

describe('Telegram destination registry', () => {
  it('resolves each logical destination from its own environment variables', () => {
    expect(resolveTelegramDestination('manager_incidents', configuredEnv)).toEqual({
      status: 'configured',
      destination: 'manager_incidents',
      chatId: '-1001',
      messageThreadId: '11'
    });
    expect(resolveTelegramDestination('email_default', configuredEnv)).toEqual({
      status: 'configured',
      destination: 'email_default',
      chatId: '-1002',
      messageThreadId: '22'
    });
    expect(resolveTelegramDestination('financial_transactions', configuredEnv)).toEqual({
      status: 'configured',
      destination: 'financial_transactions',
      chatId: '-1003',
      messageThreadId: '33'
    });
    expect(resolveTelegramDestination('cashier_receipt_alerts', configuredEnv)).toEqual({
      status: 'configured',
      destination: 'cashier_receipt_alerts',
      chatId: '-1004',
      messageThreadId: '44'
    });
  });

  it('returns not_configured without falling back to another destination', () => {
    const missingDedicatedGroups = {
      ...configuredEnv,
      EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_CHAT_ID: '',
      RECEIPT_CASHIER_ALERT_TELEGRAM_CHAT_ID: ''
    };
    expect(resolveTelegramDestination('financial_transactions', missingDedicatedGroups)).toEqual({
      status: 'not_configured',
      destination: 'financial_transactions'
    });
    expect(resolveTelegramDestination('cashier_receipt_alerts', missingDedicatedGroups)).toEqual({
      status: 'not_configured',
      destination: 'cashier_receipt_alerts'
    });
    expect(resolveTelegramDestination('email_default', missingDedicatedGroups).status).toBe('configured');
    expect(createTelegramDestinationPublisher('financial_transactions', missingDedicatedGroups)).toBeNull();
    expect(createTelegramDestinationPublisher('cashier_receipt_alerts', missingDedicatedGroups)).toBeNull();
  });

  it('treats a blank thread ID as an optional setting', () => {
    expect(resolveTelegramDestination('financial_transactions', {
      ...configuredEnv,
      EMAIL_AUTOMATION_FINANCIAL_TELEGRAM_MESSAGE_THREAD_ID: '  '
    })).toEqual({
      status: 'configured',
      destination: 'financial_transactions',
      chatId: '-1003'
    });
  });
});
