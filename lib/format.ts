// Shared formatters for money + dates so the storefront isn't full of
// ad-hoc `₹${n.toLocaleString("en-IN")}` and `new Date(...).toLocaleString(...)`
// snippets. Touching a single file here changes formatting site-wide.
//
// Currency defaults come from build-time env vars so a deploy targeting a
// different market can swap the symbol + locale without code changes:
//   NEXT_PUBLIC_CURRENCY_SYMBOL — e.g. "₹", "$", "€"
//   NEXT_PUBLIC_CURRENCY_LOCALE — e.g. "en-IN", "en-US", "de-DE"
// Both fall back to the existing Indian-rupee defaults.

const CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? "₹";
const CURRENCY_LOCALE = process.env.NEXT_PUBLIC_CURRENCY_LOCALE ?? "en-IN";

// Returns "₹2,499" for `2499`, "₹0" for null/undefined/NaN. By default uses
// the locale's natural fraction-digit behaviour (typically 0 for whole
// numbers). Pass `{ maxFractionDigits: 2 }` for amounts that may carry
// paise/cents and need a 2-decimal cap (refunds, gateway totals).
export function formatMoney(
  n: number | string | null | undefined,
  opts: { maxFractionDigits?: number } = {},
): string {
  if (n == null || n === "") return `${CURRENCY_SYMBOL}0`;
  const num = Number(n);
  if (!Number.isFinite(num)) return `${CURRENCY_SYMBOL}0`;
  const lopts: Intl.NumberFormatOptions = {};
  if (opts.maxFractionDigits != null) lopts.maximumFractionDigits = opts.maxFractionDigits;
  return `${CURRENCY_SYMBOL}${num.toLocaleString(CURRENCY_LOCALE, lopts)}`;
}

// Date formatting. Two presets so the cart, orders, and profile pages can
// agree on a single look instead of each rolling their own.
//   "short"    → "15 May 2026"
//   "long"     → "15 May 2026, 5:23 pm"
//   "datetime" → "15 May 2026, 17:23"
export type DateStyle = "short" | "long" | "datetime";

const STYLE_OPTS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: "numeric", month: "short", year: "numeric" },
  long: { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" },
  datetime: { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false },
};

export function formatDate(input: string | number | Date | null | undefined, style: DateStyle = "short"): string {
  if (input == null || input === "") return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return typeof input === "string" ? input : "";
  return d.toLocaleString(CURRENCY_LOCALE, STYLE_OPTS[style]);
}
