import type { ScrapeResult } from '$lib/tools/types';
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Fetch a URL with a desktop browser-like User-Agent to avoid bot blocks.
 */
async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9',
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function extractMetaContent(html: string, propertyOrName: string) {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*?content=["']([^"']+)["'][^>]*?>`,
    'i'
  );
  const match = html.match(pattern);
  return match ? match[1] : undefined;
}

function extractAllJsonLd(html: string) {
  const results: any[] = [];
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRegex.exec(html)) !== null) {
    const raw = m[1].trim();
    try {
      const parsed = JSON.parse(raw);
      results.push(parsed);
    } catch {
      const candidates = raw
        .replace(/^[\s;]+|[\s;]+$/g, '')
        .split(/\n(?=\s*\{)/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const c of candidates) {
        try {
          results.push(JSON.parse(c));
        } catch {
          // ignore invalid chunk
        }
      }
    }
  }
  return results;
}

function findProductFromJsonLd(nodes: any[]): any {
  const flat: any[] = [];
  const stack = [...nodes];
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    if (Array.isArray(n)) {
      stack.push(...n);
      continue;
    }
    flat.push(n);
    for (const k of Object.keys(n)) {
      const v = (n as any)[k];
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return flat.find((n) => {
    const t = n['@type'];
    if (!t) return false;
    if (typeof t === 'string') return t.toLowerCase() === 'product';
    if (Array.isArray(t)) return t.map((x: any) => String(x).toLowerCase()).includes('product');
    return false;
  });
}

function getFromOffers(offers: any, key: string) {
  if (!offers) return undefined;
  if (Array.isArray(offers)) {
    for (const o of offers) {
      if (o && o[key] != null) return o[key];
    }
    return undefined;
  }
  return offers[key];
}

function normalizePriceString(val: unknown) {
  if (val == null) return undefined;
  const s = String(val).trim();
  return s.replace(/\s/g, '').replace(/[฿₫₩€£]|THB|USD|CNY/gi, '');
}

function tryRegex(html: string, patterns: RegExp[]) {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1];
  }
  return undefined;
}

function hasLazMall(html: string) {
  return /LazMall/i.test(html) || /lazmall-channel/i.test(html);
}

async function scrapeWithHttp(url: string, debug = false): Promise<ScrapeResult> {
  const html = await fetchHtml(url);

  const jsonLd = extractAllJsonLd(html);
  const product = findProductFromJsonLd(jsonLd) || {};

  const ldName = product.name;
  const ldImage = Array.isArray(product.image) ? product.image[0] : product.image;
  const ldOffers = product.offers;
  const ldPrice = getFromOffers(ldOffers, 'price') || getFromOffers(ldOffers, 'priceSpecification')?.price;
  const ldBrand = (product.brand && (product.brand.name || product.brand)) || undefined;
  const ldSeller = (product.seller && (product.seller.name || product.seller)) || undefined;

  const ogTitle = extractMetaContent(html, 'og:title');
  const ogImage = extractMetaContent(html, 'og:image');
  const ogPrice =
    extractMetaContent(html, 'product:price:amount') ||
    extractMetaContent(html, 'og:price:amount') ||
    extractMetaContent(html, 'twitter:data1');

  const rxSeller = tryRegex(html, [
    /"sellerName"\s*:\s*"([^"]+)"/i,
    /sellerName\\"\s*:\s*\\"([^\\"]+)\\"/i,
    /"sellerNickName"\s*:\s*"([^"]+)"/i,
    /"shopName"\s*:\s*"([^"]+)"/i,
    /"storeName"\s*:\s*"([^"]+)"/i,
    /"sellerDisplayName"\s*:\s*"([^"]+)"/i,
    /"sellerIdName"\s*:\s*"([^"]+)"/i,
    /"seller"\s*:\s*\{[^}]*?"name"\s*:\s*"([^"]+)"/i,
    /"seller"\s*:\s*\{[^}]*?"shopName"\s*:\s*"([^"]+)"/i
  ]);

  const rxPrice = tryRegex(html, [
    /class=["']pdp-v2-product-price-content-salePrice-amount["'][^>]*>([^<]+)/i,
    /"price"\s*:\s*"\s*(?:THB\s*)?([0-9.,]+)"/i,
    /"price"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
    /"salePrice"\s*:\s*"\s*(?:THB\s*)?([0-9.,]+)"/i,
    /"promotionPrice"\s*:\s*"?\s*(?:THB\s*)?([0-9.,]+)"?/i,
    /"discountedPrice"\s*:\s*"?\s*(?:THB\s*)?([0-9.,]+)"?/i,
    /"originalPrice"\s*:\s*"?\s*(?:THB\s*)?([0-9.,]+)"?/i,
    /"minPrice"\s*:\s*"\s*(?:THB\s*)?([0-9.,]+)"/i,
    /"maxPrice"\s*:\s*"\s*(?:THB\s*)?([0-9.,]+)"/i,
    /"priceValue"\s*:\s*"\s*(?:THB\s*)?([0-9.,]+)"/i,
    /"priceCurrency"\s*:\s*"THB"[\s\S]*?"price"\s*:\s*"?([0-9.,]+)/i,
    /skuPriceList[\s\S]*?"price"\s*:\s*"([0-9.,]+)"/i,
    /lowestPrice[\s\S]*?"([0-9.,]+)"/i,
    /THB\s*([0-9][0-9.,]+)/i
  ]);

  const title = (ldName || ogTitle || '').toString().replace(/\s{2,}/g, ' ').trim();
  let mainImage = (ldImage || ogImage || '').toString().trim();
  if (mainImage && mainImage.startsWith('//')) mainImage = 'https:' + mainImage;
  const rawPrice = ldPrice ?? ogPrice ?? rxPrice;
  const price = normalizePriceString(rawPrice);

  let storeName = [ldSeller, rxSeller, ldBrand].find((v) => !!v);
  if (!storeName && ldBrand && hasLazMall(html)) {
    storeName = `${typeof ldBrand === 'object' ? ldBrand.name : ldBrand} Mall`;
  }

  const result: ScrapeResult = {
    mainImage: mainImage || null,
    title: title || null,
    price: price || null,
    link: url,
    storeName: (typeof storeName === 'object' ? storeName?.name : storeName) || null
  };

  if (debug) {
    try {
      const dir = path.resolve('scripts/.cache');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'lazada_http.html'), html, 'utf8');
      fs.writeFileSync(path.join(dir, 'lazada_http.json'), JSON.stringify(result, null, 2), 'utf8');
    } catch {
      // ignore disk errors in production
    }
  }

  return result;
}

async function scrapeWithPlaywright(url: string, debug = false): Promise<ScrapeResult> {
  let browser: any;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      locale: 'en-US'
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });

    try {
      await Promise.race([
        page.waitForSelector('[data-qa-locator="product-price"]', { timeout: 20_000 }),
        page.waitForSelector('.pdp-product-price .pdp-price', { timeout: 20_000 }),
        page.waitForSelector('.pdp-price, .pdp-price_type_normal', { timeout: 20_000 }),
        page.waitForSelector('.pdp-v2-product-price-content-salePrice-amount', { timeout: 20_000 }),
        page.waitForSelector('h1', { timeout: 20_000 })
      ]);
    } catch {
      // ignored; best effort wait
    }

    const data = await page.evaluate(() => {
      const pickText = (sel: string) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        return el ? el.textContent?.trim() : undefined;
      };
      const pickMeta = (key: string) => {
        const m1 = document.querySelector(`meta[property="${key}"]`) as HTMLMetaElement | null;
        if (m1?.content) return m1.content;
        const m2 = document.querySelector(`meta[name="${key}"]`) as HTMLMetaElement | null;
        return m2?.content ?? undefined;
      };

      const compact = (s: string | undefined) => (s ? s.replace(/\s{2,}/g, ' ').trim() : s);

      const title = compact(pickText('h1') || pickMeta('og:title') || '');

      const priceSelectors = [
        '.pdp-v2-product-price-content-salePrice-amount',
        '[data-qa-locator="product-price"]',
        '.pdp-product-price .pdp-price',
        '.pdp-price',
        '.pdp-price_type_normal',
        'meta[property="product:price:amount"]',
        'meta[property="og:price:amount"]'
      ];
      const candidateTexts: string[] = [];
      for (const sel of priceSelectors) {
        const t = sel.startsWith('meta')
          ? pickMeta(sel.match(/"(.*?)"/)?.[1] ?? '')
          : pickText(sel);
        if (t) candidateTexts.push(t);
      }
      if (candidateTexts.length === 0) {
        const nodes = Array.from(document.querySelectorAll('[class*="price" i]')) as HTMLElement[];
        for (const n of nodes) {
          const t = n.textContent?.trim();
          if (t) candidateTexts.push(t);
        }
      }

      let price: string | undefined;
      for (const c of candidateTexts) {
        const m = String(c).match(/([0-9][0-9.,]+)/);
        if (m) {
          price = m[1];
          break;
        }
      }

      const sellerSelectors = [
        '[data-qa-locator="seller-name"]',
        '.seller-name',
        '.pdp-mod-product-shop .seller-name',
        'a[title][href*="/shop/"]',
        'a[href*="/shop/"] .seller-name',
        'a[href*="/seller/"]',
        '[class*="seller" i] a[href]'
      ];
      let storeName: string | undefined;
      for (const sel of sellerSelectors) {
        const t = pickText(sel);
        if (t) {
          storeName = t;
          break;
        }
      }

      let mainImage = pickMeta('og:image');
      if (!mainImage) {
        const img = document.querySelector(
          '[data-qa-locator="product-image"] img, .pdp-mod-image img, img'
        ) as HTMLImageElement | null;
        if (img?.src) mainImage = img.src;
      }

      const hasMall = !!document.querySelector(
        '.pdp-seller-info .lazmall, [alt*="LazMall" i], [src*="lazmall" i]'
      );

      return { title, price, storeName, mainImage, hasMall };
    });

    if (data && data.mainImage && data.mainImage.startsWith('//')) {
      data.mainImage = 'https:' + data.mainImage;
    }

    let result: ScrapeResult = {
      mainImage: data?.mainImage ?? null,
      title: data?.title ?? null,
      price: normalizePriceString(data?.price) ?? null,
      link: url,
      storeName: data?.storeName ?? null
    };

    if (!result.storeName) {
      try {
        const ld = await (await fetch(url)).text();
        const allNodes = extractAllJsonLd(ld);
        const prod = findProductFromJsonLd(allNodes) || {};
        const brand = (prod.brand && (prod.brand.name || prod.brand)) || undefined;
        if (data?.hasMall && brand) {
          result.storeName = `${typeof brand === 'object' ? brand.name : brand} Mall`;
        }
      } catch {
        // ignore secondary fetch errors
      }
    }

    if (debug) {
      try {
        const dir = path.resolve('scripts/.cache');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'lazada_dom.html'), await page.content(), 'utf8');
        fs.writeFileSync(path.join(dir, 'lazada_playwright.json'), JSON.stringify(result, null, 2), 'utf8');
      } catch {
        // ignore disk errors
      }
    }

    return result;
  } catch (error) {
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

export async function scrapeFromUrl(url: string, opts?: { debug?: boolean }) {
  const preferPlaywright = opts?.debug ?? false;
  if (preferPlaywright) {
    try {
      return await scrapeWithPlaywright(url, opts?.debug);
    } catch {
      // fallback to http
    }
  }

  try {
    return await scrapeWithPlaywright(url, opts?.debug);
  } catch {
    const data = await scrapeWithHttp(url, opts?.debug);
    if (!data.price) {
      try {
        return await scrapeWithPlaywright(url, opts?.debug);
      } catch {
        return data;
      }
    }
    return data;
  }
}

