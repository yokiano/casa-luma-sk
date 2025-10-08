/*
  Usage (PowerShell):
    pnpm run add:procurement -- "https://www.lazada.co.th/products/..." [--department "General"] [--status "Idea"] [--qty 1]

  Notes:
  - Requires NOTION_API_KEY in environment (loaded automatically if you use dotenv-cli or shell env).
  - Database id defaults to Procurement Tracker discovered id; can override with NOTION_PROCUREMENT_DB_ID.
*/

import 'dotenv/config';
import { createProcurementItem } from '../src/lib/server/notion/procurement';

type ScrapeResult = {
  mainImage: string | null;
  title: string | null;
  price: string | null; // normalized string like 1,234.56 or 1234
  link: string;
  storeName: string | null;
};

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  let url: string | undefined;
  let department: string | undefined;
  let status: string | undefined;
  let qty: number | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('-') && !url) {
      url = a;
      continue;
    }
    if (a === '--department' && args[i + 1]) {
      department = args[++i];
      continue;
    }
    if (a === '--status' && args[i + 1]) {
      status = args[++i];
      continue;
    }
    if ((a === '--qty' || a === '--quantity') && args[i + 1]) {
      qty = Number(args[++i]);
      continue;
    }
  }
  return { url, department, status, qty };
}

function priceStringToNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function scrape(url: string): Promise<ScrapeResult> {
  // Reuse the existing JS scraper by dynamic import
  const mod = await import('./scrape-lazada.mjs');
  // It exports only a CLI; we’ll call its internal functions via the HTTP path for speed if exposed.
  // Since it’s not exported, run it as a subprocess-like invocation by importing and using the same logic:
  const fn = (mod as any).scrapeWithPlaywright || (mod as any).default || null;
  if (fn) {
    try {
      const data = await fn(url, false);
      return data as ScrapeResult;
    } catch {}
  }
  // Fallback: spawn the script and read stdout JSON
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, ['scripts/scrape-lazada.mjs', url], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const chunks: Buffer[] = [];
  for await (const c of child.stdout) chunks.push(c as Buffer);
  const out = Buffer.concat(chunks).toString('utf8');
  try {
    const parsed = JSON.parse(out);
    return parsed as ScrapeResult;
  } catch {
    throw new Error('Failed to parse scraper output');
  }
}

async function main() {
  const { url, department, status, qty } = parseArgs(process.argv);
  if (!url) {
    console.error('Usage: pnpm run add:procurement -- <LAZADA_URL> [--department "General"] [--status "Idea"] [--qty 1]');
    process.exit(1);
  }

  const scraped = await scrape(url);

  const res = await createProcurementItem({
    item: scraped.title || 'Untitled Lazada Item',
    priceTHB: priceStringToNumber(scraped.price),
    linkToProduct: scraped.link,
    supplier: scraped.storeName || null,
    imageUrl: scraped.mainImage || null,
    department: department || 'General',
    status: status || 'Idea',
    objectCategories: null,
    quantity: qty ?? null,
  });

  console.log(`Created Notion page ${res.pageId}${res.url ? ' → ' + res.url : ''}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});



