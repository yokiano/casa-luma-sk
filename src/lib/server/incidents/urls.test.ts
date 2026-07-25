import { describe, expect, it } from 'vitest';
import { normalizeSiteBaseUrl } from './urls';

describe('incident url helpers', () => {
  it('strips a legacy incident-route suffix from the configured base url', () => {
    expect(normalizeSiteBaseUrl('https://www.casalumakpg.com/tools/incidents')).toBe(
      'https://www.casalumakpg.com'
    );
  });

  it('strips the new management incident suffix too', () => {
    expect(normalizeSiteBaseUrl('https://admin.example.com/mgmt-dashboard/incidents')).toBe('https://admin.example.com');
  });

  it('keeps a plain site root base url unchanged', () => {
    expect(normalizeSiteBaseUrl('https://admin.example.com/')).toBe('https://admin.example.com');
  });

  it('builds incident links from a normalized base url', () => {
    const base = normalizeSiteBaseUrl('https://www.casalumakpg.com/tools/incidents');
    expect(base ? `${base}/mgmt-dashboard/incidents/64` : null).toBe('https://www.casalumakpg.com/mgmt-dashboard/incidents/64');
  });
});
