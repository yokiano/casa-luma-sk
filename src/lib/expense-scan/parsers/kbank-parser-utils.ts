export function splitLines(rawText: string): string[] {
  return rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function extractAmount(rawText: string): number | null {
  const patterns = [
    /Total\s+([\d,]+\.\d{2})/i,
    /Amount\s*\(Baht\)\s+([\d,]+\.\d{2})/i,
    /Amount\s*(?:\(\s*Baht\s*\))?\s*([\d,]+\.\d{2})\s+(?:Ba(?:ht|nt)|sant)\b/i,
    /To\s+([\d,]+\.\d{2})/i
  ];

  for (const pattern of patterns) {
    const match = rawText.match(pattern);
    if (match) return parseFloat(match[1].replace(/,/g, ''));
  }

  return null;
}

export function extractMemo(rawText: string): string | null {
  const inlineMatch = rawText.match(/Memo\s+(.+)/i);
  if (inlineMatch?.[1]) {
    const memo = inlineMatch[1].trim();
    if (memo) return memo;
  }

  const lines = splitLines(rawText);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('memo') && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine && !nextLine.toLowerCase().includes('issued by')) {
        return nextLine;
      }
    }
  }

  return null;
}

export function extractSlashDate(rawText: string): string | null {
  const match = rawText.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
  return match ? match[1] : null;
}

export function extractAprStyleDate(rawText: string): string | null {
  const match = rawText.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})\s+(\d{2}:\d{2})/i);
  if (!match) return null;

  const [, dayRaw, monthRaw, yearRaw, time] = match;
  const months: Record<string, string> = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12'
  };

  const month = months[monthRaw.toLowerCase()];
  if (!month) return null;

  const day = dayRaw.padStart(2, '0');
  const year = `20${yearRaw}`;
  return `${day}/${month}/${year} ${time}`;
}

export function extractDate(rawText: string): string | null {
  return extractSlashDate(rawText) ?? extractAprStyleDate(rawText);
}

export function hasAprStyleDate(rawText: string): boolean {
  return /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})\s+(\d{2}:\d{2})/i.test(rawText);
}

export function extractRecipientAfterTo(rawText: string, stopPatterns: RegExp[]): string | null {
  const lines = splitLines(rawText);
  const toIndex = lines.findIndex((line) => /^to$/i.test(line) || /ไป\s*ยัง/i.test(line));

  if (toIndex === -1) return null;

  for (let i = toIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (stopPatterns.some((pattern) => pattern.test(line))) return null;
    if (isLikelyRecipientLine(line)) return line;
  }

  return null;
}

function isLikelyRecipientLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (!line || line.length < 2) return false;

  const excludedPatterns = [
    /^from$/i,
    /^to$/i,
    /^amount$/i,
    /^fee$/i,
    /^memo\b/i,
    /^transaction\s+(id|no\.?)/i,
    /^reference\s+no/i,
    /^received\s+date/i,
    /^biller\s+id/i,
    /^kasikornbank$/i,
    /^government\s+savings\s+bank$/i,
    /^xxx[-x\d]/i,
    /^\(/,
    /baht/i,
    /bant/i
  ];

  if (excludedPatterns.some((pattern) => pattern.test(lower))) return false;
  return true;
}
