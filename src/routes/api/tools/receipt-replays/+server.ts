import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readConfiguredToolsSessionRole } from '$lib/server/tools-session';
import {
  getReceiptReplayRun,
  parseReceiptReplayRequest,
  replayReceiptWebhook,
  validateReplayRunId
} from '$lib/server/receipts/replay-receipt-webhook';
import { getSafeErrorSummary } from '$lib/server/errors/safe-error';
import { db } from '$lib/server/db/client';

const requireManager = (cookies: Parameters<RequestHandler>[0]['cookies']) => {
  // This endpoint is not protected by a page layout. Re-read and verify the
  // signed cookie at the API boundary so direct requests cannot bypass auth.
  return readConfiguredToolsSessionRole(cookies.get('casa_luma_tools_auth')) === 'manager';
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  if (!requireManager(cookies)) return json({ error: 'Manager authorization is required' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const parsed = parseReceiptReplayRequest(body);
  if ('error' in parsed) return json({ error: parsed.error }, { status: 400 });

  try {
    const runs = await replayReceiptWebhook(parsed.value, { database: db });
    return json({ runs });
  } catch (error) {
    console.error('[receipt-replay] request failed', getSafeErrorSummary(error));
    const message = error instanceof Error && /disabled|requires confirmation|confirmation=/.test(error.message)
      ? error.message
      : 'Receipt replay could not be started.';
    return json({ error: message }, { status: 400 });
  }
};

export const GET: RequestHandler = async ({ url, cookies }) => {
  if (!requireManager(cookies)) return json({ error: 'Manager authorization is required' }, { status: 403 });

  const runId = validateReplayRunId(url.searchParams.get('runId'));
  if (!runId) return json({ error: 'A positive runId is required' }, { status: 400 });

  try {
    const run = await getReceiptReplayRun(db, runId);
    if (!run) return json({ error: 'Replay run not found' }, { status: 404 });
    return json({ run });
  } catch (error) {
    console.error('[receipt-replay] result lookup failed', getSafeErrorSummary(error));
    return json({ error: 'Replay result is temporarily unavailable' }, { status: 503 });
  }
};
