import { describe, expect, it } from 'vitest';
import { buildEmailAutomationOutcome } from './presentation';

describe('buildEmailAutomationOutcome', () => {
  for (const processingState of ['queued', 'review', 'ignored', 'action_succeeded', 'retry_scheduled', 'failed', 'cancelled', 'reconciled']) {
    it(`explains ${processingState}`, () => {
      const view = buildEmailAutomationOutcome({ classification: 'expense', subtype: 'promptpay_transfer_success', processingState, actionState: processingState === 'failed' ? 'failed' : processingState === 'retry_scheduled' ? 'retry_scheduled' : undefined });
      expect(view.whatHappened).not.toHaveLength(0);
      expect(view.actionTaken).not.toHaveLength(0);
      expect(view.currentState).not.toHaveLength(0);
      expect(view.nextStep).not.toHaveLength(0);
    });
  }
});
