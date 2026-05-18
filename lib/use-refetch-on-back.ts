"use client";

import { useEffect } from "react";

// Re-runs `refetch` when the page becomes visible again — covers:
//   • browser back / forward navigation that restores the page from the
//     BFCache (the `pageshow` event with `persisted === true`),
//   • the tab regaining focus after being switched / minimised
//     (`visibilitychange` to "visible"),
//   • soft-navigations that re-mount the consumer (initial useEffect run).
//
// Next.js's router cache otherwise serves stale RSC payloads on back-nav,
// so list pages (orders, wishlist) and detail pages (orders/[id], product)
// can show outdated state. Apply this hook on pages whose data can change
// in another tab between visits.
//
// The `refetch` callback should be stable (wrap in useCallback at the call
// site) to avoid the listeners re-binding on every render.

export function useRefetchOnBack(refetch: () => void) {
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      // Only re-fetch when the page was restored from BFCache. A normal
      // first-load fires pageshow with persisted=false and the consumer's
      // own initial useEffect already covers that case.
      if (e.persisted) refetch();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    const onPopState = () => {
      // popstate fires reliably on browser back/forward — covers the case
      // where Next's router cache restores the route segment without
      // unmounting the component, so neither useEffect nor pageshow re-run.
      refetch();
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("popstate", onPopState);
    };
  }, [refetch]);
}
