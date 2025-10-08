export function priceStringToNumber(value: string | null | undefined): number | null {
  if (value == null) return null;
  const cleaned = String(value).replace(/[^0-9.,]/g, '').replace(/,/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractLazadaUrls(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/\s|,|;|\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && /lazada\.co\./i.test(s))
    )
  );
}

