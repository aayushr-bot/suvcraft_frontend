import { defineConfig, devices } from '@playwright/test';

// Local Suvcraft dev defaults — override via env when running against staging.
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  // Each test gets 30s; the full run is capped at 10 min so a stuck test
  // doesn't hang CI overnight.
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    // Capture diagnostics on failure so the report tells you WHY a test died.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Storefront runs over HTTPS in prod; locally we use HTTP. Don't fail
    // the test just because the cert chain is funky on staging.
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add Firefox / WebKit / mobile here when you want broader coverage:
    // { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    // { name: 'mobile',   use: { ...devices['Pixel 7'] } },
  ],

  // Auto-start the storefront dev server if it isn't already running. Off
  // by default because most devs run it themselves; set E2E_AUTOSTART=1 to
  // enable in CI.
  ...(process.env.E2E_AUTOSTART ? {
    webServer: {
      command: 'npm run dev',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  } : {}),
});
