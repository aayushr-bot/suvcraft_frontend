import { test, expect } from '@playwright/test';

// Browse-flow tests: the highest-traffic path on the storefront. Each test
// owns its own data discovery (clicks the first thing that looks like a
// product) so the suite doesn't need pre-seeded fixture IDs to run.

test.describe('Storefront browse → product detail', () => {
  test('home page lists products and lets you open one', async ({ page }) => {
    await page.goto('/');

    // Find anything that looks like a product link — Next.js Link wrapping
    // an <img> + price block, anchored at /product/<id>.
    const productLinks = page.locator('a[href^="/product/"]');
    await expect(productLinks.first(), 'no product links on home').toBeVisible({ timeout: 10_000 });

    // Click the first one and confirm we land on a product detail page.
    await productLinks.first().click();
    await expect(page).toHaveURL(/\/product\/\d+/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('/products grid renders and supports sorting via URL', async ({ page }) => {
    await page.goto('/products?sort=price-low');
    // Sort param round-trips — page should not redirect away from it.
    await expect(page).toHaveURL(/sort=price-low/);

    // At least one product card or an empty-state message.
    const grid = page.locator('a[href^="/product/"]');
    const empty = page.locator('text=/no products|empty/i');
    await expect(
      grid.first().or(empty.first()),
      'neither products nor empty state visible',
    ).toBeVisible({ timeout: 10_000 });
  });

  test('product detail shows price, gallery, and pickers if variants exist', async ({ page }) => {
    // Discover a product via /products instead of hardcoding an id, so this
    // test works on any seed dataset.
    await page.goto('/products');
    const firstLink = page.locator('a[href^="/product/"]').first();
    await expect(firstLink).toBeVisible({ timeout: 10_000 });
    await firstLink.click();
    await expect(page).toHaveURL(/\/product\/\d+/);

    // Heading + primary image should be present.
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('img').first()).toBeVisible();

    // A price ought to render — match either the symbol ₹ or "Out of stock".
    const body = page.locator('body');
    const text = (await body.textContent()) || '';
    expect(
      /₹|Out of stock/i.test(text),
      `Expected price or OOS marker on product detail; got: ${text.slice(0, 300)}`,
    ).toBeTruthy();
  });

  test('out-of-stock size pill is disabled (when one exists)', async ({ page }) => {
    // Walk the catalog up to 5 products looking for one with a visibly-OOS
    // size pill (line-through + disabled). On the seeded DB this should
    // succeed; if no products are OOS the test is skipped, not failed.
    await page.goto('/products');
    const links = page.locator('a[href^="/product/"]');
    const count = Math.min(await links.count(), 5);

    let foundOosPill = false;
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (!href) continue;
      await page.goto(href);
      // Size pills our component renders with `line-through` when OOS.
      const oosPill = page.locator('button.line-through[disabled]');
      if (await oosPill.first().isVisible({ timeout: 1500 }).catch(() => false)) {
        // Confirm the pill is genuinely not clickable.
        await expect(oosPill.first()).toBeDisabled();
        foundOosPill = true;
        break;
      }
    }

    test.skip(!foundOosPill, 'No OOS size pill found across first 5 products — set up a variant with stock=0 to exercise this flow.');
  });

  test('navbar search submits and reaches /search or filters /products', async ({ page }) => {
    await page.goto('/');
    // Search input is type=search inside the navbar.
    const search = page.locator('input[type="search"]').first();
    await expect(search).toBeVisible();
    await search.fill('a');
    await search.press('Enter');
    // Either /search?q=… or /products?search=… is acceptable depending on
    // how the navbar's submit handler is wired.
    await expect(page).toHaveURL(/\/(search|products)\?[^]*(q|search)=a/);
  });
});

test.describe('Quick Add modal', () => {
  test('opens, shows price + picker, can close', async ({ page }) => {
    await page.goto('/');
    // Quick Add is the cart icon attached to each product card on the home /
    // listing pages. Different layouts may not surface it — skip if absent.
    const quickAdd = page.locator('button[aria-label*="Quick Add" i], button:has-text("Quick Add")').first();
    const visible = await quickAdd.isVisible({ timeout: 3_000 }).catch(() => false);
    test.skip(!visible, 'Quick Add affordance not visible on home — may be a layout change.');

    await quickAdd.click();
    // Modal should announce itself with the "Quick Add" header.
    const heading = page.getByRole('heading', { name: /quick add/i });
    await expect(heading).toBeVisible({ timeout: 5_000 });

    // Close via the X button.
    await page.getByRole('button', { name: /close/i }).click();
    await expect(heading).toBeHidden({ timeout: 3_000 });
  });
});
