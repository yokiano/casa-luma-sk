import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { AUTH_PASSWORD, MANAGER_PASSWORD } from '$env/static/private';

export type ToolsRole = 'manager' | 'staff';

const VERSION = 'v1';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Derives a server-only signing key from the existing login secrets. Cookie
 * values are claims, not authorization: every accepted claim must be signed.
 */
export const deriveToolsSessionSigningKey = (managerPassword: string, authPassword: string) =>
  createHash('sha256').update(`casa-luma-tools-session\0${managerPassword}\0${authPassword}`).digest();

const signatureFor = (role: ToolsRole, expiresAt: number, key: Uint8Array) =>
  createHmac('sha256', key).update(`${VERSION}.${role}.${expiresAt}`).digest('base64url');

export const createToolsSessionCookie = (
  role: ToolsRole,
  key: Uint8Array,
  now = Date.now(),
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS
) => {
  const expiresAt = Math.floor(now / 1000) + maxAgeSeconds;
  return `${VERSION}.${role}.${expiresAt}.${signatureFor(role, expiresAt, key)}`;
};

/** Returns no role for malformed, expired, unsigned, or legacy literal cookies. */
export const readToolsSessionRole = (cookie: string | undefined, key: Uint8Array, now = Date.now()): ToolsRole | undefined => {
  if (!cookie) return undefined;
  const [version, role, rawExpiry, signature, ...rest] = cookie.split('.');
  if (version !== VERSION || (role !== 'manager' && role !== 'staff') || !rawExpiry || !signature || rest.length > 0) return undefined;
  if (!/^\d{10,}$/.test(rawExpiry)) return undefined;
  const expiresAt = Number(rawExpiry);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return undefined;
  const expected = Buffer.from(signatureFor(role, expiresAt, key));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? role : undefined;
};

const signingKey = () => deriveToolsSessionSigningKey(MANAGER_PASSWORD, AUTH_PASSWORD);

export const createConfiguredToolsSessionCookie = (role: ToolsRole) => createToolsSessionCookie(role, signingKey());
export const readConfiguredToolsSessionRole = (cookie: string | undefined) => readToolsSessionRole(cookie, signingKey());
export { SESSION_MAX_AGE_SECONDS };
