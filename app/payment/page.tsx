"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cartContext";
import type { Address } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const METHODS = [
  { id: "card", label: "Card" },
  { id: "bank", label: "Bank" },
  { id: "cod", label: "Cash on Delivery" },
  { id: "upi", label: "UPI" },
];

export default function PaymentPage() {
  const router = useRouter();
  const { items, total, count, clearCart, taxTotal, deliveryCharge, coupon, couponDiscount, finalTotal, removeCoupon } = useCart();
  const [method, setMethod] = useState("card");
  const [saveCard, setSaveCard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedAddress, setSavedAddress] = useState<Address | null>(null);
  const [productInfo, setProductInfo] = useState<Record<number, { mrp?: number }>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("suvcraft_address");
      if (raw) setSavedAddress(JSON.parse(raw) as Address);
    } catch {}
  }, []);

  // Pull MRP per cart item — needed for "Total MRP" line in the price summary.
  useEffect(() => {
    let cancelled = false;
    items.forEach((item) => {
      if (productInfo[item.id]) return;
      fetch(`${API}/api/v1/products/${item.id}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (cancelled || !j?.data) return;
          const p = j.data;
          const price = Number(p.price ?? 0);
          const special = Number(p.special_price ?? 0);
          const mrp = special && price && special < price ? price : price || special;
          setProductInfo((prev) => ({ ...prev, [item.id]: { mrp: mrp || undefined } }));
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const totalMrp = items.reduce((sum, it) => sum + (productInfo[it.id]?.mrp ?? it.price) * it.qty, 0);

  // Bounce unauthenticated users back to /cart (where the auth modal can prompt login)
  useEffect(() => {
    fetch(`${API}/api/v1/auth/me`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.data?.user) router.replace("/cart");
      })
      .catch(() => {});
  }, [router]);

  // Same body override as checkout — payment is a clean white canvas, not the
  // site-wide cream gradient.
  useEffect(() => {
    const prevBg = document.body.style.background;
    document.body.style.background = "#ffffff";
    return () => { document.body.style.background = prevBg; };
  }, []);

  // UPI / Card fields (placeholder — no real gateway)
  const [upiId, setUpiId] = useState("");
  const [cardNo, setCardNo] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  async function placeOrder() {
    if (!items.length) { setError("Your cart is empty."); return; }

    let address: Record<string, string> = {};
    try {
      address = JSON.parse(sessionStorage.getItem("suvcraft_address") || "{}");
    } catch {}

    if (!address.name || !address.mobile) {
      setError("Address missing. Please go back and fill the address form.");
      return;
    }

    // Basic validation for non-COD methods
    if (method === "upi" && !upiId.trim()) { setError("Please enter your UPI ID."); return; }
    if (method === "card") {
      if (!cardNo.trim() || !cardExp.trim() || !cardCvv.trim()) {
        setError("Please fill all card details."); return;
      }
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: address.name,
          email: address.email || "",
          mobile: address.mobile,
          address: address.address,
          city: address.city,
          state: address.state,
          zip: address.pincode || address.zip,
          address_id: address.id ? Number(address.id) : undefined,
          payment_method: method,
          items: items.map((i) => ({ id: i.id, name: i.name, image: i.image, price: i.price, qty: i.qty, variant_id: i.variant_id })),
          promo_code: coupon?.code || undefined,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        setError("Please log in to place this order.");
        // Bounce to checkout where the auth modal can prompt login
        setTimeout(() => router.push("/cart"), 1500);
        return;
      }
      if (json.error) { setError(json.message || "Order failed."); return; }

      clearCart();
      removeCoupon();
      try { sessionStorage.removeItem("suvcraft_address"); } catch {}
      const finalT = json.data.final_total ?? json.data.total;
      router.push(`/payment-success?id=${json.data.orderId}&total=${finalT}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!items.length && !busy) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-20 md:px-8 bg-white min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="text-[80px]">🛒</div>
        <h2 className="text-[28px] font-bold text-ink">Your cart is empty</h2>
        <Link href="/" className="inline-flex h-[54px] items-center justify-center rounded-[10px] bg-ink px-10 text-[16px] font-bold text-white hover:bg-black">
          Shop Now
        </Link>
      </div>
    );
  }

  const inputCls = "w-full h-[56px] px-5 rounded-[8px] border border-[#d4d4d4] text-[15px] outline-none focus:border-ink transition-colors";
  const labelCls = "block text-[14px] font-medium text-ink mb-2";

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-1 pb-10 md:px-8 bg-white min-h-screen">
      <div className="flex flex-col lg:flex-row gap-10">

        {/* Left: Payment Methods */}
        <div className="flex-1">
          <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white">
            <div className="px-8 py-6 md:px-10">
              <h2 className="text-[16px] font-medium text-ink">Choose Your Payment Method</h2>
            </div>
            <div className="mx-8 md:mx-10 border-t border-dashed border-[#e7e7e7]" />

            <div className="p-8 md:p-10">
            {/* Method selector — horizontal radio row */}
            <div className="mb-6">
              <p className="text-[14px] font-semibold text-ink mb-3">Pay With:</p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {METHODS.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_method"
                      value={m.id}
                      checked={method === m.id}
                      onChange={() => { setMethod(m.id); setError(""); }}
                      className="h-4 w-4 accent-emerald-500"
                    />
                    <span className="text-[14px] text-ink">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Method-specific fields */}
            {method === "card" && (
              <div className="flex flex-col gap-5 mb-6">
                <div>
                  <label className={labelCls}>Card Number</label>
                  <input
                    type="text"
                    value={cardNo}
                    onChange={(e) => setCardNo(e.target.value)}
                    placeholder="1234 5678 9101 1121"
                    maxLength={19}
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Expiration Date</label>
                    <input
                      type="text"
                      value={cardExp}
                      onChange={(e) => setCardExp(e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>CVV</label>
                    <input
                      type="text"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      maxLength={4}
                      className={inputCls}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  <span className="text-[13px] text-[#8c8c8c]">Save card details</span>
                </label>
              </div>
            )}

            {method === "upi" && (
              <div className="mb-6">
                <label className={labelCls}>UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className={inputCls}
                />
              </div>
            )}

            {method === "bank" && (
              <p className="mb-6 text-[14px] text-[#525151]">You will be redirected to your bank&apos;s portal to complete the payment.</p>
            )}

            {method === "cod" && (
              <p className="mb-6 text-[14px] text-[#525151]">Pay in cash when your order arrives at your address.</p>
            )}

            {error && (
              <p className="mb-4 text-[14px] text-red-500 font-medium">{error}</p>
            )}

            <button
              type="button"
              onClick={placeOrder}
              disabled={busy}
              className="flex h-[58px] w-full items-center justify-center rounded-[10px] bg-[#1c1c1c] text-[16px] font-medium text-white hover:bg-black transition-all disabled:opacity-60"
            >
              {busy ? "Placing Order…" : "Pay"}
            </button>

            <p className="mt-5 text-[12px] text-[#8c8c8c] leading-relaxed">
              Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.
            </p>
            </div>
          </div>
        </div>

        {/* Right: Price Summary + Address */}
        <div className="w-full lg:w-[500px] shrink-0">
          <div className="flex flex-col gap-5 sticky top-1">
            {/* Price Summary card */}
            <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] p-6 bg-white">
              <h3 className="text-[16px] font-bold text-ink mb-5">
                Price Summary <span className="font-normal text-[#525151]">( {count} {count === 1 ? "item" : "items"} )</span>
              </h3>

              <div className="flex flex-col gap-3 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-[#525151]">Total MRP</span>
                  <span className="text-ink font-medium">{fmt(totalMrp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525151]">Subtotal</span>
                  <span className="text-emerald-600 font-semibold">{fmt(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525151]">Delivery Charge</span>
                  <span className={`font-medium ${deliveryCharge === 0 ? "text-emerald-600" : "text-ink"}`}>
                    {deliveryCharge === 0 ? "Free" : fmt(deliveryCharge)}
                  </span>
                </div>
                {coupon && couponDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#525151]">Coupon Discount</span>
                    <span className="text-ink font-medium">-{fmt(couponDiscount)}</span>
                  </div>
                )}
                {taxTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#525151]">Tax</span>
                    <span className="text-ink font-medium">+{fmt(taxTotal)}</span>
                  </div>
                )}
                <div className="my-1 border-t border-dashed border-[#e7e7e7]" />
                <div className="flex justify-between">
                  <span className="text-ink font-medium">Total</span>
                  <span className="text-emerald-600 font-bold">{fmt(finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Deliver to This Address card */}
            {savedAddress && (
              <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] p-6 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                    <span className="text-[14px] font-semibold text-ink">Deliver to This Address</span>
                  </div>
                  <Link href="/checkout" className="flex items-center gap-1 text-[13px] text-[#525151] hover:text-ink transition-colors">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </Link>
                </div>
                <p className="text-[13px] font-bold text-ink mb-1">{savedAddress.name}</p>
                <p className="text-[13px] text-[#525151] leading-[1.6]">
                  {[savedAddress.address, savedAddress.landmark, savedAddress.city, savedAddress.state, savedAddress.pincode]
                    .filter(Boolean).join(", ")}
                </p>
                <p className="mt-2 text-[13px] text-[#525151]">{savedAddress.mobile}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
