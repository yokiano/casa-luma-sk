# Research: Replicate Node.js/serverless usage for SvelteKit

## Summary
Use the official `replicate` npm package only from SvelteKit server code (`+server.ts`, server-only modules, or form actions), never browser code. Keep `REPLICATE_API_TOKEN` and any model-specific secret inputs in private environment variables, prefer `replicate.run()` for short translation-like requests, and fall back to `predictions.create()` + polling/webhooks for longer jobs.

## Findings
1. **Official Node client is the recommended integration path** — Install with `npm install replicate`, import `Replicate`, and instantiate with `new Replicate({ auth })`; if `auth` is omitted, the client defaults to `process.env.REPLICATE_API_TOKEN`. The package is typed, uses `fetch`, supports Node/Bun/Deno, and is documented as compatible with common serverless platforms including Cloudflare Workers, Vercel Functions, and AWS Lambda. It cannot call Replicate directly from a browser. [npm package](https://www.npmjs.com/package/replicate), [Node guide](https://replicate.com/docs/get-started/nodejs)
2. **API keys must be server-only secrets** — Replicate API tokens are secrets, start with `r8_`, and should be stored in environment variables rather than source code. Tokens can be separated by environment/project and disabled if leaked. HTTP requests authenticate with `Authorization: Bearer $REPLICATE_API_TOKEN`; the JS client handles this when configured. [API tokens](https://replicate.com/docs/topics/security/api-tokens), [HTTP API](https://replicate.com/docs/reference/http)
3. **Model inputs are model-specific; inspect schema before coding** — Replicate says each model defines its own JSON input schema, visible in the model page API tab or via model/version metadata. Official models can often be called by `{owner}/{model}`, while community models usually require a pinned `{owner}/{model}:{version_id}` or `version`. [HTTP API](https://replicate.com/docs/reference/http), [Create a prediction](https://replicate.com/docs/topics/predictions/create-a-prediction)
4. **Translation-ish model example: `jigsawstack/text-translate`** — This Replicate model wraps JigsawStack translation. Inputs: `text` string or array, required `target_language` code, optional `current_language`, and required `api_key` (JigsawStack). Output is a translated string for a string input or an array for array input. Predictions typically complete within ~2 seconds and run on CPU. Because it requires a third-party API key, pass that key from a private env var and only to a model author you trust. [jigsawstack/text-translate](https://replicate.com/jigsawstack/text-translate), [Secrets](https://replicate.com/docs/topics/predictions/secrets)
5. **Use sync for short user-facing requests; async/polling for longer jobs** — Replicate has sync and async prediction modes. Sync keeps the request open up to 60 seconds by default and returns output if the model finishes; async returns a prediction ID immediately. Polling means repeatedly calling `predictions.get` until a terminal status (`succeeded`, `failed`, `canceled`/`aborted`). The JS `replicate.run()` helper uses the sync API and can either block or poll; `predictions.create({ wait })`, `predictions.get(id)`, and `replicate.wait(prediction)` expose lower-level lifecycle control. [Create a prediction](https://replicate.com/docs/topics/predictions/create-a-prediction), [Prediction lifecycle](https://replicate.com/docs/topics/predictions/lifecycle), [npm package](https://www.npmjs.com/package/replicate)
6. **Prediction states and errors must be surfaced carefully** — Statuses include `starting`, `processing`, `succeeded`, `failed`, `canceled`, and `aborted`. Failed predictions include an `error` field; `replicate.run()` throws `Error` if prediction fails. Replicate rate limits create-prediction calls at 600/min and other endpoints at 3000/min; 429 responses indicate rate limiting. API prediction input/output/logs are removed after an hour by default, so persist anything needed. [Prediction lifecycle](https://replicate.com/docs/topics/predictions/lifecycle), [HTTP API](https://replicate.com/docs/reference/http), [npm package](https://www.npmjs.com/package/replicate)
7. **Webhooks are an alternative to polling** — For background jobs, create predictions with `webhook` and `webhook_events_filter` such as `['completed']`. Replicate retries webhook delivery and signs webhook requests; the JS package includes `validateWebhook()` for verification. Webhook handlers should be idempotent. [HTTP API](https://replicate.com/docs/reference/http), [npm package](https://www.npmjs.com/package/replicate)

## Implementation recommendations for this SvelteKit repo

### 1. Keep all Replicate code in server-only modules
- Use `src/lib/server/replicate.ts` or call directly from `+server.ts` endpoints/actions.
- Do **not** import `replicate` from client components or shared `$lib` modules that may be bundled for the browser.
- Use SvelteKit private env imports, e.g. `$env/static/private` or `$env/dynamic/private`; never prefix secrets with `PUBLIC_`.

```ts
// src/lib/server/replicate.ts
import Replicate from 'replicate';
import { REPLICATE_API_TOKEN } from '$env/static/private';

if (!REPLICATE_API_TOKEN) {
  throw new Error('Missing REPLICATE_API_TOKEN');
}

export const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });
```

### 2. Suggested endpoint shape for short translation requests
```ts
// src/routes/api/translate/+server.ts
import { json, error } from '@sveltejs/kit';
import { replicate } from '$lib/server/replicate';
import { JIGSAWSTACK_API_KEY } from '$env/static/private';

export async function POST({ request }) {
  const { text, target_language, current_language } = await request.json();

  if (!text || !target_language) throw error(400, 'Missing text or target_language');
  if (!JIGSAWSTACK_API_KEY) throw error(500, 'Translation provider is not configured');

  try {
    const output = await replicate.run('jigsawstack/text-translate', {
      input: {
        text,
        target_language,
        current_language,
        api_key: JIGSAWSTACK_API_KEY
      },
      wait: { mode: 'block', timeout: 10 }
    });

    return json({ output });
  } catch (err) {
    console.error('Replicate translation failed', err);
    throw error(502, 'Translation failed');
  }
}
```

Notes:
- Confirm the exact model identifier/version in the model page API tab before shipping. For community models, pin a full version ID for reproducibility.
- Since `jigsawstack/text-translate` needs a third-party `api_key`, consider whether direct use of that provider is preferable; if using Replicate, restrict usage and trust the model author.

### 3. Async/polling pattern for longer predictions
```ts
let prediction = await replicate.predictions.create({
  version: '<64-char-version-id>',
  input: { /* model inputs */ }
});

while (!['succeeded', 'failed', 'canceled', 'aborted'].includes(prediction.status)) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  prediction = await replicate.predictions.get(prediction.id);
}

if (prediction.status !== 'succeeded') {
  throw new Error(prediction.error ? String(prediction.error) : `Prediction ${prediction.status}`);
}
```

### 4. Practical production guidance
- Validate request size and input language codes before calling Replicate.
- Add an application-level timeout/abort; use prediction deadlines or cancellation for expensive jobs.
- Map Replicate/model failures to safe user messages while logging prediction IDs/statuses server-side.
- Avoid logging secret inputs (`REPLICATE_API_TOKEN`, third-party API keys, user-sensitive text if applicable).
- Persist returned output immediately if needed beyond Replicate’s default data retention window.
- For high-volume or background flows, prefer queued jobs plus polling/webhooks over holding web requests open.

## Sources
- Kept: Replicate Node.js guide (https://replicate.com/docs/get-started/nodejs) — official quickstart for Node usage.
- Kept: `replicate` npm package (https://www.npmjs.com/package/replicate) — client API, serverless/browser warning, `run`, `predictions.create/get`, `wait`, webhook validation, errors.
- Kept: Create a prediction (https://replicate.com/docs/topics/predictions/create-a-prediction) — sync vs async, polling, deadlines, web URLs.
- Kept: Prediction lifecycle (https://replicate.com/docs/topics/predictions/lifecycle) — statuses, timeouts, monitoring.
- Kept: API tokens (https://replicate.com/docs/topics/security/api-tokens) — token handling and rotation guidance.
- Kept: Secrets (https://replicate.com/docs/topics/predictions/secrets) — model secret inputs and env-var guidance.
- Kept: HTTP API reference (https://replicate.com/docs/reference/http) — endpoints, auth, rate limits, response/error fields, data retention.
- Kept: jigsawstack/text-translate (https://replicate.com/jigsawstack/text-translate) — concrete translation model inputs/outputs and runtime notes.
- Dropped: Generic search/model listing pages — redundant once official API/client docs and target model page were available.

## Gaps
- The exact best translation model for this app cannot be chosen from docs alone; compare quality, latency, cost, trust, and whether a third-party key is required.
- Need to inspect this repo’s deployment target (Node adapter, Vercel, Cloudflare, etc.) before choosing blocking vs polling/webhook defaults and timeout values.
