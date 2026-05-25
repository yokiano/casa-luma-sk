import { describe, expect, it } from 'vitest';
import { bangkokDate, bangkokDateRangeUtc, compactDateLabel } from './mgmt-dashboard-dates';

describe('mgmt dashboard date helpers', () => {
  it('builds Bangkok calendar-day UTC bounds for Notion date filters', () => {
    expect(bangkokDateRangeUtc('2026-05-24', '2026-05-25')).toEqual({
      start: '2026-05-23T17:00:00.000Z',
      endExclusive: '2026-05-24T17:00:00.000Z'
    });
  });

  it('uses calendar-day offsets in Bangkok, not rolling 24-hour labels', () => {
    const now = new Date('2026-05-24T18:30:00.000Z'); // 2026-05-25 01:30 in Bangkok

    expect(bangkokDate(-1, now)).toBe('2026-05-24');
    expect(bangkokDate(0, now)).toBe('2026-05-25');
    expect(bangkokDate(1, now)).toBe('2026-05-26');
  });

  it('formats Notion UTC date-times as human Bangkok dates', () => {
    expect(compactDateLabel('2026-05-23T17:30:00.000+00:00')).toContain('24 May');
  });
});
