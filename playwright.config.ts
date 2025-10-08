import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

export default defineConfig({
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: !CI,
    timeout: 120_000
  },
  testDir: 'e2e',
  retries: CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    trace: CI ? 'on-first-retry' : 'retain-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome']
  }
});
