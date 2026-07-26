import { describe, expect, it } from 'vitest';
import {
  buildEmailAutomationKeyboard,
  buildEmailAutomationTestKeyboard,
  parseEmailAutomationCallbackData
} from './telegram-buttons';

const dashboardUrl = 'https://www.casalumakpg.com/mgmt-dashboard/email-automation/42';

describe('email automation Telegram buttons', () => {
  it('builds actionable review controls and a dashboard link', () => {
    const keyboard = buildEmailAutomationKeyboard({ eventId: 42, dashboardUrl, review: true });
    expect(keyboard.inline_keyboard).toEqual([
      [
        { text: '✅ Mark handled', callback_data: 'email:handled:42' },
        { text: '🗑 Dismiss', callback_data: 'email:dismiss:42' }
      ],
      [{ text: '🚫 Ignore this sender', callback_data: 'email:ignore:42' }],
      [{ text: '📋 Open dashboard', url: dashboardUrl }]
    ]);
  });

  it('requires a second click before ignoring a sender', () => {
    const keyboard = buildEmailAutomationKeyboard({ eventId: 42, dashboardUrl, review: true, ignoreConfirmationToken: 'abcdefghijklmnop' });
    expect(keyboard.inline_keyboard).toEqual([
      [{ text: '⚠️ Confirm ignoring future emails', callback_data: 'email:confirm_ignore:42:abcdefghijklmnop' }],
      [{ text: 'Cancel', callback_data: 'email:cancel_ignore:42:abcdefghijklmnop' }]
    ]);
  });

  it('only links to the dashboard for non-review outcomes without a Ledger record', () => {
    expect(buildEmailAutomationKeyboard({ eventId: 42, dashboardUrl, review: false }).inline_keyboard)
      .toEqual([[{ text: '📋 Open dashboard', url: dashboardUrl }]]);
  });

  it('offers receipt upload for a completed Ledger record', () => {
    expect(buildEmailAutomationKeyboard({ eventId: 42, dashboardUrl, review: false, canAttachReceipt: true }).inline_keyboard)
      .toEqual([
        [{ text: '📎 Attach receipt', callback_data: 'email:receipt:42' }],
        [{ text: '📋 Open dashboard', url: dashboardUrl }]
      ]);
  });

  it('parses only bounded known callback data', () => {
    expect(parseEmailAutomationCallbackData('email:dismiss:42')).toEqual({ action: 'dismiss', eventId: 42 });
    expect(parseEmailAutomationCallbackData('email:receipt:42')).toEqual({ action: 'receipt', eventId: 42 });
    expect(parseEmailAutomationCallbackData('email:confirm_ignore:42:abcdefghijklmnop')).toEqual({ action: 'confirm_ignore', eventId: 42, confirmationToken: 'abcdefghijklmnop' });
    expect(parseEmailAutomationCallbackData('email:confirm_ignore:42')).toBeNull();
    expect(parseEmailAutomationCallbackData('email:unknown:42')).toBeNull();
    expect(parseEmailAutomationCallbackData('email:dismiss:-1')).toBeNull();
    expect(parseEmailAutomationCallbackData('x'.repeat(65))).toBeNull();
  });

  it('uses no-op callbacks for preview messages', () => {
    const keyboard = buildEmailAutomationTestKeyboard('https://example.test/dashboard');
    const callbackButtons = keyboard.inline_keyboard.flat().filter((button) => button.callback_data);
    expect(callbackButtons.every((button) => button.callback_data === 'email:test:0')).toBe(true);
  });
});
