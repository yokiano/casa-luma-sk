import { test, expect } from '@playwright/test';

const MOCK_URL =
  'https://www.lazada.co.th/products/pdp-i4898720925.html?spm=a2o4m.store_product.list.65.91292a48QeVEGf';

const SCRAPE_RESPONSE = {
  mainImage: 'https://example.com/photo.jpg',
  title: 'Montessori Wooden Blocks',
  price: '1,299',
  link: MOCK_URL,
  storeName: 'LazMall Montessori'
};

const META_RESPONSE = {
  departments: ['General', 'Montessori', 'Outdoor'],
  statuses: ['Idea', 'Researching', 'Ordered'],
  objectCategories: ['Furniture', 'Learning', 'Supplies']
};

const IMPORT_RESPONSE = [
  {
    index: 0,
    item: 'Montessori Wooden Blocks',
    success: true,
    pageId: 'abc123',
    url: 'https://notion.so/mock'
  }
];

function respond(route, payload) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload)
  });
}

test.describe('Procurement Import tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/_app/remote/**', async (route, request) => {
      const url = request.url();
      if (url.includes('getProcurementMetadata')) {
        return respond(route, { data: META_RESPONSE });
      }
      if (url.includes('scrapeMultipleProducts')) {
        return respond(route, [SCRAPE_RESPONSE]);
      }
      if (url.includes('importProcurementDrafts')) {
        return respond(route, IMPORT_RESPONSE);
      }
      return route.continue();
    });

    await page.goto('/tools/procurement-import');
  });

  test('scrapes lazada items and prepares drafts', async ({ page }) => {
    await page.locator('textarea').fill(MOCK_URL);
    await page.getByRole('button', { name: 'Scrape Products' }).click();

    await expect(page.getByRole('heading', { name: 'Review and Edit' })).toBeVisible();
    await expect(page.getByLabel('Item Name')).toHaveValue('Montessori Wooden Blocks');
    await expect(page.getByLabel('Price (THB)')).toHaveValue('1299');

    const learningChip = page.getByRole('button', { name: 'Learning' });
    await expect(learningChip).toBeVisible();
    await learningChip.click();
    await expect(learningChip).toHaveClass(/bg\[#7a6550\]/);
  });

  test('imports drafts to notion', async ({ page }) => {
    await page.locator('textarea').fill(MOCK_URL);
    await page.getByRole('button', { name: 'Scrape Products' }).click();
    await page.getByRole('button', { name: 'Learning' }).click();
    await page.getByRole('button', { name: 'Import to Notion' }).click();

    const summary = page.getByRole('heading', { name: 'Import Summary' });
    await expect(summary).toBeVisible();
    await expect(page.getByText('Imported', { exact: false })).toBeVisible();
  });
});
