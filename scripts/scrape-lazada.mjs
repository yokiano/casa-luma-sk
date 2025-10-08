// Lazada product scraper (ESM, Node 18+)
// Usage examples:
//   pnpm run scrape:lazada -- "https://www.lazada.co.th/products/..."
//   node scripts/scrape-lazada.mjs "https://www.lazada.co.th/products/..." --debug

/**
 * Fetch a URL with a desktop browser-like User-Agent to avoid bot blocks.
 */
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function extractMetaContent(html, propertyOrName) {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*?content=["']([^"']+)["'][^>]*?>`,
    'i'
  );
  const match = html.match(pattern);
  return match ? match[1] : undefined;
}

function extractAllJsonLd(html) {
  const results = [];
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRegex.exec(html)) !== null) {
    const raw = m[1].trim();
    // Some sites wrap multiple JSON objects; try to parse leniently
    try {
      const parsed = JSON.parse(raw);
      results.push(parsed);
    } catch {
      // Attempt to recover arrays of objects glued together
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

function findProductFromJsonLd(nodes) {
  const flat = [];
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
      const v = n[k];
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  // Prefer @type Product
  return flat.find((n) => {
    const t = n['@type'];
    if (!t) return false;
    if (typeof t === 'string') return t.toLowerCase() === 'product';
    if (Array.isArray(t)) return t.map((x) => String(x).toLowerCase()).includes('product');
    return false;
  });
}

function getFromOffers(offers, key) {
  if (!offers) return undefined;
  if (Array.isArray(offers)) {
    for (const o of offers) {
      if (o && o[key] != null) return o[key];
    }
    return undefined;
  }
  return offers[key];
}

function normalizePriceString(val) {
  if (val == null) return undefined;
  const s = String(val).trim();
  // Keep formatting (commas/decimals) as-is to match store display
  // Remove currency symbols and extra spaces
  return s.replace(/\s/g, '').replace(/[฿₫₩€£]|THB|USD|CNY/gi, '');
}

function tryRegex(html, patterns) {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1];
  }
  return undefined;
}

function hasLazMall(html) {
  return /LazMall/i.test(html) || /lazmall-channel/i.test(html);
}

async function scrapeWithHttp(url, debug) {
  const html = await fetchHtml(url);

  // 1) JSON-LD first
  const jsonLd = extractAllJsonLd(html);
  const product = findProductFromJsonLd(jsonLd) || {};

  const ldName = product.name;
  const ldImage = Array.isArray(product.image) ? product.image[0] : product.image;
  const ldOffers = product.offers;
  const ldPrice = getFromOffers(ldOffers, 'price') || getFromOffers(ldOffers, 'priceSpecification')?.price;
  const ldBrand = (product.brand && (product.brand.name || product.brand)) || undefined;
  const ldSeller = (product.seller && (product.seller.name || product.seller)) || undefined;

  // 2) Meta fallbacks
  const ogTitle = extractMetaContent(html, 'og:title');
  const ogImage = extractMetaContent(html, 'og:image');
  const ogPrice =
    extractMetaContent(html, 'product:price:amount') ||
    extractMetaContent(html, 'og:price:amount') ||
    extractMetaContent(html, 'twitter:data1');

  // 3) Regex fallbacks for seller and price
  const rxSeller = tryRegex(html, [
    /"sellerName"\s*:\s*"([^"]+)"/i,
    /sellerName\\"\s*:\s*\\"([^\\"]+)\\"/i,
    /"sellerNickName"\s*:\s*"([^"]+)"/i,
    /"shopName"\s*:\s*"([^"]+)"/i,
    /"storeName"\s*:\s*"([^"]+)"/i,
    /"sellerDisplayName"\s*:\s*"([^"]+)"/i,
    /"sellerIdName"\s*:\s*"([^"]+)"/i,
    /"seller"\s*:\s*\{[^}]*?"name"\s*:\s*"([^"]+)"/i,
    /"seller"\s*:\s*\{[^}]*?"shopName"\s*:\s*"([^"]+)"/i,
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
    /THB\s*([0-9][0-9.,]+)/i,
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

  const result = {
    mainImage: mainImage || null,
    title: title || null,
    price: price || null,
    link: url,
    storeName: (typeof storeName === 'object' ? storeName?.name : storeName) || null,
  };

  if (debug) {
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const dir = path.resolve('scripts/.cache');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'lazada_http.html'), html, 'utf8');
      fs.writeFileSync(path.join(dir, 'lazada_http.json'), JSON.stringify(result, null, 2), 'utf8');
    } catch {}
  }

  return result;
}

async function scrapeWithPlaywright(url, debug) {
  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      locale: 'en-US',
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

    // Wait for either title or price to appear
    try {
      await Promise.race([
        page.waitForSelector('[data-qa-locator="product-price"]', { timeout: 20000 }),
        page.waitForSelector('.pdp-product-price .pdp-price', { timeout: 20000 }),
        page.waitForSelector('.pdp-price, .pdp-price_type_normal', { timeout: 20000 }),
        page.waitForSelector('.pdp-v2-product-price-content-salePrice-amount', { timeout: 20000 }),
        page.waitForSelector('h1', { timeout: 20000 }),
      ]);
    } catch {}

    const data = await page.evaluate(() => {
      const pickText = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.textContent.trim() : undefined;
      };
      const pickMeta = (key) => {
        const m1 = document.querySelector(`meta[property="${key}"]`);
        if (m1 && m1.content) return m1.content;
        const m2 = document.querySelector(`meta[name="${key}"]`);
        return m2 && m2.content ? m2.content : undefined;
      };

      const compact = (s) => (s ? s.replace(/\s{2,}/g, ' ').trim() : s);

      const title = compact(pickText('h1') || pickMeta('og:title') || '');

      const priceSelectors = [
        '.pdp-v2-product-price-content-salePrice-amount',
        '[data-qa-locator="product-price"]',
        '.pdp-product-price .pdp-price',
        '.pdp-price',
        '.pdp-price_type_normal',
        'meta[property="product:price:amount"]',
        'meta[property="og:price:amount"]',
      ];
      const candidateTexts = [];
      for (const sel of priceSelectors) {
        const t = sel.startsWith('meta') ? pickMeta(sel.match(/"(.*?)"/)[1]) : pickText(sel);
        if (t) candidateTexts.push(t);
      }
      if (candidateTexts.length === 0) {
        const nodes = Array.from(document.querySelectorAll('[class*="price" i]'));
        for (const n of nodes) {
          const t = n.textContent?.trim();
          if (t) candidateTexts.push(t);
        }
      }

      let price;
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
        '[class*="seller" i] a[href]',
      ];
      let storeName;
      for (const sel of sellerSelectors) {
        const t = pickText(sel);
        if (t) {
          storeName = t;
          break;
        }
      }

      let mainImage = pickMeta('og:image');
      if (!mainImage) {
        const img = document.querySelector('[data-qa-locator="product-image"] img, .pdp-mod-image img, img');
        if (img && img.src) mainImage = img.src;
      }

      const hasMall = !!document.querySelector('.pdp-seller-info .lazmall, [alt*="LazMall" i], [src*="lazmall" i]');

      return { title, price, storeName, mainImage, hasMall };
    });

    if (data && data.mainImage && data.mainImage.startsWith('//')) {
      data.mainImage = 'https:' + data.mainImage;
    }

    let result = {
      mainImage: data?.mainImage || null,
      title: data?.title || null,
      price: normalizePriceString(data?.price),
      link: url,
      storeName: data?.storeName || null,
    };

    if (!result.storeName) {
      // Fallback heuristic: if LazMall and brand exists in LD+JSON
      try {
        const ld = await (await fetch(url)).text();
        const allNodes = extractAllJsonLd(ld);
        const prod = findProductFromJsonLd(allNodes) || {};
        const brand = (prod.brand && (prod.brand.name || prod.brand)) || undefined;
        if (data?.hasMall && brand) {
          result.storeName = `${typeof brand === 'object' ? brand.name : brand} Mall`;
        }
      } catch {}
    }

    if (debug) {
      try {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const dir = path.resolve('scripts/.cache');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'lazada_dom.html'), await page.content(), 'utf8');
        fs.writeFileSync(path.join(dir, 'lazada_playwright.json'), JSON.stringify(result, null, 2), 'utf8');
      } catch {}
    }

    return result;
  } catch (e) {
    // If playwright import/launch fails, propagate to caller to fallback
    throw e;
  } finally {
    if (browser) await browser.close();
  }
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let url = undefined;
  let preferPlaywright = false;
  let debug = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--url' && args[i + 1]) {
      url = args[i + 1];
      i++;
      continue;
    }
    if (a === '--playwright') {
      preferPlaywright = true;
      continue;
    }
    if (a === '--debug') {
      debug = true;
      continue;
    }
    if (!a.startsWith('-') && !url) {
      url = a;
    }
  }
  return { url, preferPlaywright, debug };
}

async function main() {
  const { url, preferPlaywright, debug } = parseArgs(process.argv);
  if (!url) {
    console.error('Usage: node scripts/scrape-lazada.mjs --url <PRODUCT_URL> [--playwright] [--debug]');
    process.exit(1);
  }
  try {
    let data;
    let usedPlaywright = false;
    if (preferPlaywright) {
      try {
        data = await scrapeWithPlaywright(url, debug);
        usedPlaywright = true;
      } catch {}
    }
    if (!data) {
      // Try Playwright by default if available
      try {
        data = await scrapeWithPlaywright(url, debug);
        usedPlaywright = true;
      } catch {
        data = await scrapeWithHttp(url, debug);
      }
    }
    if (!data || (!data.price && !usedPlaywright)) {
      // If HTTP path didn't get price, one more attempt with Playwright
      try {
        data = await scrapeWithPlaywright(url, debug);
      } catch {}
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Scrape error:', err?.message || err);
    process.exit(2);
  }
}

await main();


