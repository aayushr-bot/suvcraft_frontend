import { test, expect } from '@playwright/test';

// FAQ + policies — the content surfaces that depend on admin-managed copy.
// We assert page chrome + interaction works; the actual copy is admin-owned
// so we don't pin to exact strings.

test.describe('FAQ page', () => {
  test('renders the categories sidebar and at least one Q&A', async ({ page }) => {
    await page.goto('/faq');
    await expect(page.locator('h1')).toContainText(/frequently asked|help/i);

    // Category nav — buttons inside the aside.
    const categoryButtons = page.locator('nav[aria-label="FAQ categories"] button');
    await expect(categoryButtons.first()).toBeVisible({ timeout: 10_000 });
    expect(await categoryButtons.count(), 'no FAQ categories').toBeGreaterThan(0);

    // At least one FAQ row should render.
    const faqCards = page.locator('button[aria-expanded]');
    expect(await faqCards.count()).toBeGreaterThan(0);
  });

  test('clicking a category switches the active tab', async ({ page }) => {
    await page.goto('/faq');
    const categoryButtons = page.locator('nav[aria-label="FAQ categories"] button');
    const count = await categoryButtons.count();
    test.skip(count < 2, 'Need at least 2 categories to switch — seed more.');

    const first = categoryButtons.nth(0);
    const second = categoryButtons.nth(1);

    // Click the second tab and confirm the URL hash updates.
    await second.click();
    const hash = await page.evaluate(() => window.location.hash);
    expect(hash, 'category click should update #hash').toMatch(/^#/);

    // Back to first.
    await first.click();
  });

  test('expanding a question shows its answer', async ({ page }) => {
    await page.goto('/faq');
    const firstQ = page.locator('button[aria-expanded]').first();
    await firstQ.click();
    await expect(firstQ).toHaveAttribute('aria-expanded', 'true');
  });

  test('search box filters Q&A across categories', async ({ page }) => {
    await page.goto('/faq');
    const search = page.locator('input[type="search"][placeholder*="Search" i]').first();
    await search.fill('refund');
    // Either matching rows render or "Nothing matched" empty state appears.
    await expect(
      page.locator('text=/result|nothing matched/i').first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Policies & legal grid links to /policies/* pages', async ({ page }) => {
    await page.goto('/faq');
    const aboutCard = page.locator('a[href="/policies/about-us"]').first();
    await expect(aboutCard).toBeVisible();
    await aboutCard.click();
    await expect(page).toHaveURL(/\/policies\/about-us$/);
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('Policy pages', () => {
  const POLICIES = [
    { slug: 'about-us', heading: /about/i },
    { slug: 'privacy-policy', heading: /privacy/i },
    { slug: 'shipping-policy', heading: /shipping/i },
    { slug: 'return-policy', heading: /return/i },
  ];

  for (const p of POLICIES) {
    test(`${p.slug} renders heading + content`, async ({ page }) => {
      await page.goto(`/policies/${p.slug}`);
      await expect(page.locator('h1')).toContainText(p.heading);
      // Either real content OR the friendly "not published yet" empty state.
      const body = (await page.locator('main, body').textContent()) || '';
      expect(body.length, `${p.slug} body suspiciously empty`).toBeGreaterThan(50);
    });
  }

  test('storefront navbar/footer also expose policy links', async ({ page }) => {
    await page.goto('/');
    // Footer "Policies" column.
    await expect(page.locator('footer a[href="/policies/about-us"]').first()).toBeVisible();
    await expect(page.locator('footer a[href="/policies/privacy-policy"]').first()).toBeVisible();
    await expect(page.locator('footer a[href="/policies/shipping-policy"]').first()).toBeVisible();
    await expect(page.locator('footer a[href="/policies/return-policy"]').first()).toBeVisible();
  });
});

test.describe('Contact / Help modal', () => {
  test('opens from navbar, shows quick-help tiles, raises a ticket form', async ({ page }) => {
    await page.goto('/');
    const contactBtn = page.getByRole('button', { name: /^contact$/i }).first();
    await contactBtn.click();

    // Modal header.
    await expect(page.getByRole('heading', { name: /help|how can we help/i })).toBeVisible({ timeout: 5_000 });

    // Quick-help tiles include a Track-your-order link.
    await expect(page.getByRole('link', { name: /track your order/i })).toBeVisible();

    // Raise-a-ticket CTA opens the inline form.
    const raise = page.getByRole('button', { name: /raise a support ticket/i });
    await expect(raise).toBeVisible();
    await raise.click();
    await expect(page.getByRole('heading', { name: /tell us what happened/i })).toBeVisible({ timeout: 3_000 });

    // Form fields rendered.
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Wrong item" i]')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('signed-out ticket submit surfaces the auth error inline', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^contact$/i }).first().click();
    await page.getByRole('button', { name: /raise a support ticket/i }).click();

    await page.locator('input[placeholder*="Wrong item" i]').fill('Test subject');
    await page.locator('textarea').fill('Test body — running in e2e.');
    await page.getByRole('button', { name: /^send ticket$/i }).click();

    // Server should reject with 401 since this run isn't authed. The form
    // should show the error inline, not silently swallow it.
    await expect(page.locator('text=/sign in|log in|please log in/i').first())
      .toBeVisible({ timeout: 5_000 });
  });
});
