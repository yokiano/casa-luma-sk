import { createHash } from 'node:crypto';
import { and, eq, gt, inArray, lte } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/client';
import {
  emailAutomationActions,
  emailEvents,
  emailReceiptUploadSessions
} from '$lib/server/db/schema';
import { appendCompanyLedgerReceipt } from '$lib/server/ledger-expenses';
import { uploadBlobToNotion } from '$lib/server/notion/upload';

export const TELEGRAM_RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
export const TELEGRAM_RECEIPT_SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

type TelegramReceiptCandidate = {
  fileId: string;
  fileUniqueId: string;
  declaredSize?: number;
};

type DetectedImage = { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; extension: 'jpg' | 'png' | 'webp' };

const cleanError = (value: unknown) => (value instanceof Error ? value.message : String(value))
  .replace(/https:\/\/api\.telegram\.org\/file\/bot[^/\s]+/gi, '[Telegram file URL redacted]')
  .replace(/[\r\n]+/g, ' ')
  .slice(0, 300);

export const detectReceiptImage = (bytes: Uint8Array): DetectedImage | null => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (
    bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  return null;
};

const telegramTimeoutMs = () => {
  const parsed = Number(env.EMAIL_AUTOMATION_TELEGRAM_UPLOAD_TIMEOUT_MS || 15_000);
  return Number.isFinite(parsed) && parsed >= 1_000 && parsed <= 120_000 ? parsed : 15_000;
};

const fetchWithTimeout = async (url: string, init?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), telegramTimeoutMs());
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const downloadTelegramImage = async (candidate: TelegramReceiptCandidate) => {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error('Telegram bot is not configured.');
  if (candidate.declaredSize && candidate.declaredSize > TELEGRAM_RECEIPT_MAX_BYTES) {
    throw new Error('The image exceeds the 10 MB upload limit.');
  }

  const metadataResponse = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: candidate.fileId })
  });
  if (!metadataResponse.ok) throw new Error(`Telegram getFile failed with HTTP ${metadataResponse.status}.`);
  const metadata = await metadataResponse.json() as {
    ok?: boolean;
    result?: { file_path?: unknown; file_size?: unknown };
  };
  const filePath = metadata.result?.file_path;
  const reportedSize = metadata.result?.file_size;
  if (!metadata.ok || typeof filePath !== 'string' || !/^[A-Za-z0-9_./-]+$/.test(filePath) || filePath.includes('..')) {
    throw new Error('Telegram returned invalid file metadata.');
  }
  if (typeof reportedSize === 'number' && reportedSize > TELEGRAM_RECEIPT_MAX_BYTES) {
    throw new Error('The image exceeds the 10 MB upload limit.');
  }

  const fileResponse = await fetchWithTimeout(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
  if (!fileResponse.ok) throw new Error(`Telegram file download failed with HTTP ${fileResponse.status}.`);
  const contentLength = Number(fileResponse.headers.get('content-length') || 0);
  if (contentLength > TELEGRAM_RECEIPT_MAX_BYTES) throw new Error('The image exceeds the 10 MB upload limit.');

  const reader = fileResponse.body?.getReader();
  if (!reader) throw new Error('Telegram returned an unreadable image response.');
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > TELEGRAM_RECEIPT_MAX_BYTES) {
      await reader.cancel();
      throw new Error('The image exceeds the 10 MB upload limit.');
    }
    chunks.push(value);
  }
  if (!totalBytes) throw new Error('Telegram returned an empty image.');
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const detected = detectReceiptImage(bytes);
  if (!detected) throw new Error('Only valid JPG, PNG, and WebP images are accepted.');
  return { bytes, ...detected };
};

export const startEmailReceiptUploadSession = async ({
  eventId,
  callbackQueryId,
  telegramUserId,
  telegramChatId,
  telegramThreadId,
  sourceMessageId,
  now = new Date()
}: {
  eventId: number;
  callbackQueryId: string;
  telegramUserId: number;
  telegramChatId: number;
  telegramThreadId?: number;
  sourceMessageId: number;
  now?: Date;
}) => db.transaction(async (tx) => {
  const [replayed] = await tx.select({
    id: emailReceiptUploadSessions.id,
    promptMessageId: emailReceiptUploadSessions.promptMessageId,
    status: emailReceiptUploadSessions.status,
    expiresAt: emailReceiptUploadSessions.expiresAt
  }).from(emailReceiptUploadSessions).where(eq(emailReceiptUploadSessions.callbackQueryId, callbackQueryId)).limit(1);
  if (replayed) return { ...replayed, created: false as const };

  const [event] = await tx.select({
    actionId: emailEvents.actionId,
    notionPageId: emailEvents.notionPageId
  }).from(emailEvents).where(eq(emailEvents.id, eventId)).limit(1);
  if (!event?.actionId || !event.notionPageId) {
    throw new Error('This email is not linked to a completed Ledger record.');
  }

  const [action] = await tx.select({
    id: emailAutomationActions.id,
    handlerKey: emailAutomationActions.handlerKey,
    status: emailAutomationActions.status,
    externalObjectId: emailAutomationActions.externalObjectId
  }).from(emailAutomationActions).where(eq(emailAutomationActions.id, event.actionId)).limit(1);
  if (
    !action
    || action.handlerKey !== 'company_ledger_expense'
    || !['succeeded', 'reconciled'].includes(action.status)
    || action.externalObjectId !== event.notionPageId
  ) {
    throw new Error('Receipt uploads are available only for a verified completed Ledger action.');
  }

  const sameManagerSession = and(
    eq(emailReceiptUploadSessions.eventId, eventId),
    eq(emailReceiptUploadSessions.telegramUserId, telegramUserId),
    eq(emailReceiptUploadSessions.telegramChatId, telegramChatId)
  );
  await tx.update(emailReceiptUploadSessions).set({ status: 'failed', updatedAt: now }).where(and(
    sameManagerSession,
    inArray(emailReceiptUploadSessions.status, ['awaiting_prompt', 'awaiting_photo']),
    lte(emailReceiptUploadSessions.expiresAt, now)
  ));
  await tx.update(emailReceiptUploadSessions).set({ status: 'failed', updatedAt: now }).where(and(
    sameManagerSession,
    eq(emailReceiptUploadSessions.status, 'processing'),
    lte(emailReceiptUploadSessions.updatedAt, new Date(now.getTime() - 15 * 60_000))
  ));
  await tx.update(emailReceiptUploadSessions).set({
    status: 'cancelled',
    updatedAt: now
  }).where(and(
    sameManagerSession,
    inArray(emailReceiptUploadSessions.status, ['awaiting_prompt', 'awaiting_photo'])
  ));

  const [session] = await tx.insert(emailReceiptUploadSessions).values({
    eventId,
    actionId: action.id,
    callbackQueryId,
    notionPageId: event.notionPageId,
    telegramUserId,
    telegramChatId,
    telegramThreadId,
    sourceMessageId,
    status: 'awaiting_prompt',
    expiresAt: new Date(now.getTime() + TELEGRAM_RECEIPT_SESSION_TTL_MS),
    updatedAt: now
  }).onConflictDoNothing().returning({
    id: emailReceiptUploadSessions.id,
    promptMessageId: emailReceiptUploadSessions.promptMessageId,
    status: emailReceiptUploadSessions.status,
    expiresAt: emailReceiptUploadSessions.expiresAt
  });
  if (session) return { ...session, created: true as const };

  const [active] = await tx.select({
    id: emailReceiptUploadSessions.id,
    promptMessageId: emailReceiptUploadSessions.promptMessageId,
    status: emailReceiptUploadSessions.status,
    expiresAt: emailReceiptUploadSessions.expiresAt
  }).from(emailReceiptUploadSessions).where(and(
    sameManagerSession,
    inArray(emailReceiptUploadSessions.status, ['awaiting_prompt', 'awaiting_photo', 'processing'])
  )).limit(1);
  if (!active) throw new Error('Could not create a receipt upload request.');
  return { ...active, created: false as const };
});

export const activateEmailReceiptUploadSession = async (sessionId: number, promptMessageId: number) => {
  const [updated] = await db.update(emailReceiptUploadSessions).set({
    promptMessageId,
    status: 'awaiting_photo',
    updatedAt: new Date()
  }).where(and(
    eq(emailReceiptUploadSessions.id, sessionId),
    eq(emailReceiptUploadSessions.status, 'awaiting_prompt')
  )).returning({ id: emailReceiptUploadSessions.id });
  if (!updated) throw new Error('Receipt upload request could not be activated.');
};

export const failEmailReceiptUploadSession = async (sessionId: number, error: unknown) => {
  await db.update(emailReceiptUploadSessions).set({
    status: 'failed',
    lastError: cleanError(error),
    updatedAt: new Date()
  }).where(and(
    eq(emailReceiptUploadSessions.id, sessionId),
    inArray(emailReceiptUploadSessions.status, ['awaiting_prompt', 'awaiting_photo', 'processing'])
  ));
};

export const processEmailReceiptUpload = async ({
  promptMessageId,
  telegramUserId,
  telegramChatId,
  telegramThreadId,
  candidate,
  now = new Date()
}: {
  promptMessageId: number;
  telegramUserId: number;
  telegramChatId: number;
  telegramThreadId?: number;
  candidate: TelegramReceiptCandidate;
  now?: Date;
}) => {
  const session = await db.transaction(async (tx) => {
    const [pending] = await tx.select().from(emailReceiptUploadSessions).where(and(
      eq(emailReceiptUploadSessions.promptMessageId, promptMessageId),
      eq(emailReceiptUploadSessions.telegramUserId, telegramUserId),
      eq(emailReceiptUploadSessions.telegramChatId, telegramChatId),
      eq(emailReceiptUploadSessions.status, 'awaiting_photo'),
      gt(emailReceiptUploadSessions.expiresAt, now)
    )).limit(1);
    if (!pending || (pending.telegramThreadId ?? undefined) !== telegramThreadId) return null;
    const [claimed] = await tx.update(emailReceiptUploadSessions).set({
      status: 'processing',
      updatedAt: now
    }).where(and(
      eq(emailReceiptUploadSessions.id, pending.id),
      eq(emailReceiptUploadSessions.status, 'awaiting_photo')
    )).returning();
    return claimed ?? null;
  });
  if (!session) return { matched: false as const };

  try {
    const image = await downloadTelegramImage(candidate);
    const fileIdentity = createHash('sha256').update(candidate.fileUniqueId).digest('hex').slice(0, 16);
    // Identity excludes the user-controlled document name so resending the
    // same Telegram file under another name cannot bypass reconciliation.
    const filename = `receipt-email-${session.eventId}-${fileIdentity}.${image.extension}`;
    const blob = new Blob([image.bytes], { type: image.mimeType });
    const upload = await uploadBlobToNotion(blob, filename);

    await db.update(emailReceiptUploadSessions).set({
      fileName: filename,
      mimeType: image.mimeType,
      sizeBytes: image.bytes.length,
      notionFileUploadId: upload.file_upload.id,
      telegramFileUniqueId: candidate.fileUniqueId,
      updatedAt: new Date()
    }).where(and(
      eq(emailReceiptUploadSessions.id, session.id),
      eq(emailReceiptUploadSessions.status, 'processing')
    ));

    await appendCompanyLedgerReceipt(session.notionPageId, upload, {
      eventId: session.eventId,
      actionId: session.actionId,
      actor: `telegram:${telegramUserId}`
    });

    const completedAt = new Date();
    const [completed] = await db.update(emailReceiptUploadSessions).set({
      status: 'succeeded',
      consumedAt: completedAt,
      updatedAt: completedAt,
      lastError: null
    }).where(and(
      eq(emailReceiptUploadSessions.id, session.id),
      eq(emailReceiptUploadSessions.status, 'processing')
    )).returning({ id: emailReceiptUploadSessions.id });
    if (!completed) throw new Error('Receipt upload session lost its processing claim.');

    return { matched: true as const, attached: true as const, eventId: session.eventId, fileName: filename };
  } catch (error) {
    await failEmailReceiptUploadSession(session.id, error);
    throw error;
  }
};
