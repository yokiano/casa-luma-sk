import { command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { NOTION_API_KEY } from '$env/static/private';
import { EndOfShiftReportsDatabase } from '$lib/notion-sdk/dbs/end-of-shift-reports/db';
import { EndOfShiftReportsPatchDTO } from '$lib/notion-sdk/dbs/end-of-shift-reports/patch.dto';

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
  closerId: v.string(),
  closerPersonId: v.optional(v.string()),
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
      // Manual mapping fallback for known managers if personId is missing
      let closedByPersonId = data.closerPersonId;
      if (!closedByPersonId) {
        if (data.closerName.toLowerCase().includes('dream')) {
          closedByPersonId = '2d4d872b-594c-810b-8fed-0002a74b6b26';
        } else if (data.closerName.toLowerCase().includes('kwan')) {
          closedByPersonId = 'a75bee8b-461b-429b-b34b-e859a5dbe8e7';
        }
      }

      // Create a new page in the End of Shift Reports database
      const response = await db.createPage(
        new EndOfShiftReportsPatchDTO({
          properties: {
            shiftDate: `Shift: ${new Date(data.shiftDate).toLocaleDateString('en-GB')}`,
            date: { start: data.shiftDate },
            expectedCash: data.expectedCash,
            
            // Closed By - Use the person ID if we have it
            closedBy: closedByPersonId ? [{ id: closedByPersonId }] : undefined,
            
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
            notes: `Closed by: ${data.closerName}${closedByPersonId ? '' : ' (User ID not found)'}\n\n${data.notes}`
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
