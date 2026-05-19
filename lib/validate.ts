// Shared input validators. Used across profile / addresses / checkout
// so the same rules apply wherever a buyer types a name, email, or
// mobile. Each function returns `null` when the input is acceptable, or
// a human-readable message for the caller to show inline.
//
// Server-side variants exist in suvcraft/src/lib/validate.js — keep the
// two in sync. Server validation is the source of truth; this is for UX.

// Names must have at least one letter pair, be 2–80 chars, and contain
// only letters (any script), spaces, dots, hyphens, apostrophes. Drops
// the `Vsm:;+86/©[${|÷√Δ` style garbage the form previously accepted.
const NAME_RE = /^[\p{L}](?:[\p{L} .'\-]{0,78}[\p{L}])?$/u;

export function validateName(input: string): string | null {
  const v = String(input || "").trim();
  if (!v) return "Name is required.";
  if (v.length < 2) return "Name must be at least 2 characters.";
  if (v.length > 80) return "Name is too long.";
  if (!NAME_RE.test(v)) return "Name can only contain letters, spaces, apostrophes, dots and hyphens.";
  return null;
}

// Email shape with a minimum 2-char TLD so `a@b.x` and other single-char
// TLDs are rejected. Mirrors the standard browser-side check tightened
// to refuse the obviously-fake `adil@g.hskssijd.yusg` pattern we saw in
// the wild (multi-segment, last segment with no real TLD).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export function validateEmail(input: string): string | null {
  const v = String(input || "").trim();
  if (!v) return "Email is required.";
  if (v.length > 254) return "Email is too long.";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address.";
  return null;
}

// Indian mobile: 10 digits starting with 6, 7, 8 or 9 (the only carrier
// prefixes assigned by DoT/TRAI). Country code stripped before calling.
const IN_MOBILE_RE = /^[6-9]\d{9}$/;

export function validateIndianMobile(input: string): string | null {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return "Mobile is required.";
  if (digits.length !== 10) return "Enter a valid 10-digit mobile number.";
  if (!IN_MOBILE_RE.test(digits)) return "Mobile must start with 6, 7, 8 or 9.";
  return null;
}
