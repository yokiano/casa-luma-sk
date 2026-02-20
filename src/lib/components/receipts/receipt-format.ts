const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const numberFormatter = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
};

export const formatAmount = (value?: number | null) => {
  if (value === null || value === undefined) return '—';
  return numberFormatter.format(value);
};

export const formatOptional = (value?: string | null) => {
  if (!value) return '—';
  return value;
};

export const formatDurationMinutes = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const minutes = Math.max(0, Math.round(value));
  const hoursPart = Math.floor(minutes / 60);
  const minutesPart = minutes % 60;

  if (hoursPart === 0) {
    return `${minutesPart}m`;
  }

  if (minutesPart === 0) {
    return `${hoursPart}h`;
  }

  return `${hoursPart}h ${minutesPart}m`;
};
