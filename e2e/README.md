# Suvcraft storefront — end-to-end tests

Playwright suite exercising the public storefront flows. Designed to run
against a local dev server (`npm run dev`) or a deployed environment via
`E2E_BASE_URL`.

## One-time setup

From the storefront directory:

```bash
cd frontend
npm install                                    # installs @playwright/test
npx playwright install chromium                # downloads the browser binary
```

If you want Firefox + WebKit coverage too:

```bash
npx playwright install
```

…and uncomment the extra projects in [`playwright.config.ts`](../playwright.config.ts).

## Running tests

Start the storefront dev server in one terminal:

```bash
cd frontend
npm run dev    # serves on http://localhost:3001 (or whatever Next picks)
```

…then in another terminal:

```bash
cd frontend
npm run test:e2e            # headless, one shot
npm run test:e2e:ui         # interactive Playwright UI — best for debugging
npm run test:e2e:report     # open the HTML report after a run
```

### Against staging / production

```bash
E2E_BASE_URL=https://suvcraft.sarstage.online npm run test:e2e
```

### Let Playwright start the dev server for you

```bash
E2E_AUTOSTART=1 npm run test:e2e
```

…will run `npm run dev` itself and wait for the URL to respond before the
tests start. Good for CI; less ergonomic locally.

## What each suite covers

| Spec | What it tests | Needs auth? |
|---|---|---|
| [`smoke.spec.ts`](./smoke.spec.ts) | Every public route + auth-gated route returns < 500 with no console errors. The "did Next.js even build?" sanity check. | No |
| [`product-browse.spec.ts`](./product-browse.spec.ts) | Home → product detail, sort param round-trip, OOS size pill behaviour, Quick Add modal. | No |
| [`faq-and-policies.spec.ts`](./faq-and-policies.spec.ts) | FAQ category tabs, search filter, expand a Q&A, all four `/policies/*` pages render, contact modal opens and ticket form posts. | No (ticket post is *expected* to 401 when signed out — we assert the error renders inline). |
| [`search.spec.ts`](./search.spec.ts) | `/search?q=…` happy path, empty state, navbar input submission. | No |
| [`cart-auth.spec.ts`](./cart-auth.spec.ts) | Empty-cart state, checkout button when signed out, auth modal validation. | No |

## Adding tests that need a logged-in user

The current suite skips deeper flows (place order, cancel order, return,
admin pages) because they need real credentials. Wire them in like this:

1. **Create an "authed" storage state** — run a one-off setup test that
   signs in with seeded credentials and saves cookies:

   ```ts
   // e2e/setup/auth.setup.ts
   import { test as setup } from '@playwright/test';
   setup('authenticate as test buyer', async ({ page }) => {
     await page.goto('/');
     // …click Sign In, fill phone/OTP, submit…
     await page.context().storageState({ path: 'e2e/.auth/buyer.json' });
   });
   ```

2. **Reference it from a project** — add a project entry in
   `playwright.config.ts` with `storageState: 'e2e/.auth/buyer.json'`.

3. **Add specs under that project** so every test in the file boots
   already authed. Don't commit `.auth/*.json` — add it to `.gitignore`.

## Diagnostics

- **Trace viewer:** after a failure, run
  `npx playwright show-trace test-results/<path-to-trace.zip>` — gives
  you a timeline + DOM snapshots for every step.
- **Screenshots:** captured automatically on failure under
  `test-results/`.
- **HTML report:** `npm run test:e2e:report` opens the latest run.

## CI tips

- Set `CI=1` env to enable retries and run sequentially.
- Set `E2E_AUTOSTART=1` so Playwright owns the dev-server lifecycle.
- Cache `~/.cache/ms-playwright` between runs to skip the browser download.

## Conventions

- **Tests own their data discovery.** No hardcoded product IDs / SKUs.
  Each test clicks the first thing matching its locator so the suite
  survives DB reseeds.
- **Skip, don't fail, on missing fixtures.** If a flow needs an OOS
  variant or admin login that the current dataset doesn't have, use
  `test.skip(condition, 'reason')` rather than letting the test fail.
- **Loose copy assertions.** Match copy with regex (`/refund/i`), not
  exact strings — admins rewrite policies and FAQ entries.
- **One behaviour per test.** Each `test()` exercises one thing so a
  failure tells you exactly what regressed.
