import { describe, expect, it } from 'vitest';
import { createToolsSessionCookie, deriveToolsSessionSigningKey, readToolsSessionRole } from './tools-session';

const key = deriveToolsSessionSigningKey('manager-test-password', 'staff-test-password');
const now = Date.UTC(2026, 6, 12, 12, 0, 0);

describe('signed tools sessions', () => {
  it('accepts a signed manager session', () => {
    const cookie = createToolsSessionCookie('manager', key, now);
    expect(readToolsSessionRole(cookie, key, now)).toBe('manager');
  });

  it('rejects a legacy literal role cookie and a changed signed role', () => {
    const cookie = createToolsSessionCookie('staff', key, now);
    expect(readToolsSessionRole('manager', key, now)).toBeUndefined();
    expect(readToolsSessionRole(cookie.replace('.staff.', '.manager.'), key, now)).toBeUndefined();
  });

  it('rejects expired sessions and signatures from another deployment secret', () => {
    const cookie = createToolsSessionCookie('manager', key, now, 1);
    expect(readToolsSessionRole(cookie, key, now + 1_001)).toBeUndefined();
    const otherKey = deriveToolsSessionSigningKey('another-manager-password', 'staff-test-password');
    expect(readToolsSessionRole(createToolsSessionCookie('manager', key, now), otherKey, now)).toBeUndefined();
  });
});
