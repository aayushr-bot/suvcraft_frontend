"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ChevronRight } from "../components/icons";
import AuthModal from "../components/AuthModal";
import ProductImage from "../components/ProductImage";
import { useCart } from "@/lib/cartContext";
import { imgUrl } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const PLACEHOLDER_IMG = "/product-placeholder.svg";

function resolveImg(path: string) {
  if (!path) return PLACEHOLDER_IMG;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

type ServiceCheck = {
  serviceable: boolean;
  reason?: string;
  pincode?: string;
  city?: string | null;
  delivery_charges?: number;
  minimum_free_delivery_order_amount?: number;
  delivery_min_days: number;
  delivery_max_days: number;
};

function formatDeliveryDate(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export default function CartPage() {
  const { items, saved, removeFromCart, updateQty, updateLimits, moveToSaved, moveToCart, removeFromSaved, total, count, taxTotal, deliveryCharge, freeDeliveryThreshold, coupon, couponDiscount, finalTotal, applyCoupon, removeCoupon } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState("");
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [qtyErrors, setQtyErrors] = useState<Record<number, string>>({});

  const [pincode, setPincode] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [editingPin, setEditingPin] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinChecking, setPinChecking] = useState(false);
  const [serviceInfo, setServiceInfo] = useState<ServiceCheck | null>(null);

  async function checkPin(p: string) {
    setPinChecking(true);
    setPinError("");
    try {
      const res = await fetch(`${API}/api/v1/zipcodes/check?pincode=${encodeURIComponent(p)}`);
      const json = await res.json();
      const data: ServiceCheck = json?.data ?? null;
      if (!data) { setPinError("Could not check this pincode. Please try again."); return; }
      setServiceInfo(data);
      if (data.serviceable) {
        setPincode(p);
        setEditingPin(false);
        try { localStorage.setItem("suvcraft_delivery_pincode", p); } catch {}
      } else if (data.reason === "invalid") {
        setPinError("Enter a valid pincode.");
      } else {
        setPinError("Sorry, we don't deliver to this pincode yet.");
      }
    } catch {
      setPinError("Network error. Please try again.");
    } finally {
      setPinChecking(false);
    }
  }

  useEffect(() => {
    fetch(`${API}/api/v1/auth/me`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => setIsLoggedIn(!!j?.data?.user))
      .catch(() => setIsLoggedIn(false));
    try {
      const saved = localStorage.getItem("suvcraft_delivery_pincode");
      if (saved) { setPinInput(saved); checkPin(saved); }
      else setEditingPin(true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    items.forEach((item) => {
      fetch(`${API}/api/v1/products/${item.id}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (cancelled || !j?.data) return;
          const p = j.data;
          const minQ = Math.max(1, Number(p.minimum_order_quantity) || 1);
          const stepQ = Math.max(1, Number(p.quantity_step_size) || 1);
          const stockCap = p.stock != null ? Number(p.stock) : Infinity;
          const allowedCap = p.total_allowed_quantity != null ? Number(p.total_allowed_quantity) : Infinity;
          const maxQ = Math.min(stockCap, allowedCap);
          updateLimits(item.id, {
            minQty: minQ,
            maxQty: Number.isFinite(maxQ) ? maxQ : undefined,
            step: stepQ,
            stock: p.stock,
            tax_percentage: Number(p.tax_percentage || 0),
            is_prices_inclusive_tax: Number(p.is_prices_inclusive_tax || 0),
          });
          if (Number.isFinite(maxQ) && item.qty > maxQ) {
            if (maxQ < minQ) {
              removeFromCart(item.id);
            } else {
              updateQty(item.id, maxQ);
              setQtyErrors((e) => ({
                ...e,
                [item.id]:
                  allowedCap < stockCap
                    ? `Adjusted to max ${allowedCap} per order.`
                    : `Adjusted to ${stockCap} available in stock.`,
              }));
            }
          } else if (item.qty < minQ) {
            updateQty(item.id, minQ);
          }
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeQty(item: typeof items[number], delta: number) {
    const minQ = item.minQty ?? 1;
    const maxQ = item.maxQty ?? Infinity;
    const step = item.step ?? 1;
    const next = item.qty + delta * step;
    if (delta < 0 && next < minQ) {
      setQtyErrors((e) => ({ ...e, [item.id]: `Minimum order quantity is ${minQ}.` }));
      return;
    }
    if (delta > 0 && next > maxQ) {
      const stockCap = item.stock != null ? Number(item.stock) : Infinity;
      const msg = stockCap === maxQ
        ? `Only ${maxQ} item${maxQ === 1 ? "" : "s"} available.`
        : `Maximum ${maxQ} unit${maxQ === 1 ? "" : "s"} per order.`;
      setQtyErrors((e) => ({ ...e, [item.id]: msg }));
      return;
    }
    setQtyErrors((e) => {
      const { [item.id]: _, ...rest } = e;
      return rest;
    });
    updateQty(item.id, next);
  }

  function handleCheckout() {
    if (isLoggedIn) router.push("/checkout");
    else setAuthOpen(true);
  }

  async function handleApplyCoupon() {
    setCouponError("");
    setCouponBusy(true);
    const r = await applyCoupon(couponInput);
    setCouponBusy(false);
    if (!r.ok) {
      setCouponError(r.error || "Could not apply coupon.");
      return;
    }
    setCouponInput("");
  }

  function applyPincode() {
    const p = pinInput.replace(/\D/g, "");
    if (!/^\d{6}$/.test(p)) { setPinError("Enter a valid 6-digit pincode."); return; }
    checkPin(p);
  }

  const estimate = serviceInfo?.serviceable
    ? { from: formatDeliveryDate(serviceInfo.delivery_min_days), to: formatDeliveryDate(serviceInfo.delivery_max_days) }
    : null;

  if (items.length === 0 && saved.length === 0) {
    return (
      <div className="w-full bg-white min-h-screen">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-20 md:px-8 flex flex-col items-center justify-center gap-6">
          <div className="text-[80px]">🛒</div>
          <h2 className="text-[28px] font-bold text-ink">Your cart is empty</h2>
          <p className="text-[15px] text-[#525151]">Add some products to get started.</p>
          <Link
            href="/"
            className="inline-flex h-[54px] items-center justify-center rounded-[10px] bg-ink px-10 text-[16px] font-bold text-white hover:bg-black"
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-8">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Main Cart Content */}
        <div className="flex-1">
          <div className="mb-6 rounded-[12px] border-2 border-dashed border-[#e7e7e7] bg-white px-6 py-4">
            {!editingPin && estimate && serviceInfo?.serviceable ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col">
                  <span className="text-[12px] uppercase tracking-wide text-[#878787] font-semibold">
                    Delivery to {pincode}{serviceInfo.city ? `, ${serviceInfo.city}` : ""}
                  </span>
                  <span className="text-[15px] font-bold text-ink mt-0.5">
                    Arrives <span className="text-green-700">{estimate.from} – {estimate.to}</span>
                  </span>
                  <span className="text-[12px] text-[#525151] mt-0.5">
                    {Number(serviceInfo.delivery_charges) > 0
                      ? <>Delivery charge: <span className="font-semibold text-ink">{fmt(Number(serviceInfo.delivery_charges))}</span>
                          {Number(serviceInfo.minimum_free_delivery_order_amount) > 0 && (
                            <> · Free above {fmt(Number(serviceInfo.minimum_free_delivery_order_amount))}</>
                          )}
                        </>
                      : <span className="text-green-700 font-semibold">FREE delivery</span>}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingPin(true); setPinInput(pincode); setPinError(""); }}
                  className="h-[42px] rounded-[10px] border border-ink px-6 text-[13px] font-bold text-ink hover:bg-black/5 transition-colors"
                >
                  CHANGE PINCODE
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="text-[15px] font-bold text-ink shrink-0">Check Delivery Date:</span>
                <div className="flex flex-1 items-stretch gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && applyPincode()}
                    placeholder="Enter 6-digit pincode"
                    className="h-[42px] flex-1 rounded-[10px] border border-[#d4d4d4] px-4 text-[14px] outline-none focus:border-ink"
                  />
                  <button
                    type="button"
                    onClick={applyPincode}
                    disabled={pinChecking}
                    className="h-[42px] rounded-[10px] bg-ink px-6 text-[13px] font-bold text-white hover:bg-black transition-colors disabled:opacity-60"
                  >
                    {pinChecking ? "CHECKING…" : "CHECK"}
                  </button>
                  {pincode && (
                    <button
                      type="button"
                      onClick={() => { setEditingPin(false); setPinInput(pincode); setPinError(""); }}
                      className="h-[42px] rounded-[10px] border border-[#d4d4d4] px-4 text-[13px] font-medium text-[#525151] hover:bg-black/5"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
            {pinError && <p className="mt-2 text-[12px] font-medium text-red-600">{pinError}</p>}
          </div>

          {items.length > 0 && (
          <div className="rounded-[20px] border-2 border-dashed border-[#e7e7e7] p-6">
            <div className="flex items-baseline gap-2">
              <h1 className="text-[20px] font-bold text-ink">Shopping Bag</h1>
              <span className="text-[12px] text-[#8c8c8c]">{count} {count === 1 ? "item" : "items"}</span>
            </div>
            <hr className="mt-4 mb-8 border-dashed border-[#e7e7e7]" />

            <div className="flex flex-col gap-10">
              {items.map((item, index) => (
                <div key={item.id} className="relative bg-white">
                  <div className="flex gap-6">
                    <Link href={`/product/${item.id}`} className="h-[130px] w-[130px] shrink-0 flex items-center justify-center rounded-[12px] border border-[#e7e7e7] bg-[#f9f9f9] overflow-hidden">
                      <ProductImage src={resolveImg(item.image)} alt={item.name} className="h-full w-full object-contain p-2" />
                    </Link>

                    <div className="flex flex-1 flex-col gap-3">
                      <Link href={`/product/${item.id}`} className="text-[15px] font-semibold text-ink hover:underline line-clamp-2">
                        {item.name}
                      </Link>

                      <div className="flex h-[40px] w-[108px] items-center justify-between rounded-[8px] border border-[#cfcfcf] px-3">
                        <button
                          onClick={() => changeQty(item, -1)}
                          disabled={item.qty - (item.step ?? 1) < (item.minQty ?? 1)}
                          className="text-ink text-[20px] font-medium hover:text-brand-purple transition-colors leading-none disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                        <span className="text-[15px] font-bold">{String(item.qty).padStart(2, "0")}</span>
                        <button
                          onClick={() => changeQty(item, +1)}
                          disabled={item.maxQty != null && item.qty + (item.step ?? 1) > item.maxQty}
                          className="text-ink text-[20px] font-medium hover:text-brand-purple transition-colors leading-none disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                      {qtyErrors[item.id] && (
                        <p className="text-[12px] text-red-500" role="alert">
                          {qtyErrors[item.id]}
                        </p>
                      )}

                      <div className="text-[14px] text-ink font-medium">
                        Unit Price : <span className="font-bold">{fmt(item.price)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => moveToSaved(item.id)}
                        className="self-start text-[12px] font-semibold text-[#525151] hover:text-brand-purple hover:underline transition-colors"
                      >
                        Save for later
                      </button>
                    </div>

                    <div className="flex flex-col items-end justify-between py-1">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="bg-[#f5f5f5] p-2 rounded-[8px] text-[#9c9c9c] hover:bg-red-50 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <div className="text-[16px] text-[#525151]">
                        Total : <span className="font-bold text-ink">{fmt(item.price * item.qty)}</span>
                      </div>
                    </div>
                  </div>
                  {index < items.length - 1 && <hr className="mt-10 border-dashed border-[#e7e7e7]" />}
                </div>
              ))}
            </div>
          </div>
          )}

          {saved.length > 0 && (
          <div className={`rounded-[20px] border-2 border-dashed border-[#e7e7e7] p-6 ${items.length > 0 ? "mt-6" : ""}`}>
            <div className="flex items-baseline gap-2">
              <h2 className="text-[20px] font-bold text-ink">Saved for later</h2>
              <span className="text-[12px] text-[#8c8c8c]">{saved.length} {saved.length === 1 ? "item" : "items"}</span>
            </div>
            <hr className="mt-4 mb-8 border-dashed border-[#e7e7e7]" />

            <div className="flex flex-col gap-8">
              {saved.map((item, index) => (
                <div key={item.id} className="relative bg-white">
                  <div className="flex gap-6">
                    <Link href={`/product/${item.id}`} className="h-[110px] w-[110px] shrink-0 flex items-center justify-center rounded-[12px] border border-[#e7e7e7] bg-[#f9f9f9] overflow-hidden">
                      <ProductImage src={resolveImg(item.image)} alt={item.name} className="h-full w-full object-contain p-2" />
                    </Link>

                    <div className="flex flex-1 flex-col gap-2">
                      <Link href={`/product/${item.id}`} className="text-[15px] font-semibold text-ink hover:underline line-clamp-2">
                        {item.name}
                      </Link>
                      <div className="text-[14px] text-ink font-medium">
                        Price : <span className="font-bold">{fmt(item.price)}</span>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => moveToCart(item.id)}
                          className="h-[36px] rounded-[8px] bg-ink px-4 text-[12px] font-bold text-white hover:bg-black transition-colors"
                        >
                          Move to cart
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromSaved(item.id)}
                          className="h-[36px] rounded-[8px] border border-[#cfcfcf] px-4 text-[12px] font-semibold text-[#525151] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                  {index < saved.length - 1 && <hr className="mt-8 border-dashed border-[#e7e7e7]" />}
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="w-full lg:w-[380px]">
          <div className="flex flex-col gap-6">
            {/* Coupon */}
            {items.length > 0 && (
            <div className="rounded-[15px] border-2 border-dashed border-[#e7e7e7] bg-white p-6">
              <h3 className="text-[14px] font-bold text-ink mb-3">Apply Coupon</h3>
              {coupon ? (
                <div className="rounded-[10px] bg-green-50 border border-green-200 p-3 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-green-800">{coupon.code} applied</span>
                    {coupon.message && <span className="text-[11px] text-green-700">{coupon.message}</span>}
                    <span className="text-[12px] font-semibold text-green-800 mt-1">You saved {fmt(couponDiscount)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    aria-label="Remove coupon"
                    className="h-[28px] w-[28px] flex items-center justify-center rounded-full text-green-700 hover:bg-green-100 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && !couponBusy && handleApplyCoupon()}
                      placeholder="Enter coupon code"
                      className="h-[42px] flex-1 rounded-[10px] border border-[#d4d4d4] px-3 text-[13px] outline-none focus:border-ink uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponBusy || !couponInput.trim()}
                      className="h-[42px] rounded-[10px] bg-ink px-5 text-[12px] font-bold text-white hover:bg-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {couponBusy ? "..." : "APPLY"}
                    </button>
                  </div>
                  {couponError && <p className="mt-2 text-[12px] font-medium text-red-600">{couponError}</p>}
                </>
              )}
            </div>
            )}

            {/* Price Summary */}
            <div className="rounded-[15px] border-2 border-dashed border-[#e7e7e7] bg-white p-6">
              <h3 className="text-[16px] font-bold text-ink mb-6">Price Summary ({count} {count === 1 ? "item" : "items"})</h3>

              <div className="flex flex-col gap-4">
                <div className="flex justify-between text-[16px]">
                  <span className="text-ink">Subtotal</span>
                  <span className="font-medium text-[#8c8c8c]">{fmt(total)}</span>
                </div>
                <div className="flex justify-between text-[16px]">
                  <span className="text-ink">Delivery Charge</span>
                  <span className={`font-medium ${deliveryCharge === 0 ? "text-green-600" : "text-[#525151]"}`}>
                    {deliveryCharge === 0 ? "Free" : fmt(deliveryCharge)}
                  </span>
                </div>
                {deliveryCharge > 0 && freeDeliveryThreshold > 0 && (
                  <p className="-mt-3 text-[11px] text-[#878787]">
                    Add {fmt(freeDeliveryThreshold - total)} more to get FREE delivery.
                  </p>
                )}
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

                <hr className="my-2 border-[#eeeeee]" />

                <div className="flex justify-between text-[18px] font-bold">
                  <span className="text-ink">Total</span>
                  <span className="text-ink">{fmt(finalTotal)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={items.length === 0}
                className="flex h-[58px] w-full items-center justify-center rounded-[10px] bg-[#1c1c1c] text-[16px] font-bold text-white hover:bg-black transition-all mt-8 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1c1c1c]"
              >
                Check Out Now
              </button>
            </div>

            {/* Continue Shopping */}
            <Link
              href="/"
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-[#e7e7e7] text-[14px] font-medium text-[#525151] hover:text-ink hover:border-ink transition-all"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Continue Shopping
            </Link>

            {/* Disclaimer */}
            <div className="rounded-[12px] bg-[#fff8e1] p-5 border border-[#ffe082]">
              <h4 className="text-[14px] font-bold text-black mb-2">Disclaimer !</h4>
              <p className="text-[12px] leading-[1.6] text-black">
                Prices are inclusive of all taxes. Delivery charges may apply based on your location and order value.
              </p>
            </div>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => { setIsLoggedIn(true); setAuthOpen(false); router.push("/checkout"); }}
      />
      </div>
    </div>
  );
}
