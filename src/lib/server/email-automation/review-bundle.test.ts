import { describe, expect, it } from 'vitest';
import type { EmailAutomationInput } from './classifier';
import {
  createEmailBodyPreview,
  EMAIL_BODY_PREVIEW_MAX_CHARS,
  createReviewEvidenceSnapshot,
  readReviewTriageMetadata,
  renderEmailClassifierRuleDraft,
  renderEmailReviewBundle,
  renderPendingEmailReviewBundles,
  sanitizeClassifierDiagnostics
} from './review-bundle';

const input: EmailAutomationInput = {
  receivedAt: '2026-07-14T10:00:00.000Z',
  from: 'K BIZ <kbiz@example.test>',
  to: 'automations@example.test',
  subject: 'Needs review',
  messageId: '<review@example.test>',
  attachmentCount: 1,
  textBody: 'A short body with ``` untrusted content.',
  mime: { parserVersion: 'test', completeness: 'unsupported', attachmentCount: 1 }
};

const review = {
  id: 12,
  eventId: 34,
  status: 'waiting',
  reasonCode: 'mime_incomplete',
  reason: 'The email format could not be safely read.',
  evidenceSnapshot: createReviewEvidenceSnapshot(input, {
    classification: 'review',
    subtype: 'unrecognized_email',
    processingState: 'review',
    reviewReason: 'The email format could not be safely read.',
    notify: true
  }),
  classifierDiagnostics: {
    classifierVersion: '1',
    selectedSource: 'built_in_fallback',
    selectedRuleId: null,
    selectedRuleName: null,
    evaluatedRules: [],
    final: { classification: 'review', subtype: 'unrecognized_email', processingState: 'review', reviewReason: 'The email format could not be safely read.' }
  },
  analysis: 'Checked the bounded evidence.',
  summary: 'Keep in manual review.',
  analysisProvenance: { source: 'manual', provider: null },
  createdAt: new Date('2026-07-14T10:01:00.000Z'),
  updatedAt: new Date('2026-07-14T10:02:00.000Z'),
  completedAt: null
};

describe('email attention review bundle', () => {
  it('keeps a bounded readable body preview for the internal event page', () => {
    const body = `first line\n${'x'.repeat(EMAIL_BODY_PREVIEW_MAX_CHARS)}`;
    expect(createEmailBodyPreview({ ...input, textBody: body })).toHaveLength(EMAIL_BODY_PREVIEW_MAX_CHARS);
    expect(createEmailBodyPreview({ ...input, textBody: undefined, htmlBody: '<p>HTML fallback</p>' })).toBe('<p>HTML fallback</p>');
  });

  it('bounds evidence and produces a provider-neutral deterministic export', () => {
    const bundle = renderEmailReviewBundle(review);
    expect(review.evidenceSnapshot.textPreview).toContain('untrusted content.');
    expect(bundle).toContain('# Email attention review bundle');
    expect(bundle).toContain('## Deterministic classifier and rule diagnostics');
    expect(bundle).toContain('"futureProvider": null');
    expect(bundle).toContain('"automaticExecution": false');
    expect(bundle).toContain('\\u0060\\u0060\\u0060');
    expect(bundle).not.toContain('``` untrusted');
  });

  it('bounds MIME and classifier diagnostics before they are saved/exported', () => {
    const evidence = createReviewEvidenceSnapshot({ ...input, mime: {
      parserVersion: 'p'.repeat(200),
      mimeType: 'm'.repeat(300),
      completeness: 'incomplete',
      decodeWarnings: Array.from({ length: 20 }, () => 'w'.repeat(300)),
      attachmentCount: 99_999
    } }, {
      classification: 'review', subtype: 'x'.repeat(300), processingState: 'review', notify: true,
      reviewReason: 'r'.repeat(2_000)
    });
    const diagnostics = sanitizeClassifierDiagnostics({
      classifierVersion: 'v'.repeat(100), selectedRuleName: 'n'.repeat(500), evaluatedRules: Array.from({ length: 200 }, () => ({ name: 'r'.repeat(500), subtype: 's'.repeat(500) })),
      final: { classification: 'review', subtype: 'x'.repeat(500), processingState: 'review', reviewReason: 'z'.repeat(2_000) }
    });
    expect(evidence.mime.parserVersion).toHaveLength(80);
    expect(evidence.mime.mimeType).toHaveLength(120);
    expect(evidence.mime.decodeWarnings).toHaveLength(5);
    expect(evidence.mime.decodeWarnings[0]).toHaveLength(160);
    expect(evidence.mime.attachmentCount).toBe(10_000);
    expect(diagnostics.evaluatedRules).toHaveLength(100);
    expect(diagnostics.evaluatedRules[0].name).toHaveLength(200);
    expect(diagnostics.final.reviewReason).toHaveLength(500);
  });

  it('keeps JSON object ordering stable for equivalent records', () => {
    const reordered = { ...review, evidenceSnapshot: { b: 1, a: 2 }, classifierDiagnostics: { z: true, a: false } };
    const reorderedAgain = { ...review, evidenceSnapshot: { a: 2, b: 1 }, classifierDiagnostics: { a: false, z: true } };
    expect(renderEmailReviewBundle(reordered)).toBe(renderEmailReviewBundle(reorderedAgain));
  });

  it('combines every open review into one agent-safe batch document', () => {
    const bundle = renderPendingEmailReviewBundles([review, { ...review, id: 13, eventId: 35 }]);
    expect(bundle).toContain('# Pending email reviews for local Pi');
    expect(bundle).toContain('Open reviews: 2');
    expect(bundle).toContain('Review 2 of 2');
    expect(bundle.match(/# Email attention review bundle/g)).toHaveLength(2);
    expect(bundle).toContain('Do not modify production settings or automatically create or enable classifier rules.');
  });

  it('reads structured triage metadata without requiring a schema migration', () => {
    expect(readReviewTriageMetadata({ needsFullBody: true, disposition: 'dismissed_irrelevant', revision: 3 })).toEqual({
      needsFullBody: true,
      disposition: 'dismissed_irrelevant',
      revision: 3
    });
    expect(readReviewTriageMetadata({ needsFullBody: 'yes', disposition: 'other' })).toEqual({ needsFullBody: false, disposition: null, revision: 0 });
  });

  it('creates a disabled classifier draft without copying body content', () => {
    const draft = renderEmailClassifierRuleDraft({ id: 34, senderEmail: 'kbiz@example.test', subject: 'Needs review', subtype: 'unrecognized_email' });
    expect(JSON.parse(draft)).toMatchObject({ draftOnly: true, enabled: false, sourceEventId: 34, handlerKey: 'none' });
    expect(draft).not.toContain(input.textBody!);
    expect(draft).toContain('Never auto-enable this draft.');
  });
});
