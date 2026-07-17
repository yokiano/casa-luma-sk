import dotenv from 'dotenv';
import { createServer } from 'node:http';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_API_ROOT = 'https://gmail.googleapis.com/gmail/v1/users/me';

type OAuthClient = {
  client_id: string;
  client_secret: string;
  auth_uri: string;
  token_uri: string;
  redirect_uris?: string[];
};

type OAuthClientFile = {
  installed?: OAuthClient;
  web?: OAuthClient;
};

type Token = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
};

type GmailHeader = { name: string; value: string };
type GmailPart = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
};
type GmailMessage = {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: GmailPart & { headers?: GmailHeader[] };
  sizeEstimate?: number;
};
type GmailListResponse = {
  messages?: Array<{ id: string; threadId?: string }>;
  resultSizeEstimate?: number;
};
type GmailProfile = { emailAddress: string; messagesTotal?: number; threadsTotal?: number };

type OAuthError = { error?: string; error_description?: string };

const args = process.argv.slice(2);
const hasFlag = (flag: string) => args.includes(flag);
const getArg = (name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const expandHome = (value: string) => value.startsWith('~/') ? `${homedir()}/${value.slice(2)}` : value;
const clientFile = expandHome(process.env.GMAIL_OAUTH_CLIENT_FILE ?? '');
const tokenFile = expandHome(process.env.GMAIL_OAUTH_TOKEN_FILE ?? '~/.config/casa-luma/gmail-token.json');
const query = getArg('--query') ?? process.env.GMAIL_QUERY ?? 'in:anywhere newer_than:30d';
const limit = Number.parseInt(getArg('--limit') ?? process.env.GMAIL_MAX_MESSAGES ?? '20', 10);
const download = hasFlag('--download');
const downloadDir = expandHome(process.env.GMAIL_DOWNLOAD_DIR ?? '~/.cache/casa-luma/gmail');

if (!clientFile) {
  throw new Error('GMAIL_OAUTH_CLIENT_FILE is required. Point it to the downloaded Google Desktop OAuth JSON file.');
}
if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
  throw new Error('The message limit must be an integer between 1 and 100.');
}

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, 'utf8')) as T;

const getClient = async (): Promise<OAuthClient> => {
  const config = await readJson<OAuthClientFile>(clientFile);
  const client = config.installed ?? config.web;
  if (!client?.client_id || !client.client_secret || !client.auth_uri || !client.token_uri) {
    throw new Error('The OAuth client JSON does not contain a usable installed/web client configuration.');
  }
  return client;
};

const requestJson = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    const error = body as OAuthError | undefined;
    throw new Error(`Google API request failed (${response.status}): ${error?.error_description ?? error?.error ?? 'unknown error'}`);
  }
  return JSON.parse(text) as T;
};

const saveToken = async (file: string, token: Token) => {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, `${JSON.stringify(token, null, 2)}\n`, { mode: 0o600 });
  await chmod(file, 0o600);
};

const authorize = async (client: OAuthClient): Promise<Token> => {
  const state = randomBytes(24).toString('hex');
  const server = createServer();
  await new Promise<void>((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start the local OAuth callback server.');
  const redirectUri = `http://localhost:${address.port}/oauth2callback`;

  const authorizationUrl = new URL(client.auth_uri);
  authorizationUrl.search = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_READONLY_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state
  }).toString();

  console.log('Open this URL in a browser and authorize the Gmail read-only access:');
  console.log(authorizationUrl.toString());
  console.log('Waiting for the OAuth callback on the local machine...');

  const code = await new Promise<string>((resolveCode, rejectCode) => {
    const timeout = setTimeout(() => {
      server.close();
      rejectCode(new Error('Timed out waiting for the OAuth callback after 10 minutes.'));
    }, 10 * 60 * 1000);

    server.on('request', (request, response) => {
      try {
        const requestUrl = new URL(request.url ?? '/', redirectUri);
        if (requestUrl.pathname !== '/oauth2callback') {
          response.writeHead(404).end();
          return;
        }
        if (requestUrl.searchParams.get('state') !== state) {
          response.writeHead(400).end('Invalid OAuth state.');
          clearTimeout(timeout);
          server.close();
          rejectCode(new Error('OAuth state validation failed.'));
          return;
        }
        const oauthError = requestUrl.searchParams.get('error');
        if (oauthError) {
          response.writeHead(400).end('OAuth authorization was denied.');
          clearTimeout(timeout);
          server.close();
          rejectCode(new Error(`OAuth authorization failed: ${oauthError}`));
          return;
        }
        const receivedCode = requestUrl.searchParams.get('code');
        if (!receivedCode) {
          response.writeHead(400).end('Missing OAuth code.');
          clearTimeout(timeout);
          server.close();
          rejectCode(new Error('OAuth callback did not include an authorization code.'));
          return;
        }
        response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Authorization complete. You can close this browser tab.');
        clearTimeout(timeout);
        server.close();
        resolveCode(receivedCode);
      } catch (error) {
        clearTimeout(timeout);
        server.close();
        rejectCode(error);
      }
    });
  });

  const tokenParams = new URLSearchParams({
    code,
    client_id: client.client_id,
    client_secret: client.client_secret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });
  const token = await requestJson<Token>(client.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams
  });
  if (!token.refresh_token) {
    throw new Error('Google did not return a refresh token. Reauthorize with prompt=consent or remove the app permission and try again.');
  }
  await saveToken(tokenFile, token);
  return token;
};

const getAccessToken = async (client: OAuthClient): Promise<string> => {
  let token: Token | undefined;
  if (existsSync(tokenFile)) token = await readJson<Token>(tokenFile);

  // Some older token files omit expiry_date. If a refresh token exists, refresh
  // instead of trusting an access token that Gmail may already have revoked.
  if (token?.access_token && !token.refresh_token && (!token.expiry_date || token.expiry_date > Date.now() + 60_000)) {
    return token.access_token;
  }

  if (token?.refresh_token) {
    const refreshParams = new URLSearchParams({
      client_id: client.client_id,
      client_secret: client.client_secret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token'
    });
    const refreshed = await requestJson<Token>(client.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: refreshParams
    });
    await saveToken(tokenFile, { ...token, ...refreshed, refresh_token: token.refresh_token });
    return refreshed.access_token!;
  }

  if (token?.access_token) return token.access_token;

  token = await authorize(client);
  return token.access_token!;
};

const gmailRequest = async <T>(accessToken: string, path: string): Promise<T> => requestJson<T>(`${GMAIL_API_ROOT}${path}`, {
  headers: { Authorization: `Bearer ${accessToken}` }
});

const collectBodyStats = (part: GmailPart | undefined): { bodyBytes: number; attachmentCount: number } => {
  if (!part) return { bodyBytes: 0, attachmentCount: 0 };
  const ownBodyBytes = part.body?.data ? Buffer.from(part.body.data, 'base64url').byteLength : 0;
  const ownAttachmentCount = part.filename && part.body?.attachmentId ? 1 : 0;
  return (part.parts ?? []).reduce(
    (stats, child) => {
      const childStats = collectBodyStats(child);
      return {
        bodyBytes: stats.bodyBytes + childStats.bodyBytes,
        attachmentCount: stats.attachmentCount + childStats.attachmentCount
      };
    },
    { bodyBytes: ownBodyBytes, attachmentCount: ownAttachmentCount }
  );
};

const headerExists = (message: GmailMessage, name: string) => Boolean(
  message.payload?.headers?.some((header) => header.name.toLowerCase() === name.toLowerCase())
);

const client = await getClient();
const accessToken = await getAccessToken(client);
const profile = await gmailRequest<GmailProfile>(accessToken, '/profile');
const listed = await gmailRequest<GmailListResponse>(accessToken, `/messages?maxResults=${limit}&q=${encodeURIComponent(query)}`);
const messages = listed.messages ?? [];
const fetched: Array<{ internalDate?: string; sizeEstimate?: number; bodyBytes: number; attachmentCount: number; hasSubject: boolean; downloaded?: string }> = [];

for (const listedMessage of messages) {
  const message = await gmailRequest<GmailMessage>(accessToken, `/messages/${encodeURIComponent(listedMessage.id)}?format=full`);
  const bodyStats = collectBodyStats(message.payload);
  const summary = {
    internalDate: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : undefined,
    sizeEstimate: message.sizeEstimate,
    ...bodyStats,
    hasSubject: headerExists(message, 'Subject')
  };

  if (download) {
    const raw = await gmailRequest<{ raw?: string }>(accessToken, `/messages/${encodeURIComponent(listedMessage.id)}?format=raw`);
    if (!raw.raw) throw new Error(`Message ${listedMessage.id} did not include raw content.`);
    await mkdir(downloadDir, { recursive: true, mode: 0o700 });
    const filename = `${summary.internalDate?.replaceAll(':', '-') ?? Date.now()}-${listedMessage.id}.eml`;
    const outputPath = resolve(downloadDir, filename);
    await writeFile(outputPath, Buffer.from(raw.raw, 'base64url'), { mode: 0o600 });
    await chmod(outputPath, 0o600);
    fetched.push({ ...summary, downloaded: outputPath });
  } else {
    fetched.push(summary);
  }
}

console.log(JSON.stringify({
  ok: true,
  account: profile.emailAddress,
  query,
  listed: messages.length,
  fetched: fetched.length,
  messages: fetched,
  downloadDirectory: download ? downloadDir : undefined
}, null, 2));
