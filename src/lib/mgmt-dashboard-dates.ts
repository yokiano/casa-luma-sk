const BANGKOK_TIME_ZONE = 'Asia/Bangkok';
const DAY_MS = 24 * 60 * 60 * 1000;

export const bangkokDate = (offsetDays = 0, now = new Date()) => {
  const date = new Date(now.getTime() + offsetDays * DAY_MS);
  return new Intl.DateTimeFormat('en-CA', { timeZone: BANGKOK_TIME_ZONE }).format(date);
};

export const bangkokDayStartUtcIso = (bangkokIsoDate: string) => new Date(`${bangkokIsoDate}T00:00:00+07:00`).toISOString();

export const bangkokDateRangeUtc = (startBangkokIsoDate: string, endExclusiveBangkokIsoDate: string) => ({
  start: bangkokDayStartUtcIso(startBangkokIsoDate),
  endExclusive: bangkokDayStartUtcIso(endExclusiveBangkokIsoDate)
});

export const formatNotionDate = (value?: string | null) => {
  if (!value) return 'No date';

  const hasTime = value.includes('T');
  const date = new Date(hasTime ? value : `${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BANGKOK_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(hasTime ? { hour: '2-digit', minute: '2-digit' } : {})
  }).format(date);
};

export const compactDateLabel = (start?: string, end?: string | null) => {
  if (!start) return 'No date';
  const startLabel = formatNotionDate(start);
  if (end && end !== start) return `${startLabel} → ${formatNotionDate(end)}`;
  return startLabel;
};
