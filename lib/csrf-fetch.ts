"use client";

// Monkey-patches global fetch on the storefront so every state-changing
// same-origin (or same-eTLD+1) request auto-attaches the `X-CSRF-Token`
// header. The backend middleware enforces the double-submit-cookie check.
//
// Why patch rather than wrap call sites? The codebase fires dozens of
// fetches across components and lib files; missing one would silently
// fail with a 403 in production. Patching once at the root keeps the
// existing call sites untouched and ensures coverage as new ones are
// added.

const PATCHED = Symbol.for('suvcraft.csrfFetchPatched');
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function installCsrfFetch() {
  if (typeof window === 'undefined') return;
  const w = window as unknown as Window & { [PATCHED]?: boolean };
  if (w[PATCHED]) return;
  const originalFetch = window.fetch.bind(window);
  w[PATCHED] = true;

  window.fetch = async function patchedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (SAFE_METHODS.has(method)) return originalFetch(input, init);

    // Only attach for our own backend. Cross-origin third parties get
    // the raw call so we don't accidentally leak the token.
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    let isOurApi = false;
    try {
      const u = new URL(url, window.location.origin);
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      isOurApi = u.origin === window.location.origin || (!!apiBase && url.startsWith(apiBase));
    } catch {
      isOurApi = true; // relative URLs default to same origin
    }
    if (!isOurApi) return originalFetch(input, init);

    const token = readCsrfToken();
    if (!token) return originalFetch(input, init); // server will reject; nothing to add
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has('x-csrf-token')) headers.set('x-csrf-token', token);
    return originalFetch(input, { ...init, headers, credentials: init.credentials ?? 'include' });
  };
}
