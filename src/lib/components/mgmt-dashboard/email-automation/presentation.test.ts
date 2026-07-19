import { describe, expect, it } from 'vitest';
import { bodyWarning, formatJson, humanize } from './presentation';

describe('email automation review presentation', () => {
  it('keeps body warnings truthful for bounded or missing previews', () => {
    expect(bodyWarning('incomplete', '<script>alert(1)</script>', false)).toContain('untrusted evidence');
    expect(bodyWarning('complete', 'bounded text', true)).toContain('bounded body preview');
    expect(bodyWarning('complete', null, false)).toContain('No readable body preview');
    expect(bodyWarning('complete', 'bounded text', false)).toBeNull();
  });

  it('formats only text values for escaped Svelte interpolation', () => {
    const untrusted = '<script>alert(1)</script>';
    expect(formatJson({ body: untrusted })).toContain(untrusted);
    expect(humanize('review_in_progress')).toBe('review in progress');
  });
});
