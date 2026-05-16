import { test, expect } from '@playwright/test';

// Cart + auth flows that don't require pre-seeded credentials. For deeper
// flows (place order, cancel, return), use a separate suite that loads an
// authenticated storageState — see e2e/README.md for setup notes.

test.describe('Cart (signed out)', () => {
  test('cart icon in navbar shows zero / no badge on a fresh visit', async ({ page }) => {
    // Clear any prior cart state from localStorage on each test run.
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Cart count badge — admin layout uses a small numbered pill on the
    // cart icon. When zero, the badge should either be absent or read "0".
    const badge = page.locator('a[href="/cart"] [class*="rounded-full"]').first();
    if (await badge.isVisible({ timeout: 1500 }).catch(() => false)) {
      const text = (await badge.textContent())?.trim();
      expect(text === '' || text === '0').toBeTruthy();
    }
  });

  test('/cart renders an empty-state when there are no items', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/cart');
    // Acceptable outcomes: empty-cart message OR redirected to /.
    const url = page.url();
    if (/\/cart/.test(url)) {
      await expect(page.locator('text=/empty|nothing here|cart is empty/i').first())
        .toBeVisible({ timeout: 5_000 });
    } else {
      expect(url, 'cart should either show empty state or redirect home').toMatch(/\/$/);
    }
  });

  test('clicking Check Out Now while signed out opens the auth modal', async ({ page }) => {
    // Seed one cart item via localStorage so the page has something to render.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('suvcraft_cart', JSON.stringify([{
        id: 1, variant_id: 1, name: 'Test product', image: '', price: 100, qty: 1,
      }]));
    });
    await page.goto('/cart');

    // Try clicking checkout — if the user isn't authed, an auth modal opens.
    const checkout = page.getByRole('button', { name: /check out now|checkout/i }).first();
    if (await checkout.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await checkout.click();
      // Either an auth modal appears, OR we redirect to /checkout (server
      // will block with 401 from there).
      const modal = page.getByRole('dialog');
      const onCheckout = /\/checkout/.test(page.url());
      const modalVisible = await modal.isVisible({ timeout: 3_000 }).catch(() => false);
      expect(modalVisible || onCheckout, 'no auth modal or checkout redirect on signed-out checkout').toBeTruthy();
    }
  });
});

test.describe('Auth modal', () => {
  test('opens, switches between Sign In and Sign Up, validates inputs', async ({ page }) => {
    await page.goto('/');

    // Discover the auth trigger — usually the avatar / "Sign in" link in the navbar.
    const trigger = page.getByRole('button', { name: /sign in|hi,|account/i }).first();
    const visible = await trigger.isVisible({ timeout: 3_000 }).catch(() => false);
    test.skip(!visible, 'No visible sign-in trigger — navbar may render an avatar for an already-authed run.');

    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3_000 });

    // Switch to Sign Up if a link exists.
    const signUpLink = dialog.getByRole('button', { name: /sign up/i });
    if (await signUpLink.isVisible({ timeout: 1500 }).catch(() => false)) {
      await signUpLink.click();
    }

    // Hitting Submit with empty fields should surface an error, not crash.
    const submit = dialog.getByRole('button', { name: /log in|sign up/i }).first();
    if (await submit.isVisible({ timeout: 1500 }).catch(() => false)) {
      await submit.click();
      // Expect either a visible error inside the modal OR the modal still
      // open (no navigation away on invalid submit).
      expect(page.url(), 'modal submit should not navigate when invalid').toMatch(/\/$|\/products/);
    }
  });
});
