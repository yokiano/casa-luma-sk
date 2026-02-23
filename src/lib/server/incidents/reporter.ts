import { createTelegramAlertPublisherFromEnv } from '$lib/server/alerts/telegram';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/client';
import { reportedErrors } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { buildIncidentAlertPayload } from './telegram';
import type {
  IncidentReporterOptions,
  IncidentSeverity,
  ReportIncidentInput,
  ReportIncidentResult
} from './types';

const shouldNotifyCriticalOnly = (severity: IncidentSeverity) => severity === 'critical';

const buildReportUrl = (incidentId: number | null): string | null => {
  if (incidentId === null) return null;
  const base = env.INCIDENT_REPORT_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/tools/incidents/${incidentId}`;
};

const getErrorDetails = (error: unknown): {
  errorName: string | null;
  errorMessage: string | null;
  errorStack: string | null;
} => {
  if (!error) {
    return { errorName: null, errorMessage: null, errorStack: null };
  }

  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack ?? null
    };
  }

  return {
    errorName: 'NonErrorThrowable',
    errorMessage: String(error),
    errorStack: null
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
    console.error(label, input.message, metadata, input.error);
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
  const shouldNotify = options.shouldNotify ?? shouldNotifyCriticalOnly;

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
        console.error('[incident] failed to persist incident', persistError);
      }

      if (!publisher || !shouldNotify(input.severity)) {
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
            reportUrl: buildReportUrl(incidentId)
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
            console.error('[incident] failed to mark incident as notified', updateError);
          }
        }

        return {
          incidentId,
          persisted: incidentId !== null,
          notified: true
        };
      } catch (notifyError) {
        console.error('[incident] failed to send Telegram alert', notifyError);

        if (incidentId !== null) {
          try {
            await db
              .update(reportedErrors)
              .set({
                notified: false,
                notifiedAt: null,
                notifyError: notifyError instanceof Error ? notifyError.message : String(notifyError)
              })
              .where(eq(reportedErrors.id, incidentId));
          } catch (updateError) {
            console.error('[incident] failed to persist notification failure', updateError);
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
