import { createTelegramAlertPublisherFromEnv } from '$lib/server/alerts/telegram';
import { buildIncidentReportUrl } from './urls';
import { db } from '$lib/server/db/client';
import { reportedErrors } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { buildIncidentAlertPayload } from './telegram';
import { formatSafeErrorSummary, getSafeErrorSummary, sanitizeErrorText } from '$lib/server/errors/safe-error';
import type {
  IncidentReporterOptions,
  IncidentSeverity,
  ReportIncidentInput,
  ReportIncidentResult
} from './types';

export const shouldNotifyByDefault = (severity: IncidentSeverity, input?: ReportIncidentInput) => {
  if (input?.notify === false) return false;
  if (severity === 'critical') return true;
  return (
    typeof input?.code === 'string' &&
    (input.code === 'MEMBERSHIP_CREATED' ||
      input.code.startsWith('MEMBERSHIP_CREATION_') ||
      // Successful Flexi Pass creation is persisted, but is intentionally not a user-facing alert.
      input.code.startsWith('FLEXI_PASS_') ||
      input.code === 'RECEIPT_WEBHOOK_REPLAY_REQUESTED')
  );
};

export const getErrorDetails = (error: unknown): {
  errorName: string | null;
  errorMessage: string | null;
  errorStack: string | null;
} => {
  if (!error) return { errorName: null, errorMessage: null, errorStack: null };

  const summary = formatSafeErrorSummary(error);
  return {
    errorName: error instanceof Error ? sanitizeErrorText(error.name, 120) : 'NonErrorThrowable',
    errorMessage: summary,
    errorStack: error instanceof Error ? sanitizeErrorText(error.stack, 4_000) : null
  };
};

const logIncident = (input: ReportIncidentInput) => {
  const label = `[incident][${input.source}][${input.code}]`;
  const metadata = {
    severity: input.severity,
    merchantId: input.merchantId,
    receiptKey: input.receiptKey,
    webhookEventId: input.webhookEventId,
    context: input.context
  };

  if (input.severity === 'critical') {
    console.error(label, input.message, metadata, input.error ? getSafeErrorSummary(input.error) : undefined);
    return;
  }

  if (input.severity === 'warning') {
    console.warn(label, input.message, metadata);
    return;
  }

  console.log(label, input.message, metadata);
};

export const createIncidentReporter = (options: IncidentReporterOptions = {}) => {
  const publisher = options.publisher ?? null;
  const shouldNotify = options.shouldNotify;

  return {
    report: async (input: ReportIncidentInput): Promise<ReportIncidentResult> => {
      logIncident(input);
      const errorDetails = getErrorDetails(input.error);

      let incidentId: number | null = null;
      try {
        const inserted = await db
          .insert(reportedErrors)
          .values({
            source: input.source,
            code: input.code,
            severity: input.severity,
            message: input.message,
            merchantId: input.merchantId ?? null,
            receiptKey: input.receiptKey ?? null,
            webhookEventId: input.webhookEventId ?? null,
            context: input.context ?? null,
            payload: input.payload ?? null,
            errorName: errorDetails.errorName,
            errorMessage: errorDetails.errorMessage,
            errorStack: errorDetails.errorStack
          })
          .returning({ id: reportedErrors.id });

        incidentId = inserted[0]?.id ?? null;
      } catch (persistError) {
        console.error('[incident] failed to persist incident', getSafeErrorSummary(persistError));
      }

      const shouldSendNotification = input.notify === false
        ? false
        : shouldNotify
          ? shouldNotify(input.severity)
          : shouldNotifyByDefault(input.severity, input);

      if (!publisher || !shouldSendNotification) {
        return {
          incidentId,
          persisted: incidentId !== null,
          notified: false
        };
      }

      try {
        const notification = buildIncidentAlertPayload({
          ...input,
          context: {
            ...(input.context ?? {}),
            reportUrl: incidentId !== null ? buildIncidentReportUrl(incidentId) : null
          }
        });
        await publisher.publish(notification);

        if (incidentId !== null) {
          try {
            await db
              .update(reportedErrors)
              .set({ notified: true, notifiedAt: new Date(), notifyError: null })
              .where(eq(reportedErrors.id, incidentId));
          } catch (updateError) {
            console.error('[incident] failed to mark incident as notified', getSafeErrorSummary(updateError));
          }
        }

        return {
          incidentId,
          persisted: incidentId !== null,
          notified: true
        };
      } catch (notifyError) {
        console.error('[incident] failed to send Telegram alert', getSafeErrorSummary(notifyError));

        if (incidentId !== null) {
          try {
            await db
              .update(reportedErrors)
              .set({
                notified: false,
                notifiedAt: null,
                notifyError: sanitizeErrorText(
                  notifyError instanceof Error ? notifyError.message : String(notifyError)
                )
              })
              .where(eq(reportedErrors.id, incidentId));
          } catch (updateError) {
            console.error('[incident] failed to persist notification failure', getSafeErrorSummary(updateError));
          }
        }

        return {
          incidentId,
          persisted: incidentId !== null,
          notified: false
        };
      }
    }
  };
};

export const incidentReporter = createIncidentReporter({
  publisher: createTelegramAlertPublisherFromEnv()
});
