/**
 * Date utility functions for Casa Luma
 */

/**
 * Returns a YYYY-MM-DD string for a date in the Bangkok timezone (UTC+7)
 */
export function getBangkokDateStr(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Bangkok',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(d);
}

/**
 * Returns the day of the week (0-6, 0=Sunday) for a date in the Bangkok timezone
 */
export function getBangkokDayOfWeek(date: Date | string): number {
	const d = typeof date === 'string' ? new Date(date) : date;
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Asia/Bangkok',
		weekday: 'short'
	}).formatToParts(d);
	
	const weekday = parts.find(p => p.type === 'weekday')?.value;
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	return days.indexOf(weekday || '');
}

/**
 * Parses a YYYY-MM-DD string as a Date object at midnight in Bangkok time
 */
export function parseBangkokDate(dateStr: string): Date {
	// "2026-01-27" -> 2026-01-27T00:00:00+07:00
	return new Date(`${dateStr}T00:00:00+07:00`);
}
