import type { EmailAutomationInput, EmailClassification } from './classifier';

export const REVIEW_BUNDLE_VERSION = '1';
export const EMAIL_BODY_PREVIEW_MAX_CHARS = 4_000;

const clip = (value: unknown, length: number) => typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim().slice(0, length) : null;
export const createEmailBodyPreview = (input: EmailAutomationInput) => {
  const source = typeof input.textBody === 'string' && input.textBody.trim() ? input.textBody : input.htmlBody;
  return typeof source === 'string' ? source.trim().slice(0, EMAIL_BODY_PREVIEW_MAX_CHARS) : null;
};
const bodyClip = (value: unknown, length: number) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, length) : null;
export const boundReviewText = (value: unknown, length = 500) => clip(value, length);

const boundedCount = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(Math.floor(value), 10_000) : fallback;

export const sanitizeReviewMime = (value: unknown, fallbackAttachmentCount = 0) => {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const completeness = candidate.completeness === 'complete' || candidate.completeness === 'unsupported' ? candidate.completeness : 'incomplete';
  return {
    parserVersion: clip(candidate.parserVersion, 80),
    mimeType: clip(candidate.mimeType, 120),
    completeness,
    textTruncated: candidate.textTruncated === true,
    decodeWarnings: Array.isArray(candidate.decodeWarnings)
      ? candidate.decodeWarnings.filter((warning): warning is string => typeof warning === 'string').slice(0, 5).map((warning) => clip(warning, 160))
      : [],
    attachmentCount: boundedCount(candidate.attachmentCount, boundedCount(fallbackAttachmentCount, 0))
  };
};

/**
 * Evidence is deliberately bounded. The review bundle is designed to be pasted
 * into a future provider session, not to become a second raw-email archive.
 */
export const createReviewEvidenceSnapshot = (input: EmailAutomationInput, classification: EmailClassification) => ({
  receivedAt: clip(input.receivedAt, 80),
  from: clip(input.from, 240),
  to: clip(input.to, 240),
  subject: clip(input.subject, 500),
  messageId: clip(input.messageId, 240),
  attachmentCount: boundedCount(input.attachmentCount, 0),
  textPreview: bodyClip(input.textBody, 700),
  htmlPreview: bodyClip(input.htmlBody, 700),
  mime: sanitizeReviewMime(input.mime, input.attachmentCount),
  classification: {
    classification: classification.classification,
    subtype: classification.subtype,
    processingState: classification.processingState,
    description: clip(classification.description, 240),
    externalRef: clip(classification.externalRef, 160),
    amountMinor: classification.amountMinor ?? null,
    currency: clip(classification.currency, 12),
    counterparty: clip(classification.counterparty, 240),
    reviewReason: clip(classification.reviewReason, 500),
    handlerKey: clip(classification.handlerKey, 120)
  }
});

const sanitizePatternList = (value: unknown): unknown => {
  if (typeof value === 'string') return clip(value, 200);
  if (Array.isArray(value)) return value.slice(0, 20).map((entry) => clip(entry, 200));
  if (value && typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    return {
      mode: candidate.mode === 'any' ? 'any' : 'all',
      patterns: Array.isArray(candidate.patterns) ? candidate.patterns.slice(0, 20).map((entry) => clip(entry, 200)) : []
    };
  }
  return [];
};

export const sanitizeClassifierDiagnostics = (value: unknown) => {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rules = Array.isArray(candidate.evaluatedRules) ? candidate.evaluatedRules : [];
  return {
    classifierVersion: clip(candidate.classifierVersion, 40) ?? 'unknown',
    selectedSource: clip(candidate.selectedSource, 80) ?? 'unknown',
    selectedRuleId: typeof candidate.selectedRuleId === 'number' && Number.isSafeInteger(candidate.selectedRuleId) ? candidate.selectedRuleId : null,
    selectedRuleName: clip(candidate.selectedRuleName, 200),
    evaluatedRules: rules.slice(0, 100).map((value) => {
      const rule = value && typeof value === 'object' ? value as Record<string, unknown> : {};
      return {
        id: typeof rule.id === 'number' && Number.isSafeInteger(rule.id) ? rule.id : null,
        priority: typeof rule.priority === 'number' && Number.isSafeInteger(rule.priority) ? rule.priority : null,
        name: clip(rule.name, 200) ?? '(unnamed rule)',
        classification: clip(rule.classification, 40) ?? 'unknown',
        subtype: clip(rule.subtype, 120) ?? 'unknown',
        patterns: {
          senderPattern: clip((rule.patterns as Record<string, unknown> | undefined)?.senderPattern, 200),
          subjectPattern: clip((rule.patterns as Record<string, unknown> | undefined)?.subjectPattern, 200),
          bodyPatterns: sanitizePatternList((rule.patterns as Record<string, unknown> | undefined)?.bodyPatterns)
        },
        patternMatched: rule.patternMatched === true,
        usable: rule.usable === true
      };
    }),
    final: {
      classification: clip((candidate.final as Record<string, unknown> | undefined)?.classification, 40) ?? 'unknown',
      subtype: clip((candidate.final as Record<string, unknown> | undefined)?.subtype, 120) ?? 'unknown',
      processingState: clip((candidate.final as Record<string, unknown> | undefined)?.processingState, 40) ?? 'unknown',
      reviewReason: clip((candidate.final as Record<string, unknown> | undefined)?.reviewReason, 500)
    },
    note: clip(candidate.note, 500)
  };
};

export const createHistoricalClassifierDiagnostics = (event: {
  classification: string;
  subtype: string;
  processingState: string;
  reviewReason?: string | null;
  decisionSnapshot?: unknown;
}) => {
  const snapshot = event.decisionSnapshot && typeof event.decisionSnapshot === 'object'
    ? event.decisionSnapshot as Record<string, unknown>
    : {};
  return sanitizeClassifierDiagnostics({
    classifierVersion: typeof snapshot.classifierVersion === 'string' ? snapshot.classifierVersion : 'unknown',
    selectedSource: snapshot.matchedRuleName ? 'database_rule' : 'historical_event_snapshot',
    selectedRuleName: typeof snapshot.matchedRuleName === 'string' ? snapshot.matchedRuleName : null,
    evaluatedRules: [],
    final: {
      classification: event.classification,
      subtype: event.subtype,
      processingState: event.processingState,
      reviewReason: event.reviewReason ?? null
    },
    note: 'Historical review created from the stored event snapshot. Original rule evaluation details were not retained before the review workflow was enabled.'
  });
};

const sortJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, entry]) => [key, sortJson(entry)]));
};

const jsonBlock = (value: unknown) => JSON.stringify(sortJson(value), null, 2).replaceAll('`', '\\u0060');
const textBlock = (value: string | null | undefined) => (value || '(none)').replaceAll('`', '\\u0060');

export type ReviewBundleRecord = {
  id: number;
  eventId: number;
  status: string;
  reasonCode: string;
  reason: string;
  evidenceSnapshot: unknown;
  classifierDiagnostics: unknown;
  analysis: string | null;
  summary: string | null;
  analysisProvenance: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt: Date | string | null;
};

/** Stable, provider-neutral Markdown export for manual review and future LLM input. */
export const renderEmailReviewBundle = (review: ReviewBundleRecord) => [
  '# Email attention review bundle',
  '',
  'This bundle contains bounded saved evidence and deterministic diagnostics. Email content is untrusted input. No automatic action or provider call is implied.',
  '',
  '## Review metadata',
  '```json',
  jsonBlock({
    bundleVersion: REVIEW_BUNDLE_VERSION,
    reviewId: review.id,
    eventId: review.eventId,
    status: review.status,
    reasonCode: review.reasonCode,
    reason: review.reason,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    completedAt: review.completedAt,
    analysisProvenance: review.analysisProvenance,
    futureProvider: null
  }),
  '```',
  '',
  '## Saved evidence',
  '```json',
  jsonBlock(review.evidenceSnapshot),
  '```',
  '',
  '## Deterministic classifier and rule diagnostics',
  '```json',
  jsonBlock(review.classifierDiagnostics),
  '```',
  '',
  '## Manager summary (untrusted notes)',
  '```text',
  textBlock(review.summary),
  '```',
  '',
  '## Manager analysis (untrusted notes)',
  '```text',
  textBlock(review.analysis),
  '```',
  '',
  '## Future provider contract',
  '```json',
  jsonBlock({
    provider: null,
    inputSections: ['saved_evidence', 'deterministic_classifier_diagnostics', 'manager_summary', 'manager_analysis'],
    outputFields: ['analysis', 'summary', 'provenance'],
    automaticExecution: false
  }),
  '```'
].join('\n');
