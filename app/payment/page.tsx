"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cartContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const METHODS = [
  { id: "cod", label: "Cash on Delivery", icon: "💵", desc: "Pay when your order arrives" },
  { id: "upi", label: "UPI", icon: "📱", desc: "Pay via PhonePe, GPay, Paytm" },
  { id: "card", label: "Card", icon: "💳", desc: "Debit / Credit card" },
];

export default function PaymentPage() {
  const router = useRouter();
  const { items, total, count, clearCart, taxTotal, deliveryCharge, coupon, couponDiscount, finalTotal, removeCoupon } = useCart();
  const [method, setMethod] = useState("cod");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Bounce unauthenticated users back to /cart (where the auth modal can prompt login)
  useEffect(() => {
    fetch(`${API}/api/v1/auth/me`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.data?.user) router.replace("/cart");
      })
      .catch(() => {});
  }, [router]);

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
          payment_method: method,
          items: items.map((i) => ({ id: i.id, name: i.name, image: i.image, price: i.price, qty: i.qty })),
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

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8 bg-white min-h-screen">
      <div className="flex flex-col lg:flex-row gap-10">

        {/* Left: Payment Methods */}
        <div className="flex-1">
          <div className="rounded-[20px] border-2 border-dashed border-[#e7e7e7] p-8 md:p-10 bg-white">
            <h2 className="text-[22px] font-bold text-ink mb-8">Choose Payment Method</h2>

            {/* Method selector */}
            <div className="flex flex-col gap-3 mb-8">
              {METHODS.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-4 rounded-[12px] border-2 px-5 py-4 cursor-pointer transition-all ${method === m.id ? "border-ink bg-[#f9f9f9]" : "border-[#e7e7e7] hover:border-[#c0c0c0]"}`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={m.id}
                    checked={method === m.id}
                    onChange={() => { setMethod(m.id); setError(""); }}
                    className="sr-only"
                  />
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${method === m.id ? "border-ink" : "border-[#cfcfcf]"}`}>
                    {method === m.id && <div className="h-2.5 w-2.5 rounded-full bg-ink" />}
                  </div>
                  <span className="text-[22px]">{m.icon}</span>
                  <div>
                    <div className="text-[15px] font-semibold text-ink">{m.label}</div>
                    <div className="text-[12px] text-[#8c8c8c]">{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Method-specific fields */}
            {method === "upi" && (
              <div className="mb-8">
                <label className="block text-[15px] font-semibold text-ink mb-3">UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className={inputCls}
                />
              </div>
            )}

            {method === "card" && (
              <div className="flex flex-col gap-5 mb-8">
                <div>
                  <label className="block text-[15px] font-semibold text-ink mb-3">Card Number</label>
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
                    <label className="block text-[15px] font-semibold text-ink mb-3">Expiry Date</label>
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
                    <label className="block text-[15px] font-semibold text-ink mb-3">CVV</label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="•••"
                      maxLength={4}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="mb-6 text-[14px] text-red-500 font-medium">{error}</p>
            )}

            <button
              type="button"
              onClick={placeOrder}
              disabled={busy}
              className="flex h-[58px] w-full items-center justify-center rounded-[10px] bg-[#1c1c1c] text-[16px] font-bold text-white hover:bg-black transition-all disabled:opacity-60"
            >
              {busy ? "Placing Order…" : "Place Order"}
            </button>

            <p className="mt-5 text-[12px] text-[#8c8c8c] leading-relaxed text-center">
              By placing this order you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="w-full lg:w-[400px]">
          <div className="rounded-[20px] border-2 border-dashed border-[#e7e7e7] p-8 bg-white sticky top-6">
            <h3 className="text-[16px] font-bold text-ink mb-6">Order Summary ({count} {count === 1 ? "item" : "items"})</h3>

            <div className="flex flex-col gap-3 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <span className="text-[14px] text-[#525151] line-clamp-1 flex-1">{item.name}</span>
                  <span className="text-[14px] font-medium text-ink shrink-0">×{item.qty}</span>
                  <span className="text-[14px] font-bold text-ink shrink-0">{fmt(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <hr className="border-dashed border-[#e7e7e7] mb-6" />

            <div className="flex flex-col gap-4">
              <div className="flex justify-between text-[16px]">
                <span className="text-[#525151]">Subtotal</span>
                <span className="font-medium text-[#8c8c8c]">{fmt(total)}</span>
              </div>
              <div className="flex justify-between text-[16px]">
                <span className="text-ink">Delivery</span>
                <span className={`font-medium ${deliveryCharge === 0 ? "text-green-600" : "text-[#525151]"}`}>
                  {deliveryCharge === 0 ? "Free" : fmt(deliveryCharge)}
                </span>
              </div>
              {coupon && couponDiscount > 0 && (
                <div className="flex justify-between text-[15px]">
                  <span className="text-green-700 font-medium">Coupon ({coupon.code})</span>
                  <span className="font-semibold text-green-700">−{fmt(couponDiscount)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="flex justify-between text-[15px]">
                  <span className="text-ink">Tax</span>
                  <span className="font-medium text-[#525151]">+{fmt(taxTotal)}</span>
                </div>
              )}
              <hr className="border-[#eeeeee]" />
              <div className="flex justify-between text-[18px] font-bold">
                <span className="text-ink">Total</span>
                <span className="text-ink">{fmt(finalTotal)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-6 flex items-center gap-2 text-[13px] text-[#8c8c8c] hover:text-ink transition-colors"
            >
              ← Edit address
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
