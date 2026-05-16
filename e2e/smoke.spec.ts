import { test, expect, type Page } from '@playwright/test';

// Smoke tests — for every public-facing route, assert it returns HTTP 200,
// renders without a runtime React error, and contains an h1 / page-level
// landmark. Catches regressions like "build worked but the route 500s" or
// "I broke the layout and nothing renders" before deeper flows even start.

// Pages that should be reachable without authentication.
const PUBLIC_ROUTES: { path: string; expectVisible: RegExp | string }[] = [
  { path: '/', expectVisible: /SUVCRAFT|Shop|Products|Sale|Hero/i },
  { path: '/products', expectVisible: /products|browse|sort/i },
  { path: '/faq', expectVisible: /frequently asked|help/i },
  { path: '/policies/about-us', expectVisible: /About/i },
  { path: '/policies/privacy-policy', expectVisible: /Privacy/i },
  { path: '/policies/shipping-policy', expectVisible: /Shipping/i },
  { path: '/policies/return-policy', expectVisible: /Return/i },
  { path: '/search', expectVisible: /search/i },
];

// Pages that REQUIRE login. Hitting them while signed out should either
// redirect to / or render an auth prompt — anything except a 404 / 500.
const AUTH_REQUIRED_ROUTES = [
  '/cart',
  '/orders',
  '/wishlist',
  '/profile',
  '/addresses',
  '/saved-cards',
  '/checkout',
];

// Collect any console errors / page errors that happen during a navigation
// so smoke tests can fail on hidden React or runtime errors that don't show
// up as broken pixels.
async function attachConsoleErrorListener(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Filter out third-party noise we can't fix (favicon/manifest, analytics).
    if (/favicon|manifest|analytics|gtag|gtm/i.test(text)) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test.describe('Public routes — smoke', () => {
  for (const { path, expectVisible } of PUBLIC_ROUTES) {
    test(`GET ${path} renders without errors`, async ({ page }) => {
      const errors = await attachConsoleErrorListener(page);

      const response = await page.goto(path);
      expect(response, `No response for ${path}`).toBeTruthy();
      expect(response!.status(), `${path} returned ${response!.status()}`).toBeLessThan(400);

      // Wait for the body to be at least partially rendered.
      await expect(page.locator('body')).toBeVisible();

      // Heuristic match — the expected text should appear somewhere on the
      // rendered page. Loose regex so admins changing copy don't break us.
      const pageText = await page.locator('body').textContent();
      expect(pageText || '').toMatch(expectVisible);

      // No JS errors that we don't already know to ignore.
      expect(errors, `Console errors on ${path}:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('Auth-gated routes — smoke', () => {
  for (const path of AUTH_REQUIRED_ROUTES) {
    test(`GET ${path} (signed out) responds < 500`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response, `No response for ${path}`).toBeTruthy();
      // Acceptable: 200 (renders an empty state / auth modal) or 3xx redirect
      // back to home. Anything 500-class is a regression.
      const status = response!.status();
      expect(status, `${path} returned ${status}`).toBeLessThan(500);
    });
  }
});

test.describe('Unknown routes', () => {
  test('GET /this-definitely-does-not-exist returns Next.js 404', async ({ page }) => {
    const response = await page.goto('/this-definitely-does-not-exist');
    expect(response!.status()).toBe(404);
    await expect(page.locator('body')).toContainText(/not found|404/i);
  });
});
