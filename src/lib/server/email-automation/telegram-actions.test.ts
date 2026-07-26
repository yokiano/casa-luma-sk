import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  review: {
    id: 7,
    status: 'waiting',
    analysis: 'saved analysis',
    summary: 'saved summary',
    analysisProvenance: { needsFullBody: true, revision: 3 } as Record<string, unknown>
  },
  markDone: vi.fn(),
  dismiss: vi.fn(),
  ignoreSender: vi.fn()
}));

vi.mock('$lib/server/db/schema', () => ({
  emailAttentionReviews: {
    id: 'id',
    eventId: 'eventId',
    status: 'status',
    analysisProvenance: 'analysisProvenance'
  }
}));
vi.mock('$lib/server/db/client', () => ({
  db: {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({ limit: async () => [mocks.review] })
      })
    })),
    update: vi.fn(() => ({
      set: (values: { analysisProvenance: Record<string, unknown> }) => ({
        where: () => ({
          returning: async () => {
            mocks.review.analysisProvenance = values.analysisProvenance;
            return [{ id: mocks.review.id }];
          }
        })
      })
    }))
  }
}));
vi.mock('./dashboard', () => ({
  markEmailAutomationReviewDone: mocks.markDone,
  dismissEmailAutomationReviewAsIrrelevant: mocks.dismiss,
  addEmailAutomationReviewSenderToIgnoredList: mocks.ignoreSender
}));
vi.mock('./notifications/send', () => ({
  getEmailAutomationEventUrl: (eventId: number) => `https://example.test/events/${eventId}`
}));

import { performEmailAutomationTelegramAction } from './telegram-actions';

describe('email automation Telegram actions', () => {
  beforeEach(() => {
    mocks.review.status = 'waiting';
    mocks.review.analysisProvenance = { needsFullBody: true, revision: 3 };
    mocks.markDone.mockReset().mockResolvedValue({ status: 'done' });
    mocks.dismiss.mockReset().mockResolvedValue({ status: 'done' });
    mocks.ignoreSender.mockReset().mockResolvedValue({ added: true, senderEmail: 'sender@example.com' });
  });

  it('shows a spoofing warning without changing data on the first ignore click', async () => {
    const result = await performEmailAutomationTelegramAction({ action: 'ignore', eventId: 42, telegramUserId: 99 });
    expect(result.showAlert).toBe(true);
    expect(result.message).toContain('visible sender addresses can be spoofed');
    expect(mocks.ignoreSender).not.toHaveBeenCalled();
    expect(result.replyMarkup?.inline_keyboard[0][0].callback_data).toMatch(/^email:confirm_ignore:42:[A-Za-z0-9_-]{16}$/);
  });

  it('adds an ignored sender only after a user-bound confirmation and keeps the review open', async () => {
    const prompt = await performEmailAutomationTelegramAction({ action: 'ignore', eventId: 42, telegramUserId: 99 });
    const callbackData = prompt.replyMarkup?.inline_keyboard[0][0].callback_data ?? '';
    const confirmationToken = callbackData.split(':')[3];
    const result = await performEmailAutomationTelegramAction({ action: 'confirm_ignore', eventId: 42, telegramUserId: 99, confirmationToken });
    expect(mocks.ignoreSender).toHaveBeenCalledWith(7, true, 'telegram:99');
    expect(mocks.markDone).not.toHaveBeenCalled();
    expect(mocks.dismiss).not.toHaveBeenCalled();
    expect(result.message).toContain('This review remains open');
  });

  it('rejects confirmation replay and confirmation by a different manager', async () => {
    const prompt = await performEmailAutomationTelegramAction({ action: 'ignore', eventId: 42, telegramUserId: 99 });
    const confirmationToken = (prompt.replyMarkup?.inline_keyboard[0][0].callback_data ?? '').split(':')[3];

    await expect(performEmailAutomationTelegramAction({ action: 'confirm_ignore', eventId: 42, telegramUserId: 100, confirmationToken }))
      .rejects.toThrow('expired or was already used');
    await performEmailAutomationTelegramAction({ action: 'confirm_ignore', eventId: 42, telegramUserId: 99, confirmationToken });
    await expect(performEmailAutomationTelegramAction({ action: 'confirm_ignore', eventId: 42, telegramUserId: 99, confirmationToken }))
      .rejects.toThrow('expired or was already used');
    expect(mocks.ignoreSender).toHaveBeenCalledTimes(1);
  });

  it('marks a review handled while preserving its saved notes and triage metadata', async () => {
    await performEmailAutomationTelegramAction({ action: 'handled', eventId: 42, telegramUserId: 99 });
    expect(mocks.markDone).toHaveBeenCalledWith({
      reviewId: 7,
      analysis: 'saved analysis',
      summary: 'saved summary',
      needsFullBody: true,
      expectedRevision: 3
    }, 'telegram:99');
  });

  it('dismisses with the distinct Telegram audit actor', async () => {
    const result = await performEmailAutomationTelegramAction({ action: 'dismiss', eventId: 42, telegramUserId: 123 });
    expect(mocks.dismiss).toHaveBeenCalledWith(expect.objectContaining({ reviewId: 7, expectedRevision: 3 }), 'telegram:123');
    expect(result.message).toBe('Review dismissed as irrelevant.');
  });

  it('never mutates data for demo callbacks', async () => {
    const result = await performEmailAutomationTelegramAction({ action: 'test', eventId: 0, telegramUserId: 99 });
    expect(result.message).toContain('No data was changed');
    expect(mocks.markDone).not.toHaveBeenCalled();
    expect(mocks.dismiss).not.toHaveBeenCalled();
    expect(mocks.ignoreSender).not.toHaveBeenCalled();
  });
});
