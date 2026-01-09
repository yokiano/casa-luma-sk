import { command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { NOTION_API_KEY } from '$env/static/private';
import { EndOfShiftReportsDatabase } from '$lib/notion-sdk/dbs/end-of-shift-reports/db';
import { EndOfShiftReportsPatchDTO } from '$lib/notion-sdk/dbs/end-of-shift-reports/patch.dto';

// Define the validation schema for the close shift data
const CloseShiftSchema = v.object({
  expectedCash: v.number(),
  billCounts: v.object({
    '1000': v.number(),
    '500': v.number(),
    '100': v.number(),
    '50': v.number(),
    '20': v.number(),
    '10': v.number(),
    '5': v.number(),
    '2': v.number(),
    '1': v.number()
  }),
  paymentMethods: v.object({
    scan: v.number(),
    card: v.number()
  }),
  closerName: v.string(),
  notes: v.optional(v.string(), ''),
  shiftDate: v.string() // ISO date string
});

export const submitCloseShift = command(
  CloseShiftSchema,
  async (data) => {
    // Initialize the database client
    const db = new EndOfShiftReportsDatabase({
      notionSecret: NOTION_API_KEY
    });

    try {
      // Create a new page in the End of Shift Reports database
      const response = await db.createPage(
        new EndOfShiftReportsPatchDTO({
          properties: {
            shiftDate: `Shift: ${new Date(data.shiftDate).toLocaleDateString('en-GB')}`,
            date: { start: data.shiftDate },
            expectedCash: data.expectedCash,
            
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
            
            // Notes
            notes: `Closed by: ${data.closerName}\n\n${data.notes}`
          }
        })
      );

      return { success: true, id: response.id };
    } catch (e) {
      console.error('Failed to submit close shift report:', e);
      throw error(500, { message: 'Failed to submit report to Notion' });
    }
  }
);
