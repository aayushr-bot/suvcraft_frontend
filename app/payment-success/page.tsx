"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cartContext";
import { CreditCardCheckIcon, ArrowLeftIcon } from "../components/icons";

function fmt(n: number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#FDF1D9] flex items-center justify-center"><div className="text-ink">Loading…</div></div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const params = useSearchParams();
  const { clearCart } = useCart();

  const orderId = params.get("id") || "";
  const total = Number(params.get("total") || 0);
  const [date] = useState(() => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));

  useEffect(() => {
    clearCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#FDF1D9] overflow-hidden flex items-center justify-center p-4">
      {/* Brick pattern background */}
      <div
        className="absolute inset-0 opacity-[0.2] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='80' viewBox='0 0 120 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23C2A38A' stroke-width='1.5'%3E%3Cpath d='M0 0h120M0 40h120M0 80h120' /%3E%3Cpath d='M30 0v15M90 0v15M0 40v15M60 40v15M120 40v15M30 80v-15M90 80v-15' /%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "240px 160px",
        }}
      />

      <div className="relative z-10 w-full flex justify-center py-4
        [transform:scale(0.7)] sm:[transform:scale(0.85)] md:[transform:scale(0.95)] lg:[transform:scale(1)]"
      >
        <div className="w-full max-w-[440px] rounded-[32px] bg-white p-8 md:p-10 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.15)] border border-white/20 flex flex-col">

          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-3 mb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/figma/suvcraft-logo.png" alt="SUVCRAFT" className="h-[52px] w-auto" />
              <span className="font-bruno text-[32px] font-bold leading-none tracking-tight text-brand-purple">
                SUVCRAFT
              </span>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E5F7ED] text-[#00B140] mb-4 shadow-sm">
              <CreditCardCheckIcon className="h-6 w-6" />
            </div>

            <h1 className="text-[28px] font-bold text-[#00B140] mb-2 tracking-tight text-center">
              Order Placed!
            </h1>
            <p className="text-[14px] text-[#8c8c8c] text-center max-w-[320px] leading-relaxed">
              Your order has been received. We will contact you to confirm delivery.
            </p>
          </div>

          {/* Receipt */}
          <div className="rounded-[24px] bg-[#f9fafb] p-6 mb-6 border border-[#f0f0f0]">
            {total > 0 && (
              <div className="flex justify-between items-center mb-4">
                <span className="text-[14px] text-[#6b6b6b] font-medium">Amount</span>
                <span className="text-[18px] font-bold text-ink">{fmt(total)}</span>
              </div>
            )}

            <hr className="border-t border-dashed border-[#e5e7eb] mb-4" />

            <div className="flex flex-col gap-3">
              {orderId && (
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-[#8c8c8c]">Order ID</span>
                  <span className="text-[13px] font-bold text-ink bg-white px-3 py-1 rounded-lg border border-[#e5e7eb] shadow-sm">
                    #{orderId}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#8c8c8c]">Status</span>
                <span className="text-[13px] font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  Awaiting confirmation
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#8c8c8c]">Date</span>
                <span className="text-[13px] font-semibold text-ink">{date}</span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 mb-6">
            <Link
              href="/"
              className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#030712] text-[14px] font-bold text-white hover:bg-black transition-all shadow-md"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Continue Shopping
            </Link>
          </div>

          <div className="text-center">
            <p className="text-[12px] font-medium text-[#94a3b8]">
              Need help? Contact us at{" "}
              <span className="text-brand-purple">support@suvcraft.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
