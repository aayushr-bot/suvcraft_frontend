"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cartContext";
import { api, type SiteSettings } from "@/lib/api";
import { CreditCardCheckIcon, ArrowLeftIcon } from "../components/icons";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function fmt(n: number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

type OrderInfo = {
  payment_method?: string;
  customer_email?: string;
  date_added?: string;
  final_total?: number;
  total?: number;
  notes?: string | null;
  address?: { email?: string } | null;
  transaction?: { txn_id?: string; payu_txn_id?: string } | null;
};

function emailFromNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  try {
    const parsed = JSON.parse(notes);
    return typeof parsed?.email === "string" ? parsed.email.trim() : "";
  } catch {
    return "";
  }
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#FEF2D1] flex items-center justify-center"><div className="text-ink">Loading…</div></div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const params = useSearchParams();
  const { clearCart } = useCart();

  const orderId = params.get("id") || "";
  const total = Number(params.get("total") || 0);
  const [date] = useState(() =>
    new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
  );
  const [info, setInfo] = useState<OrderInfo | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    clearCart();
    if (orderId) {
      fetch(`${API}/api/v1/orders/${orderId}`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (j?.data?.order) setInfo(j.data.order as OrderInfo); })
        .catch(() => {});
    }
    api.settings()
      .then((s) => setSettings(s as SiteSettings))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefer the real gateway txn id; fall back to a TXN-{orderId} placeholder for
  // COD/no-gateway orders so the receipt always has something to show.
  const transactionId =
    info?.transaction?.txn_id || info?.transaction?.payu_txn_id ||
    (orderId ? `TXN-${orderId}` : "");
  const paymentMethod = (info?.payment_method || "").toLowerCase();
  const paymentLabel =
    paymentMethod === "cod" ? "Cash on Delivery"
      : paymentMethod === "upi" ? "UPI"
      : paymentMethod === "card" ? "Card"
      : paymentMethod === "bank" ? "Net Banking"
      : info?.payment_method || "—";
  // Prefer the email the buyer typed at checkout — saved either on the linked
  // address row or in the order's `notes` JSON. Fall back to the account email
  // last so older orders (with no address_id and no notes email) still show
  // something rather than nothing.
  const email = info?.address?.email || emailFromNotes(info?.notes) || info?.customer_email || "";
  const supportEmail = settings?.support_email || "";

  async function copyTxn() {
    if (!transactionId) return;
    try {
      await navigator.clipboard.writeText(transactionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function downloadReceipt() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#FEF2D1] overflow-auto flex items-center justify-center p-4">
      <div className="relative z-10 w-full flex justify-center py-4">
        <div className="w-full max-w-[520px] rounded-[20px] bg-white p-8 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.12)] flex flex-col">

          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/figma/suvcraft-logo.png" alt="SUVCRAFT" className="h-[36px] w-auto" />
            <span className="font-bruno text-[22px] font-bold leading-none tracking-tight text-brand-purple">
              SUVCRAFT
            </span>
          </div>

          {/* Status icon + heading */}
          <div className="flex flex-col items-center mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E5F7ED] text-[#00B140] mb-3">
              <CreditCardCheckIcon className="h-5 w-5" />
            </div>
            <h1 className="text-[22px] font-bold text-[#00B140] mb-1.5 text-center">
              Payment Successful!
            </h1>
            <p className="text-[12.5px] text-[#8c8c8c] text-center leading-relaxed">
              Your payment has been processed successfully.<br />
              You will receive a confirmation email shortly.
            </p>
          </div>

          {/* Receipt card */}
          <div className="rounded-[12px] bg-[#f9fafb] p-4 mb-4">
            {total > 0 && (
              <>
                <div className="flex justify-between items-center pb-3">
                  <span className="text-[13px] text-ink font-semibold">Amount</span>
                  <span className="text-[16px] font-bold text-ink">{fmt(total)}</span>
                </div>
                <hr className="border-t border-dashed border-[#e5e7eb] mb-3" />
              </>
            )}

            <div className="flex flex-col gap-2.5 text-[12px]">
              {transactionId && (
                <div className="flex justify-between items-center gap-3">
                  <span className="text-[#8c8c8c]">Transaction ID</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-ink bg-white px-2.5 py-1 rounded-md border border-[#e5e7eb]">
                      {transactionId}
                    </span>
                    <button
                      type="button"
                      onClick={copyTxn}
                      title={copied ? "Copied" : "Copy"}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-[#8c8c8c] hover:text-ink hover:bg-white transition-colors"
                    >
                      {copied ? (
                        <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="9" y="9" width="11" height="11" rx="2" />
                          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[#8c8c8c]">Payment Method</span>
                <span className="font-medium text-ink">{paymentLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8c8c8c]">Date</span>
                <span className="font-medium text-ink">{date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8c8c8c]">Merchant</span>
                <span className="font-medium text-ink">SUVCRAFT</span>
              </div>
            </div>
          </div>

          {/* Email confirmation bar */}
          {email && (
            <div className="flex items-center justify-center gap-2 rounded-[8px] bg-[#eff6ff] px-3 py-2.5 mb-4">
              <svg className="h-3.5 w-3.5 text-[#3b82f6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              <span className="text-[12px] text-[#3b82f6]">Receipt sent to {email}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-2.5 mb-4">
            <button
              type="button"
              onClick={downloadReceipt}
              className="flex h-[42px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#0a0a0a] text-[13px] font-semibold text-white hover:bg-black transition-all"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
              </svg>
              Download Receipt
            </button>
            <Link
              href="/"
              className="flex h-[42px] w-full items-center justify-center gap-2 rounded-[8px] bg-white border border-[#e5e7eb] text-[13px] font-semibold text-ink hover:border-ink transition-all"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Return to Store
            </Link>
          </div>

          {supportEmail && (
            <p className="text-center text-[11px] text-[#94a3b8]">
              Need help? Contact our support team at{" "}
              <a href={`mailto:${supportEmail}`} className="text-brand-purple hover:underline">
                {supportEmail}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
