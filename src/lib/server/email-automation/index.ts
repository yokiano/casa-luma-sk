import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { FINANCIAL_LEDGER_PROP_VALUES } from '$lib/notion-sdk/dbs/financial-ledger/constants';
import { emailClassificationRules } from '$lib/server/db/schema';
import { classifyEmailWithDiagnostics, createEmailAutomationHash, matchesIgnoredSender, type EmailAutomationInput, type EmailClassification, type EmailClassificationRuleInput } from './classifier';
import { validateHandler } from './handlers/registry';
import { processOneEmailAutomationItem } from './processor';
import { persistDurableEmailIntent } from './store';
import { loadAutomationSettings } from './settings';
import { applyEmailAutomationSafetyPolicy } from './ledger-safety';
import { findExpenseScanRule } from '$lib/server/expense-scan-rules';

export type { EmailAutomationInput, EmailClassification } from './classifier';
export { renderEmailAutomationNotification } from './notifications';

const loadEnabledClassificationRules = async (): Promise<EmailClassificationRuleInput[]> => db.select({
  id: emailClassificationRules.id, priority: emailClassificationRules.priority,
  name: emailClassificationRules.name, classification: emailClassificationRules.classification, subtype: emailClassificationRules.subtype,
  senderPattern: emailClassificationRules.senderPattern, subjectPattern: emailClassificationRules.subjectPattern,
  bodyPatterns: emailClassificationRules.bodyPatterns, handlerKey: emailClassificationRules.handlerKey,
  ledgerDefaults: emailClassificationRules.ledgerDefaults, notifyPolicy: emailClassificationRules.notifyPolicy
}).from(emailClassificationRules).where(eq(emailClassificationRules.enabled, true)).orderBy(asc(emailClassificationRules.priority), asc(emailClassificationRules.id));

const asLedgerDefaults = (value: unknown): Record<string, string> => value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  : {};

/**
 * Email Ledger defaults must follow the same recipient rules as expense OCR.
 * A failed rule lookup becomes review instead of allowing an unclassified write.
 */
const applyExpenseScanDefaults = async (classification: EmailClassification): Promise<EmailClassification> => {
  if (classification.classification !== 'expense' || classification.processingState !== 'ready') return classification;
  if (!classification.description) {
    return {
      ...classification,
      processingState: 'review',
      reviewReason: 'No expense description/memo was extracted for Expense Scan rule matching. No external Ledger action was run.',
      notify: true
    };
  }

  let matchedRule;
  try {
    matchedRule = await findExpenseScanRule(classification.description);
  } catch {
    return {
      ...classification,
      processingState: 'review',
      reviewReason: 'Expense-scan rules could not be loaded. No external Ledger action was run.',
      notify: true
    };
  }
  if (!matchedRule) {
    return {
      ...classification,
      processingState: 'review',
      reviewReason: 'No expense-scan rule matched the extracted description. No external Ledger action was run.',
      notify: true
    };
  }

  const defaults = asLedgerDefaults(classification.ledgerDefaults);
  const mergedDefaults = {
    ...defaults,
    category: defaults.category || matchedRule.category || undefined,
    department: defaults.department || matchedRule.department || undefined,
    supplierId: defaults.supplierId || matchedRule.supplierId || undefined
  };
  const validCategories = FINANCIAL_LEDGER_PROP_VALUES.category as readonly string[];
  const validDepartments = FINANCIAL_LEDGER_PROP_VALUES.department as readonly string[];
  const invalidField = mergedDefaults.category && !validCategories.includes(mergedDefaults.category)
    ? 'category'
    : mergedDefaults.department && !validDepartments.includes(mergedDefaults.department)
      ? 'department'
      : null;
  const missingField = !mergedDefaults.category ? 'category' : !mergedDefaults.department ? 'department' : null;
  if (invalidField || missingField) {
    return {
      ...classification,
      processingState: 'review',
      reviewReason: invalidField
        ? `The matched expense-scan rule contains an invalid Ledger ${invalidField}. No external Ledger action was run.`
        : `The matched expense-scan rule has no Ledger ${missingField} value. No external Ledger action was run.`,
      notify: true
    };
  }

  return { ...classification, ledgerDefaults: mergedDefaults };
};

/**
 * Persists the event plus all intended work before any external call. A best-effort
 * single processor pass preserves the existing immediate UX; durable state remains
 * authoritative when Notion or Telegram is unavailable.
 */
export const ingestEmailAutomationEvent = async (input: EmailAutomationInput) => {
  const settings = await loadAutomationSettings();
  const rules = settings.automationEnabled ? await loadEnabledClassificationRules() : [];
  let classification: EmailClassification;
  let classifierDiagnostics: ReturnType<typeof classifyEmailWithDiagnostics>['diagnostics'];
  if (settings.automationEnabled || matchesIgnoredSender(input, settings.ignoredSenders)) {
    const classified = classifyEmailWithDiagnostics(input, rules, settings.ignoredSenders);
    classification = classified.classification;
    classifierDiagnostics = classified.diagnostics;
  } else {
    classification = { classification: 'ignore', subtype: 'automation_disabled', processingState: 'ignored', reviewReason: 'Email automation is disabled in dashboard settings.', notify: false };
    classifierDiagnostics = {
      classifierVersion: '1', selectedSource: 'built_in_fallback', selectedRuleId: null, selectedRuleName: null, evaluatedRules: [],
      final: { classification: 'ignore', subtype: 'automation_disabled', processingState: 'ignored', reviewReason: classification.reviewReason ?? null }
    };
  }
  classification = await applyExpenseScanDefaults(classification);
  const handlerResult = validateHandler(classification);
  // Unknown/incompatible handlers must never silently look ready.
  if (classification.processingState === 'ready' && handlerResult.error) {
    classification = { ...classification, processingState: 'review', reviewReason: handlerResult.error, notify: true };
  }
  classification = applyEmailAutomationSafetyPolicy(input, classification, settings.ledgerEnabled, settings.ledgerAllowedSenders, settings.ledgerMaxAmountThb);
  classifierDiagnostics = {
    ...classifierDiagnostics,
    final: {
      classification: classification.classification,
      subtype: classification.subtype,
      processingState: classification.processingState,
      reviewReason: classification.reviewReason ?? null
    }
  };
  const persisted = await persistDurableEmailIntent({
    input, classification, classifierDiagnostics, hash: createEmailAutomationHash(input), handler: handlerResult.handler,
    notificationsEnabled: settings.notificationsEnabled, ledgerEnabled: settings.ledgerEnabled
  });
  if (persisted.duplicate) return { ...persisted, classification };
  // Work was committed first. This pass can fail without losing recoverability.
  await processOneEmailAutomationItem();
  // The second bounded pass can deliver the independent outbox item after an
  // action succeeds. Recovery never depends on these best-effort passes.
  await processOneEmailAutomationItem();
  return { ...persisted, classification };
};
