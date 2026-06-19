import 'dotenv/config';
import { chromium } from 'playwright';
import { EndOfShiftReportsDatabase } from '../src/lib/notion-sdk/dbs/end-of-shift-reports/db';
import { CompanyLedgerDatabase } from '../src/lib/notion-sdk/dbs/company-ledger/db';

const notionSecret = process.env.NOTION_API_KEY;
if (!notionSecret) throw new Error('NOTION_API_KEY is missing');

const baseURL = process.env.CLOSE_SHIFT_TEST_URL || 'http://localhost:4958';
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/snap/bin/chromium';
const runId = `ui-close-shift-test-${Date.now()}`;
const testImageBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
);
const reportDb = new EndOfShiftReportsDatabase({ notionSecret });
const ledgerDb = new CompanyLedgerDatabase({ notionSecret });

async function cleanupCreatedSamples() {
  const archived: string[] = [];

  const reportMatches = await reportDb.query({
    filter: { notes: { contains: runId } }
  } as any);
  for (const page of reportMatches.results) {
    await reportDb.archivePage(page.id);
    archived.push(`report ${page.id}`);
  }

  const expenseMatches = await ledgerDb.query({
    filter: { description: { contains: runId } }
  } as any);
  for (const page of expenseMatches.results) {
    await ledgerDb.archivePage(page.id);
    archived.push(`expense ${page.id}`);
  }

  return archived;
}

const browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable });
const page = await browser.newPage();
const browserErrors: string[] = [];
page.on('pageerror', (error) => browserErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text());
});

try {
  await page.context().addCookies([
    { name: 'casa_luma_tools_auth', value: 'staff', domain: 'localhost', path: '/' }
  ]);
  await page.goto(`${baseURL}/tools/close-shift`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  await page.locator('#closerName').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);

  await page.locator('#closerName').fill('Agent UI Test');
  await page.locator('#expectedCash').fill('100');
  await page.locator('#paidOut').fill('25');
  await page.locator('#denom-100').fill('1');
  await page.locator('#notes').fill(`TEMP UI TEST - archive after run\n${runId}`);
  await page.locator('input[type="file"]').setInputFiles({
    name: `close-shift-pos-summary-${runId}.png`,
    mimeType: 'image/png',
    buffer: testImageBuffer
  });

  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.locator('input[id^="expense-title-"]').fill(`TEST Shift Expense ${runId}`);
  await page.locator('input[id^="expense-amount-"]').fill('25');
  await page.locator('select[id^="expense-category-"]').selectOption('Miscellaneous');
  await page.locator('select[id^="expense-department-"]').selectOption('General');
  await page.locator('input[id^="expense-notes-"]').fill('temporary ui submit test');

  await page.getByRole('button', { name: 'Submit Report' }).click({ force: true });
  await page.getByText('Shift Closed Successfully!', { exact: true }).waitFor({ timeout: 45_000 });

  const reportMatches = await reportDb.query({
    filter: { notes: { contains: runId } }
  } as any);
  const report = reportMatches.results[0] as any;
  const files = report?.properties?.['POS Summary']?.files ?? [];
  const uploadedFile = files[0];
  const imageUploadedToNotion = Boolean(
    uploadedFile?.type === 'file_upload' ||
    uploadedFile?.type === 'file' ||
    uploadedFile?.file_upload?.id ||
    uploadedFile?.file?.url?.includes('secure.notion-static.com')
  );
  if (!imageUploadedToNotion) {
    throw new Error(`POS Summary image was not uploaded to Notion. Files: ${JSON.stringify(files)}`);
  }

  const archived = await cleanupCreatedSamples();
  console.log(JSON.stringify({ ok: true, runId, imageUploadedToNotion, fileType: uploadedFile?.type, archived, browserErrors }, null, 2));
} catch (error) {
  const archived = await cleanupCreatedSamples().catch((cleanupError) => [`cleanup failed: ${cleanupError}`]);
  const pageText = await page.locator('body').innerText().catch(() => 'unavailable');
  console.error(JSON.stringify({
    ok: false,
    runId,
    archived,
    browserErrors,
    pageText: pageText.slice(0, 2000),
    error: error instanceof Error ? error.message : String(error)
  }, null, 2));
  throw error;
} finally {
  await browser.close();
}
