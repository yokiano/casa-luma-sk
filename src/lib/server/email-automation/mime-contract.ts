import type { EmailAutomationInput } from './classifier';

export type MimeCompleteness = 'complete' | 'incomplete' | 'unsupported';
export type MimeMetadata = {
  parserVersion?: string;
  mimeType?: string;
  completeness?: MimeCompleteness;
  textTruncated?: boolean;
  decodeWarnings?: string[];
  attachmentCount?: number;
};

/** Financial side effects must not run from a partial representation of an email. */
export const requiresMimeReview = (input: EmailAutomationInput) => {
  const mime = input.mime;
  // Legacy/missing parser evidence is unsafe. Financial work stays in review
  // until the intake transport explicitly proves a complete representation.
  return !mime || mime.completeness !== 'complete' || Boolean(mime.textTruncated) || (mime.attachmentCount ?? input.attachmentCount) > 0;
};

export const mimeReviewReason = (input: EmailAutomationInput) => {
  const mime = input.mime;
  if (!mime) return 'Parser completeness evidence is missing. Inspect the original email before acting.';
  if (mime.completeness === 'unsupported') return 'The email format could not be safely read. Inspect the original email before acting.';
  if (mime.completeness === 'incomplete' || mime.textTruncated) return 'The email body was incomplete or truncated. Inspect the original email before acting.';
  if ((mime.attachmentCount ?? input.attachmentCount) > 0) return 'This email has attachments that were not read by the intake parser. Inspect the original email before acting.';
  return undefined;
};
