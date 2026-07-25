const MAX_ERROR_TEXT_LENGTH = 2_000;
const MAX_CAUSE_DEPTH = 4;

const redactSensitiveText = (value: string): string => {
  return value
    .replace(/((?:postgres(?:ql)?):\/\/)[^\s"']+/gi, '$1[redacted]')
    .replace(/(bearer\s+)[^\s"']+/gi, '$1[redacted]')
    .replace(/((?:password|passwd|token|secret|api[_-]?key|authorization|access[_-]?token)\s*[=:]\s*)[^\s,;"']+/gi, '$1[redacted]')
    .replace(/(https?:\/\/[^\s"']+)(?:\?[^\s"']*)/gi, '$1?[redacted]');
};

export const sanitizeErrorText = (value: string | null | undefined, maxLength = MAX_ERROR_TEXT_LENGTH): string | null => {
  if (!value) return null;
  const sanitized = redactSensitiveText(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (!sanitized) return null;
  return sanitized.length > maxLength ? `${sanitized.slice(0, maxLength)}…` : sanitized;
};

const getErrorProperty = (error: object, ...keys: string[]): unknown => {
  for (const key of keys) {
    if (key in error) return (error as Record<string, unknown>)[key];
  }
  return undefined;
};

export interface SafeErrorSummary {
  name: string | null;
  code: string | number | null;
  sqlState: string | null;
  retryable: boolean | null;
  message: string | null;
  cause?: SafeErrorSummary;
}

const toSafeSummary = (error: unknown, depth: number): SafeErrorSummary | null => {
  if (error === null || error === undefined) return null;

  if (!(error instanceof Error) && typeof error !== 'object') {
    return {
      name: 'NonErrorThrowable',
      code: null,
      sqlState: null,
      retryable: null,
      message: sanitizeErrorText(String(error))
    };
  }

  const object = error as object;
  const cause = getErrorProperty(object, 'cause');
  const code = getErrorProperty(object, 'code');
  const sqlState = getErrorProperty(object, 'sqlState', 'sqlstate', 'sql_state');
  const retryable = getErrorProperty(object, 'retryable', 'isRetryable');
  const nested = depth < MAX_CAUSE_DEPTH ? toSafeSummary(cause, depth + 1) : null;

  return {
    name: sanitizeErrorText(error instanceof Error ? error.name : String(getErrorProperty(object, 'name') ?? 'Error'), 120),
    code: typeof code === 'string' || typeof code === 'number' ? code : null,
    sqlState: typeof sqlState === 'string' ? sanitizeErrorText(sqlState, 40) : null,
    retryable: typeof retryable === 'boolean' ? retryable : null,
    message: sanitizeErrorText(error instanceof Error ? error.message : String(getErrorProperty(object, 'message') ?? error)),
    ...(nested ? { cause: nested } : {})
  };
};

export const getSafeErrorSummary = (error: unknown): SafeErrorSummary | null => toSafeSummary(error, 0);

export const formatSafeErrorSummary = (error: unknown): string | null => {
  const summary = getSafeErrorSummary(error);
  if (!summary) return null;

  try {
    return sanitizeErrorText(JSON.stringify(summary));
  } catch {
    return '[unserializable error]';
  }
};

const RETRYABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
  'ENETDOWN',
  'ENETUNREACH',
  'EHOSTDOWN',
  'EHOSTUNREACH',
  'EAI_AGAIN',
  '40001',
  '40P01',
  '55P03',
  '57P01',
  '57P02',
  '57P03',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01'
]);

export const isRetryableError = (error: unknown): boolean => {
  if (error === null || error === undefined) return false;
  if (error instanceof Error && error.name === 'AbortError') return true;

  if (typeof error === 'object') {
    const object = error as Record<string, unknown>;
    if (object.retryable === true || object.isRetryable === true) return true;
    const code = object.code ?? object.sqlState ?? object.sqlstate ?? object.sql_state;
    if (typeof code === 'string' && RETRYABLE_CODES.has(code.toUpperCase())) return true;
    if (typeof object.status === 'number' && object.status >= 500) return true;
    if ('cause' in object && isRetryableError(object.cause)) return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /(?:connection|network|socket|timeout|temporarily unavailable|too many connections)/i.test(message);
};

export const getWebhookHttpStatus = (error: unknown): 503 | 500 => (isRetryableError(error) ? 503 : 500);
