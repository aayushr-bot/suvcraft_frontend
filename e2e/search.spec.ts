import { test, expect } from '@playwright/test';

// Search flows. The storefront wires the navbar input → /search?q=… (or
// /products?search=…) depending on context. These tests exercise both
// directions so a future router change can't silently break the input.

test.describe('Search', () => {
  test('plausible query returns either results or a clean empty state', async ({ page }) => {
    await page.goto('/search?q=a');
    // Either the result grid OR a "no results" message — but never a 500.
    const grid = page.locator('a[href^="/product/"]');
    const empty = page.locator('text=/no products|nothing|no results/i');
    await expect(grid.first().or(empty.first())).toBeVisible({ timeout: 10_000 });
  });

  test('garbage query renders a friendly empty state, not an error', async ({ page }) => {
    await page.goto('/search?q=xyzzz-no-match-here-9999');
    const body = (await page.locator('body').textContent()) || '';
    // We expect an empty-state phrase. If the page is truly silent (no
    // copy + no grid) the user can't tell whether search broke vs found
    // nothing — flag that.
    expect(
      /no products|nothing|no results|try a different/i.test(body),
      'Empty search renders nothing actionable — add a friendly empty-state CTA.',
    ).toBeTruthy();
  });

  test('blank search renders without crashing', async ({ page }) => {
    const response = await page.goto('/search');
    expect(response!.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('navbar search input submits and navigates', async ({ page }) => {
    await page.goto('/');
    const search = page.locator('input[type="search"]').first();
    await search.fill('shirt');
    await search.press('Enter');
    // Either /search?q=shirt or /products?search=shirt is acceptable.
    await expect(page).toHaveURL(/(search|products).*=shirt/i, { timeout: 5_000 });
  });
});
