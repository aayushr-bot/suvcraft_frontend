"use client";

import { useEffect } from "react";
import { installCsrfFetch } from "@/lib/csrf-fetch";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// Tiny client component placed once at the root layout so the fetch
// patch runs before any data-fetching effect downstream. Renders nothing.
//
// Also fires a one-shot GET to /auth/me which:
//   (a) makes the backend middleware mint the csrf_token cookie on the
//       response, guaranteeing the token exists before any user action,
//   (b) is a no-op for guests (returns { user: null }) so we don't add
//       a meaningful round-trip.
export default function CsrfBootstrap() {
  useEffect(() => {
    installCsrfFetch();
    fetch(`${API}/api/v1/auth/me`, { credentials: "include", cache: "no-store" }).catch(() => {});
  }, []);
  return null;
}
