export const humanize = (value: string | null | undefined) => value?.replaceAll('_', ' ') || 'not recorded';

const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return 'not recorded';
  return dateTime.format(new Date(value));
};

export const formatAge = (value: string | Date) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
};

export const formatJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2) ?? 'not recorded';
  } catch {
    return 'Evidence could not be formatted.';
  }
};

export const reviewStateClasses = (state: string) => state === 'done'
  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
  : state === 'waiting' || state === 'in_progress'
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-slate-200 bg-slate-50 text-slate-700';

export const bodyWarning = (mimeCompleteness: string, bodyPreview: string | null, bodyPreviewTruncated: boolean) => {
  if (mimeCompleteness !== 'complete') return 'The MIME message or latest-body extraction is incomplete or ambiguous. Treat this body as untrusted evidence and do not promote it manually.';
  if (!bodyPreview) return 'No readable extracted body was retained. Check the original email through the approved provider workflow.';
  if (bodyPreviewTruncated) return 'The extracted body reached its safety cap. The original MIME message and attachments are not available here.';
  return null;
};
