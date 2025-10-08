import { query, command } from '$app/server';
import * as v from 'valibot';

import { scrapeFromUrl } from '$lib/server/tools/scraper';
import {
  createProcurementItem,
  type CreateProcurementItemInput
} from '$lib/server/notion/procurement';
import { getProcurementMeta } from '$lib/server/notion/procurementMeta';

import type {
  ProcurementDraft,
  ProcurementImportResult,
  ProcurementMetadata,
  ScrapeResult
} from '$lib/tools/types';

const UrlSchema = v.pipe(
  v.string(),
  v.trim(),
  v.url('Invalid URL'),
  v.check((value) => value.includes('lazada.co.'), 'Only Lazada URLs are supported')
);

const ScrapeInputSchema = v.object({
  url: UrlSchema
});

const ScrapeBatchSchema = v.object({
  urls: v.array(UrlSchema, 'Provide at least one Lazada URL')
});

const ProcurementDraftSchema = v.object({
  item: v.pipe(v.string(), v.trim(), v.minLength(1, 'Item name required')),
  priceTHB: v.nullable(v.number()),
  linkToProduct: v.nullable(UrlSchema),
  supplier: v.nullable(v.pipe(v.string(), v.trim())),
  imageUrl: v.nullable(UrlSchema),
  department: v.nullable(v.string()),
  status: v.nullable(v.string()),
  objectCategories: v.array(v.string()),
  quantity: v.nullable(v.number()),
  trackingNumber: v.nullable(v.string()),
  invoice: v.nullable(v.string()),
  description: v.nullable(v.string())
});

const ImportPayloadSchema = v.object({
  drafts: v.array(ProcurementDraftSchema)
});

export const scrapeProduct = query(ScrapeInputSchema, async ({ url }) => {
  const data = await scrapeFromUrl(url);
  return data satisfies ScrapeResult;
});

export const scrapeMultipleProducts = query(ScrapeBatchSchema, async ({ urls }) => {
  const promises = urls.map(async (url) => {
    try {
      return await scrapeFromUrl(url);
    } catch (error) {
      return {
        mainImage: null,
        title: null,
        price: null,
        link: url,
        storeName: null,
        error: error instanceof Error ? error.message : 'Unknown scrape error'
      } satisfies ScrapeResult;
    }
  });

  const results = await Promise.all(promises);
  return results;
});

export const importProcurementDrafts = command(
  ImportPayloadSchema,
  async ({ drafts }) => {
    const responses: ProcurementImportResult[] = [];

    for (const [index, draft] of drafts.entries()) {
      try {
        const result = await createProcurementItem(transformDraftToInput(draft));
        responses.push({
          index,
          item: draft.item,
          success: true,
          pageId: result.pageId,
          url: result.url
        });
      } catch (error) {
        responses.push({
          index,
          item: draft.item,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to import'
        });
      }
    }

    return responses;
  }
);

export const getProcurementMetadata = query(async () => {
  const meta = await getProcurementMeta();
  return meta satisfies ProcurementMetadata;
});

function transformDraftToInput(draft: ProcurementDraft): CreateProcurementItemInput {
  return {
    item: draft.item,
    priceTHB: draft.priceTHB ?? null,
    linkToProduct: draft.linkToProduct,
    supplier: draft.supplier ?? null,
    imageUrl: draft.imageUrl ?? null,
    department: draft.department ?? null,
    status: draft.status ?? null,
    objectCategories: draft.objectCategories?.length ? draft.objectCategories : null,
    quantity: draft.quantity ?? null,
    trackingNumber: draft.trackingNumber ?? null,
    invoice: draft.invoice ?? null,
    description: draft.description ?? null
  } satisfies CreateProcurementItemInput;
}

