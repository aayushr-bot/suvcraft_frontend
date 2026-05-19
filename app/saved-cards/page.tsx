"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircleSolid, CreditCardIcon } from "../components/icons";
import { validateName } from "@/lib/validate";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type SavedCard = {
  id: number;
  holder_name: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: number;
  date_added: string;
};

const inputCls =
  "w-full h-[48px] px-4 rounded-[8px] border border-[#d4d4d4] text-[14px] outline-none focus:border-ink transition-colors bg-white";

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  rupay: "RuPay",
  discover: "Discover",
  unknown: "Card",
};

function detectBrand(pan: string): string {
  const n = pan.replace(/\D/g, "");
  if (!n) return "unknown";
  if (/^4/.test(n)) return "visa";
  if (/^(34|37)/.test(n)) return "amex";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^(6011|65|64[4-9])/.test(n)) return "discover";
  if (/^(60|6521|6522|81|82)/.test(n)) return "rupay";
  return "unknown";
}

function luhnValid(pan: string): boolean {
  const n = pan.replace(/\D/g, "");
  if (n.length < 12 || n.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = n.length - 1; i >= 0; i -= 1) {
    let d = Number(n.charAt(i));
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function formatPan(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

export default function SavedCardsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // New card form
  const [holderName, setHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  const detected = detectBrand(cardNumber);

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }

  // White full-screen, same trick as cart/checkout/profile/addresses.
  useEffect(() => {
    const prevBg = document.body.style.background;
    document.body.style.background = "#ffffff";
    return () => { document.body.style.background = prevBg; };
  }, []);

  async function loadCards() {
    try {
      const res = await fetch(`${API}/api/v1/saved-cards`, { credentials: "include" });
      if (res.status === 401) { router.replace("/"); return; }
      const json = await res.json();
      const list: SavedCard[] = json?.data?.rows ?? [];
      setCards(list);
    } catch {
      setError("Failed to load cards.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCards();
    // Pre-fill the cardholder name with the signed-in user's name.
    fetch(`${API}/api/v1/auth/me`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.data?.user?.name) setHolderName((v) => v || j.data.user.name); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setCardNumber("");
    setExpMonth("");
    setExpYear("");
    setCvv("");
    setMakeDefault(false);
    setError("");
  }

  function validate(): string {
    const nameErr = validateName(holderName);
    if (nameErr) return nameErr.replace(/^Name /, "Cardholder name ");
    const pan = cardNumber.replace(/\D/g, "");
    if (pan.length < 12 || pan.length > 19) return "Enter a valid card number.";
    // Luhn check rejects obvious typos and the sequential-digit garbage
    // ("4844 3462 6264 3462 94…") that previously slipped through the
    // bare length check.
    if (!luhnValid(pan)) return "That card number doesn't look right.";
    const m = Number(expMonth);
    if (!m || m < 1 || m > 12) return "Enter a valid expiry month (1-12).";
    const y = Number(expYear.length === 2 ? `20${expYear}` : expYear);
    if (!y || y < 2000 || y > 2099) return "Enter a valid expiry year.";
    const lastDay = new Date(y, m, 0);
    if (lastDay < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) {
      return "This card has already expired.";
    }
    // CVV: Amex uses 4 digits, all others 3.
    const cvvLen = detectBrand(pan) === "amex" ? 4 : 3;
    if (!new RegExp(`^\\d{${cvvLen}}$`).test(cvv)) {
      return `Enter a valid ${cvvLen}-digit CVV.`;
    }
    return "";
  }

  async function saveCard() {
    const err = validate();
    if (err) { setError(err); return; }
    setBusy(true); setError("");
    try {
      const pan = cardNumber.replace(/\D/g, "");
      const res = await fetch(`${API}/api/v1/saved-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          holder_name: holderName.trim(),
          card_number: pan,
          brand: detectBrand(pan),
          exp_month: Number(expMonth),
          exp_year: Number(expYear.length === 2 ? `20${expYear}` : expYear),
          cvv: cvv,
          is_default: makeDefault,
        }),
      });
      const json = await res.json();
      if (json.error) { setError(json.message || "Could not save card."); return; }
      await loadCards();
      resetForm();
      flashToast("Card saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCard(id: number) {
    if (!confirm("Remove this card?")) return;
    setBusy(true);
    try {
      await fetch(`${API}/api/v1/saved-cards/${id}`, { method: "DELETE", credentials: "include" });
      await loadCards();
      flashToast("Card removed.");
    } finally {
      setBusy(false);
    }
  }

  async function setAsDefault(id: number) {
    setBusy(true);
    try {
      await fetch(`${API}/api/v1/saved-cards/${id}/default`, { method: "PUT", credentials: "include" });
      await loadCards();
      flashToast("Default card set.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-1 pb-10 md:px-8 bg-white min-h-screen">
        <p className="py-20 text-center text-[14px] text-[#8c8c8c]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-1 pb-10 md:px-8 bg-white min-h-screen">
      <nav className="text-[13px] text-[#8c8c8c] mb-4">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="mx-1.5">›</span>
        <span className="text-ink">Saved Cards</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-ink md:text-[30px]">Saved Cards</h1>
        <p className="mt-0.5 text-[13px] text-[#525151]">
          Save your card for faster checkout. We only store the last 4 digits, expiry, and cardholder name — never the full number or CVV.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
        {/* Left: saved cards list */}
        <div className="flex-1 flex flex-col gap-3">
          {cards.length === 0 ? (
            <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white p-10 text-center">
              <CreditCardIcon className="mx-auto h-10 w-10 text-[#cfcfcf] mb-3" />
              <p className="text-[15px] font-semibold text-ink">No saved cards yet</p>
              <p className="mt-1 text-[12.5px] text-[#878787]">Use the form on the right to add your first one.</p>
            </div>
          ) : (
            cards.map((c) => {
              const isDefault = Number(c.is_default) === 1;
              return (
                <div
                  key={c.id}
                  className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="flex h-[44px] w-[60px] shrink-0 items-center justify-center rounded-[6px] bg-[#0a0a0a] text-white">
                        <CreditCardIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[15px] font-bold text-ink">
                            {BRAND_LABEL[c.brand] || "Card"} •••• {c.last4}
                          </span>
                          {isDefault && (
                            <span className="inline-flex h-[20px] items-center rounded-[4px] bg-emerald-50 px-1.5 text-[10px] font-semibold uppercase text-emerald-700">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-[#525151]">{c.holder_name}</p>
                        <p className="mt-0.5 text-[12.5px] text-[#878787]">
                          Expires {String(c.exp_month).padStart(2, "0")}/{String(c.exp_year).slice(-2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => setAsDefault(c.id)}
                          disabled={busy}
                          className="text-[12px] font-semibold text-[#525151] hover:text-ink hover:underline whitespace-nowrap"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeCard(c.id)}
                        disabled={busy}
                        className="text-[12px] font-semibold text-red-600 hover:text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: always-visible add-card form */}
        <div className="w-full lg:w-[500px] lg:shrink-0">
          <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white p-6 lg:sticky lg:top-1">
            <h2 className="text-[16px] font-bold text-ink mb-1">Add a new card</h2>
            <p className="text-[12.5px] text-[#878787] mb-5">Only the last 4 digits and expiry are stored.</p>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-ink mb-1.5">Cardholder Name</label>
                <input
                  type="text"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  className={inputCls}
                  placeholder="Name on card"
                  autoComplete="cc-name"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-ink mb-1.5">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatPan(cardNumber)}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 19))}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 5678 9012 3456"
                    className={`${inputCls} pr-24`}
                  />
                  {cardNumber.length >= 4 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase text-[#878787]">
                      {BRAND_LABEL[detected]}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-ink mb-1.5">Exp Month</label>
                  <input
                    type="text"
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    inputMode="numeric"
                    autoComplete="cc-exp-month"
                    placeholder="MM"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-ink mb-1.5">Exp Year</label>
                  <input
                    type="text"
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    autoComplete="cc-exp-year"
                    placeholder="YYYY"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-ink mb-1.5">CVV</label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder={detected === "amex" ? "1234" : "123"}
                    maxLength={detected === "amex" ? 4 : 3}
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="text-[11.5px] text-[#878787] -mt-2">
                CVV is required for every transaction.
              </p>

              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={makeDefault}
                  onChange={(e) => setMakeDefault(e.target.checked)}
                  className="h-4 w-4 accent-emerald-500"
                />
                <span className="text-[13px] text-[#525151]">Set as default card</span>
              </label>
            </div>

            {error && <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveCard}
                disabled={busy}
                className="inline-flex h-[44px] items-center justify-center rounded-[8px] bg-ink-soft px-7 text-[13px] font-bold text-white tracking-[0.1em] hover:bg-black disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save Card"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="text-[13px] font-semibold text-[#525151] hover:text-ink"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]" />
          <div className="fixed bottom-10 left-1/2 z-[100] flex -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-[12px] bg-white px-6 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#e7e7e7]">
              <CheckCircleSolid className="h-6 w-6 text-green-600" />
              <span className="text-[15px] font-medium text-ink">{toast}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
