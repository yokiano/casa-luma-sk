import type { MirrorErrorCode, MirrorStage, SafeMirrorError } from './types';

export class SecondLoyverseError extends Error {
  readonly code: MirrorErrorCode;
  readonly stage: MirrorStage;
  readonly httpStatus?: number;
  readonly entityType?: string;
  readonly entityName?: string;

  constructor(input: SafeMirrorError) {
    super(input.message);
    this.name = 'SecondLoyverseError';
    this.code = input.code;
    this.stage = input.stage;
    this.httpStatus = input.httpStatus;
    this.entityType = input.entityType;
    this.entityName = input.entityName;
  }

  toSafeError(): SafeMirrorError {
    return {
      code: this.code,
      stage: this.stage,
      message: sanitizeErrorMessage(this.message),
      httpStatus: this.httpStatus,
      entityType: this.entityType,
      entityName: this.entityName
    };
  }
}

export const sanitizeErrorMessage = (message: string, max = 500): string => {
  const cleaned = message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/access[_-]?token["']?\s*[:=]\s*["']?[^"'&\s]+/gi, 'access_token=[redacted]')
    .replace(/\u0000/g, '')
    .trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
};

export const toSafeMirrorError = (
  error: unknown,
  fallback: Pick<SafeMirrorError, 'code' | 'stage'>
): SafeMirrorError => {
  if (error instanceof SecondLoyverseError) {
    return error.toSafeError();
  }

  const message =
    error instanceof Error ? sanitizeErrorMessage(error.message) : sanitizeErrorMessage(String(error));

  let code = fallback.code;
  let httpStatus: number | undefined;

  if (error && typeof error === 'object' && 'status' in error && typeof (error as { status: unknown }).status === 'number') {
    httpStatus = (error as { status: number }).status;
    if (httpStatus === 401 || httpStatus === 403) code = 'AUTH';
    else if (httpStatus === 429) code = 'RATE_LIMIT';
    else if (httpStatus >= 500) code = 'TARGET_SERVER';
    else if (httpStatus === 400 || httpStatus === 422) code = 'TARGET_VALIDATION';
  }

  if (/fetch failed|ECONNRESET|ETIMEDOUT|network|socket/i.test(message)) {
    code = 'NETWORK';
  }

  return {
    code,
    stage: fallback.stage,
    message,
    httpStatus
  };
};

export const isAmbiguousPostError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('aborted') ||
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnreset') ||
    message.includes('fetch failed') ||
    message.includes('network')
  );
};
