import { describe, expect, it } from 'vitest';
import { getSafeContinueTo } from './safe-login-continue';

describe('safe login continuation', () => {
  it('allows local tools and management dashboard paths', () => {
    expect(getSafeContinueTo('/mgmt-dashboard/balances/submit')).toBe('/mgmt-dashboard/balances/submit');
    expect(getSafeContinueTo('/mgmt-dashboard/reconciliation?from=telegram')).toBe('/mgmt-dashboard/reconciliation?from=telegram');
    expect(getSafeContinueTo('/tools/close-shift')).toBe('/tools/close-shift');
  });

  it('rejects external, protocol-relative, and unsafe paths', () => {
    expect(getSafeContinueTo('https://evil.example')).toBe('/tools');
    expect(getSafeContinueTo('//evil.example/tools')).toBe('/tools');
    expect(getSafeContinueTo('/mgmt-dashboard\\evil')).toBe('/tools');
    expect(getSafeContinueTo('/other')).toBe('/tools');
    expect(getSafeContinueTo('/tools/login')).toBe('/tools');
  });
});
