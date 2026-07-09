import { command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { NOTION_API_KEY } from '$env/static/private';
import { EndOfShiftReportsDatabase } from '$lib/notion-sdk/dbs/end-of-shift-reports/db';
import { EndOfShiftReportsPatchDTO } from '$lib/notion-sdk/dbs/end-of-shift-reports/patch.dto';
import { uploadToNotion } from '$lib/server/notion/upload';

const moneyField = (label: string) =>
  v.optional(
    v.pipe(
      v.number(`${label} must be a number.`),
      v.finite(`${label} must be a valid number.`),
      v.minValue(0, `${label} cannot be negative.`)
    ),
    0
  );

const countField = (label: string) =>
  v.optional(
    v.pipe(
      v.number(`${label} count must be a number.`),
      v.finite(`${label} count must be a valid number.`),
      v.integer(`${label} count must be a whole number.`),
      v.minValue(0, `${label} count cannot be negative.`)
    ),
    0
  );

const getErrorMessage = (e: unknown) => {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string') {
    return e.message;
  }
  return 'Unknown error';
};

const getDataUrlFileExtension = (dataUrl: string) => {
  const mime = dataUrl.match(/^data:([^;,]+)[;,]/)?.[1]?.toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/png') return 'png';
  return 'png';
};

// Define the validation schema for the close shift data
const CloseShiftSchema = v.object({
  expectedCash: moneyField('Expected cash'),
  billCounts: v.object({
    '1000': countField('1000 baht bill'),
    '500': countField('500 baht bill'),
    '100': countField('100 baht bill'),
    '50': countField('50 baht bill'),
    '20': countField('20 baht bill'),
    '10': countField('10 baht coin'),
    '5': countField('5 baht coin'),
    '2': countField('2 baht coin'),
    '1': countField('1 baht coin')
  }),
  paymentMethods: v.object({
    scan: moneyField('Scan / transfer total'),
    card: moneyField('Credit card total')
  }),
  cashIn: moneyField('Cash In'),
  paidOut: moneyField('Paid Out'),
  closerId: v.optional(v.string(), ''),
  closerPersonId: v.optional(v.string()),
  closerName: v.string(),
  notes: v.optional(v.string(), ''),
  shiftDate: v.string(), // ISO date string
  posSummaryDataUrl: v.optional(v.string()),
  posSummaryFileName: v.optional(v.string())
});

export const submitCloseShift = command(
  CloseShiftSchema,
  async (data) => {
    // Initialize the database client
    const db = new EndOfShiftReportsDatabase({
      notionSecret: NOTION_API_KEY
    });

    try {
      let posSummary = undefined;
      if (data.posSummaryDataUrl) {
        const fileName = data.posSummaryFileName || `close-shift-pos-summary-${data.shiftDate.slice(0, 10)}.${getDataUrlFileExtension(data.posSummaryDataUrl)}`;
        // Store uploaded POS summary images in Notion, not as client-only previews.
        const uploaded = await uploadToNotion(data.posSummaryDataUrl, fileName);
        posSummary = [uploaded];
      }

      // Create a new page in the End of Shift Reports database
      const response = await db.createPage(
        new EndOfShiftReportsPatchDTO({
          properties: {
            shiftDate: `Shift: ${new Date(data.shiftDate).toLocaleDateString('en-GB')}`,
            date: { start: data.shiftDate },
            expectedCash: data.expectedCash,
            paidOut: data.paidOut,
            posSummary: posSummary as any,
            
            // Closed By is a text property in Notion.
            closedBy: data.closerName.trim() || undefined,
            
            // Bill Counts - Using updated property names from SDK
            bill_1000Baht_1: data.billCounts['1000'],
            bill_500Baht_1: data.billCounts['500'],
            bill_100Baht_1: data.billCounts['100'],
            bill_50Baht_1: data.billCounts['50'],
            bill_20Baht_1: data.billCounts['20'],
            coin_10Baht_1: data.billCounts['10'],
            coin_5Baht_1: data.billCounts['5'],
            coin_2Baht_1: data.billCounts['2'],
            coin_1Baht_1: data.billCounts['1'],
            
            // Payments
            scanPayments: data.paymentMethods.scan,
            cardPayments: data.paymentMethods.card,
            
            // Cash In
            cashIn: data.cashIn,
            
            // Notes
            notes: `Closed by: ${data.closerName}\n\n${data.notes}`
          }
        })
      );

      return { success: true, id: response.id };
    } catch (e) {
      console.error('Failed to submit close shift report:', e);
      throw error(500, {
        message: `Failed to submit report to Notion. ${getErrorMessage(e)}`
      });
    }
  }
);
