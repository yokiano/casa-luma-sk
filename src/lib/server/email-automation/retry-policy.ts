export const MAX_EMAIL_AUTOMATION_ATTEMPTS = 5;
const BASE_DELAY_MS = 60_000;
const MAX_DELAY_MS = 60 * 60_000;

/** Deterministic jitter keeps tests reproducible and avoids retry thundering herds. */
export const nextRetryAt = (attemptCount: number, now = new Date(), jitter = 0.15) => {
  const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attemptCount - 1));
  return new Date(now.getTime() + Math.round(delay * (1 + jitter)));
};

export const canRetry = (attemptCount: number) => attemptCount < MAX_EMAIL_AUTOMATION_ATTEMPTS;
