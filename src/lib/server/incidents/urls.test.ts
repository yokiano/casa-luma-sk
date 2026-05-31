import { describe, expect, it } from 'vitest';
import { normalizeSiteBaseUrl } from './urls';

describe('incident url helpers', () => {
  it('strips a trailing /tools/incidents suffix from the configured base url', () => {
    expect(normalizeSiteBaseUrl('https://www.casalumakpg.com/tools/incidents')).toBe(
      'https://www.casalumakpg.com'
    );
  });

  it('keeps a plain site root base url unchanged', () => {
    expect(normalizeSiteBaseUrl('https://admin.example.com/')).toBe('https://admin.example.com');
  });

  it('builds incident links from a normalized base url', () => {
    const base = normalizeSiteBaseUrl('https://www.casalumakpg.com/tools/incidents');
    expect(base ? `${base}/tools/incidents/64` : null).toBe('https://www.casalumakpg.com/tools/incidents/64');
  });
});
