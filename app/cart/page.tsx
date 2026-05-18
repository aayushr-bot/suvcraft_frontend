"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ChevronRight } from "../components/icons";
import AuthModal from "../components/AuthModal";
import ProductImage from "../components/ProductImage";
import BuyTogether from "../components/BuyTogether";
import { useCart, lineKey } from "@/lib/cartContext";
import { imgUrl } from "@/lib/api";
import { formatMoney as fmt } from "@/lib/format";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

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
  const { items, saved, removeFromCart, updateQty, updateLimits, moveToSaved, moveToCart, removeFromSaved, total, count, taxTotal, deliveryCharge, freeDeliveryThreshold, coupon, couponDiscount, finalTotal, applyCoupon, removeCoupon, hasBlockingIssue, blockingItems } = useCart();
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
    let cancelled = false;
    let savedPin = "";
    try {
      savedPin = localStorage.getItem("suvcraft_delivery_pincode") || "";
      if (savedPin) { setPinInput(savedPin); checkPin(savedPin); }
    } catch {}
    fetch(`${API}/api/v1/auth/me`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then(async (j) => {
        if (cancelled) return;
        const loggedIn = !!j?.data?.user;
        setIsLoggedIn(loggedIn);
        // Cross-device pincode recovery: when localStorage has nothing
        // (fresh device, post-clear, etc.) and the buyer is logged in,
        // hydrate from their default saved address. Mirrors Amazon's
        // "remember last delivery location" — without needing a new
        // column on `users` since addresses already carry the pincode.
        if (!savedPin && loggedIn) {
          try {
            const ar = await fetch(`${API}/api/v1/addresses`, { credentials: "include", cache: "no-store" });
            if (!ar.ok || cancelled) return;
            const aj = await ar.json();
            const list: { is_default?: number | string; pincode?: string }[] = aj?.data?.rows ?? [];
            const def = list.find((a) => Number(a.is_default) === 1) || list[0];
            const pin = String(def?.pincode || "").replace(/\D/g, "");
            if (pin.length === 6 && !cancelled) {
              setPinInput(pin);
              checkPin(pin);
            }
          } catch {}
        }
      })
      .catch(() => setIsLoggedIn(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh per-product limits and flags (stock, tax, is_returnable …) whenever
  // the *set* of cart lines changes (added/removed). We deliberately key off the
  // joined line ids — not `items` itself — so quantity edits don't trigger a
  // refetch loop, while server/localStorage hydration (which arrives a tick
  // after mount with an empty array) still kicks the effect.
  const cartLineKey = items.map((i) => `${i.id}:${i.variant_id ?? 0}`).join(",");
  useEffect(() => {
    let cancelled = false;
    const uniqueIds = Array.from(new Set(items.map((i) => Number(i.id)).filter(Boolean)));
    if (!uniqueIds.length) return;
    fetch(`${API}/api/v1/products?ids=${uniqueIds.join(",")}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.data?.rows) return;
        const byId = new Map<number, any>(
          (j.data.rows as any[]).map((p) => [Number(p.id), p]),
        );
        items.forEach((item) => {
          const p = byId.get(Number(item.id));
          if (!p) return;
          const k = lineKey(item);
          const minQ = Math.max(1, Number(p.minimum_order_quantity) || 1);
          const stepQ = Math.max(1, Number(p.quantity_step_size) || 1);
          const stockCap = p.stock != null ? Number(p.stock) : Infinity;
          const allowedCap = p.total_allowed_quantity != null ? Number(p.total_allowed_quantity) : Infinity;
          const maxQ = Math.min(stockCap, allowedCap);
          updateLimits(k, {
            minQty: minQ,
            maxQty: Number.isFinite(maxQ) ? maxQ : undefined,
            step: stepQ,
            stock: p.stock,
            tax_percentage: Number(p.tax_percentage || 0),
            is_prices_inclusive_tax: Number(p.is_prices_inclusive_tax || 0),
            is_returnable: Number(p.is_returnable ?? 1),
          });
          if (Number.isFinite(maxQ) && item.qty > maxQ) {
            if (maxQ < minQ) {
              removeFromCart(k);
            } else {
              updateQty(k, maxQ);
              setQtyErrors((e) => ({
                ...e,
                [k]:
                  allowedCap < stockCap
                    ? `Adjusted to max ${allowedCap} per order.`
                    : `Adjusted to ${stockCap} available in stock.`,
              }));
            }
          } else if (item.qty < minQ) {
            updateQty(k, minQ);
          }
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartLineKey]);

  function changeQty(item: typeof items[number], delta: number) {
    const k = lineKey(item);
    const minQ = item.minQty ?? 1;
    // For variant-wise products `item.maxQty` is undefined (the live cap lives
    // per-variant) but the cart endpoint hands us `item.available_stock` based
    // on the picked variant's stock. Take whichever cap is tighter so a +
    // click can't push past either the per-order limit or the live variant
    // stock.
    const orderCap = item.maxQty ?? Infinity;
    const stockCap = item.available_stock != null
      ? Number(item.available_stock)
      : (item.stock != null ? Number(item.stock) : Infinity);
    const maxQ = Math.min(orderCap, stockCap);
    const step = item.step ?? 1;
    const next = item.qty + delta * step;
    // Minus on the last unit removes the line entirely instead of clamping at
    // the minimum — matches typical e-commerce UX where qty 1 → click "−"
    // pulls the item out of the cart.
    if (delta < 0 && next < minQ) {
      setQtyErrors((e) => {
        const { [k]: _, ...rest } = e;
        return rest;
      });
      removeFromCart(k);
      return;
    }
    if (delta > 0 && next > maxQ) {
      const msg = stockCap === maxQ
        ? `Only ${maxQ} item${maxQ === 1 ? "" : "s"} available.`
        : `Maximum ${maxQ} unit${maxQ === 1 ? "" : "s"} per order.`;
      setQtyErrors((e) => ({ ...e, [k]: msg }));
      return;
    }
    setQtyErrors((e) => {
      const { [k]: _, ...rest } = e;
      return rest;
    });
    updateQty(k, next);
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
      // When the server rejected the coupon for a min-order shortfall, the
      // error string carries the threshold (e.g. "Minimum order amount for
      // this coupon is ₹999."). Pull it out and show a clearer hint with the
      // exact amount still needed — same affordance Amazon/Flipkart give.
      const raw = r.error || "Could not apply coupon.";
      const m = raw.match(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/i);
      if (m) {
        const min = Number(m[1].replace(/,/g, ""));
        if (Number.isFinite(min) && min > total) {
          const short = min - total;
          setCouponError(
            `Coupon needs ${fmt(min)} minimum — add ${fmt(short)} more to apply.`,
          );
          return;
        }
      }
      setCouponError(raw);
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
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-1 pb-8 md:px-8">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Main Cart Content */}
        <div className="flex-1">
          <div className="mb-6 rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white px-4 py-3 sm:px-6 sm:py-4">
            {!editingPin ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-col">
                  <span className="text-[14px] sm:text-[15px] font-bold text-ink">Check Delivery Date</span>
                  {pincode && estimate && serviceInfo?.serviceable && (
                    <span className="mt-0.5 text-[12px] sm:text-[12.5px] text-[#525151]">
                      Pincode <span className="font-semibold text-ink">{pincode}</span>
                      {serviceInfo.city ? `, ${serviceInfo.city}` : ""}
                      {" · "}
                      Arrives <span className="font-semibold text-green-700">{estimate.from} – {estimate.to}</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingPin(true); setPinInput(pincode); setPinError(""); }}
                  className="h-[38px] sm:h-[42px] rounded-[10px] border border-[#cfcfcf] px-4 sm:px-7 text-[11.5px] sm:text-[12px] font-bold tracking-wide text-ink hover:border-ink hover:bg-black/5 transition-colors"
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
          <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] p-4 sm:p-6">
            <div className="flex items-baseline gap-2">
              <h1 className="text-[18px] sm:text-[20px] font-bold text-ink">Shopping Bag</h1>
              <span className="text-[12px] text-[#8c8c8c]">{count} {count === 1 ? "item" : "items"}</span>
            </div>
            <hr className="mt-4 mb-6 sm:mb-8 border-dashed border-[#e7e7e7]" />

            <div className="flex flex-col gap-8">
              {items.map((item, index) => (
                <div key={lineKey(item)} className="relative bg-white">
                  {/* Coupon strip — only when an order coupon is active.
                      The verified badge has moved into the right column so the
                      whole right-side group (verified + rating + trash) sits
                      vertically centred against the product info. */}
                  {coupon && (
                    <div className="mb-4">
                      <div
                        className="inline-flex items-center gap-3 rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white px-4 py-2"
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: "#3E0149" }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 5L5 19" />
                            <circle cx="7.5" cy="7.5" r="2.5" />
                            <circle cx="16.5" cy="16.5" r="2.5" />
                          </svg>
                        </span>
                        <span className="text-[13px] font-bold tracking-wide" style={{ color: "#3E0149" }}>
                          {coupon.code}
                        </span>
                        <span className="text-[12.5px] font-medium text-[#878787]">Coupon Applied</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 sm:gap-6">
                    <Link href={`/product/${item.id}`} className="h-[100px] w-[100px] sm:h-[130px] sm:w-[130px] shrink-0 flex items-center justify-center rounded-[12px] border border-[#e7e7e7] bg-[#f9f9f9] overflow-hidden">
                      <ProductImage src={resolveImg(item.image)} alt={item.name} className="h-full w-full object-contain p-2" />
                    </Link>

                    <div className="flex flex-1 flex-col gap-2.5 sm:gap-3 min-w-0">
                      <Link href={`/product/${item.id}`} className="text-[14px] sm:text-[15px] font-semibold text-ink hover:underline line-clamp-2">
                        {item.name}
                      </Link>

                      {(item.size || item.color) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {item.size && (
                            <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#f5f5f5] px-2.5 py-1 sm:px-3 sm:py-1.5 text-[12px] sm:text-[12.5px] font-medium text-ink">
                              <span className="text-[#878787]">Size :</span> {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#f5f5f5] px-2.5 py-1 sm:px-3 sm:py-1.5 text-[12px] sm:text-[12.5px] font-medium text-ink">
                              <span className="text-[#878787]">Color :</span>
                              <span className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: item.color.swatch || "#e7e7e7" }} />
                              <span>{item.color.name}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {item.is_returnable != null && Number(item.is_returnable) === 0 && (
                        <div className="inline-flex w-fit items-center gap-1.5 rounded-[6px] bg-[#FEF2F2] px-2.5 py-1 text-[11px] sm:text-[12px] font-semibold text-[#B42318]">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          No Returns · Only Exchange
                        </div>
                      )}

                      {/* Live stock status — driven by the backend's
                          availability flag, set whenever the cart refreshes.
                          OOS / unavailable shows a red banner; low-stock is a
                          softer amber nudge ("Only N left — order soon"). */}
                      {item.availability === 'out_of_stock' || item.availability === 'unavailable' ? (
                        <div className="inline-flex w-fit items-center gap-1.5 rounded-[6px] bg-[#FEF2F2] px-2.5 py-1 text-[11px] sm:text-[12px] font-semibold text-[#B42318]">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          {item.availability === 'unavailable' ? 'No longer available' : 'Out of stock'}
                        </div>
                      ) : item.availability === 'insufficient_stock' ? (
                        <div className="inline-flex w-fit items-center gap-1.5 rounded-[6px] bg-[#FFF7ED] px-2.5 py-1 text-[11px] sm:text-[12px] font-semibold text-[#9A3412]">
                          Only {item.available_stock} left — reduce qty to continue
                        </div>
                      ) : item.availability === 'low_stock' ? (
                        <div className="inline-flex w-fit items-center gap-1.5 rounded-[6px] bg-[#FFFBEB] px-2.5 py-1 text-[11px] sm:text-[12px] font-semibold text-[#92400E]">
                          Only {item.available_stock} left in stock — order soon
                        </div>
                      ) : null}

                      <div className="flex h-[40px] w-[108px] items-center justify-between rounded-[8px] border border-[#cfcfcf] px-3">
                        <button
                          onClick={() => changeQty(item, -1)}
                          aria-label={item.qty - (item.step ?? 1) < (item.minQty ?? 1) ? "Remove from cart" : "Decrease quantity"}
                          className="text-ink text-[20px] font-medium hover:text-brand-purple transition-colors leading-none"
                        >
                          −
                        </button>
                        <span className="text-[15px] font-bold">{String(item.qty).padStart(2, "0")}</span>
                        <button
                          onClick={() => changeQty(item, +1)}
                          disabled={(() => {
                            const nextQty = item.qty + (item.step ?? 1);
                            const orderCap = item.maxQty;
                            const stockCap = item.available_stock != null
                              ? Number(item.available_stock)
                              : (item.stock != null ? Number(item.stock) : null);
                            if (orderCap != null && nextQty > orderCap) return true;
                            if (stockCap != null && nextQty > stockCap) return true;
                            return false;
                          })()}
                          className="text-ink text-[20px] font-medium hover:text-brand-purple transition-colors leading-none disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                      {qtyErrors[lineKey(item)] && (
                        <p className="text-[12px] text-red-500" role="alert">
                          {qtyErrors[lineKey(item)]}
                        </p>
                      )}

                      <div className="text-[13px] sm:text-[14px] text-ink font-medium">
                        Unit Price : <span className="font-bold">{fmt(item.price)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => moveToSaved(lineKey(item))}
                        className="self-start text-[12px] font-semibold text-[#525151] hover:text-brand-purple hover:underline transition-colors"
                      >
                        Save for later
                      </button>
                    </div>

                    {/* Right column — verified badge hidden on mobile to keep
                        the row from cramping. Rating + trash + total stay. */}
                    <div className="flex flex-col items-end justify-between gap-3">
                      <span className="hidden sm:inline-flex flex-col items-center gap-1">
                        <span className="text-[13px] font-medium text-[#525151] leading-none">Verified by</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/figma/suvcraft-logo2.png" alt="Suvcraft" className="h-[22px] w-auto" />
                      </span>
                      <div className="flex flex-col items-end gap-2 sm:gap-3">
                        <button
                          onClick={() => removeFromCart(lineKey(item))}
                          aria-label="Remove from cart"
                          className="bg-[#f5f5f5] p-1.5 sm:p-2 rounded-[8px] text-[#9c9c9c] hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                      <div className="text-[12px] sm:text-[14px] text-[#525151] whitespace-nowrap">
                        Total : <span className="font-bold text-ink">{fmt(item.price * item.qty)}</span>
                      </div>
                    </div>
                  </div>
                  {index < items.length - 1 && (
                    <div
                      aria-hidden
                      className="mt-8 h-px w-full"
                      style={{
                        backgroundImage: "linear-gradient(to right, #e7e7e7 50%, transparent 50%)",
                        backgroundSize: "10px 1px",
                        backgroundRepeat: "repeat-x",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {saved.length > 0 && (
          <div className={`rounded-[5px] border-2 border-dashed border-[#e7e7e7] p-4 sm:p-6 ${items.length > 0 ? "mt-6" : ""}`}>
            <div className="flex items-baseline gap-2">
              <h2 className="text-[18px] sm:text-[20px] font-bold text-ink">Saved for later</h2>
              <span className="text-[12px] text-[#8c8c8c]">{saved.length} {saved.length === 1 ? "item" : "items"}</span>
            </div>
            <hr className="mt-4 mb-6 sm:mb-8 border-dashed border-[#e7e7e7]" />

            <div className="flex flex-col gap-8">
              {saved.map((item, index) => (
                <div key={lineKey(item)} className="relative bg-white">
                  <div className="flex gap-3 sm:gap-6">
                    <Link href={`/product/${item.id}`} className="h-[90px] w-[90px] sm:h-[110px] sm:w-[110px] shrink-0 flex items-center justify-center rounded-[12px] border border-[#e7e7e7] bg-[#f9f9f9] overflow-hidden">
                      <ProductImage src={resolveImg(item.image)} alt={item.name} className="h-full w-full object-contain p-2" />
                    </Link>

                    <div className="flex flex-1 flex-col gap-2 min-w-0">
                      <Link href={`/product/${item.id}`} className="text-[14px] sm:text-[15px] font-semibold text-ink hover:underline line-clamp-2">
                        {item.name}
                      </Link>
                      <div className="text-[13px] sm:text-[14px] text-ink font-medium">
                        Price : <span className="font-bold">{fmt(item.price)}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => moveToCart(lineKey(item))}
                          className="h-[34px] sm:h-[36px] rounded-[8px] bg-ink px-3 sm:px-4 text-[11.5px] sm:text-[12px] font-bold text-white hover:bg-black transition-colors"
                        >
                          Move to cart
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromSaved(lineKey(item))}
                          className="h-[34px] sm:h-[36px] rounded-[8px] border border-[#cfcfcf] px-3 sm:px-4 text-[11.5px] sm:text-[12px] font-semibold text-[#525151] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                  {index < saved.length - 1 && (
                    <div
                      aria-hidden
                      className="mt-8 h-px w-full"
                      style={{
                        backgroundImage: "linear-gradient(to right, #e7e7e7 50%, transparent 50%)",
                        backgroundSize: "10px 1px",
                        backgroundRepeat: "repeat-x",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="w-full lg:w-[500px]">
          <div className="flex flex-col gap-6">
            {/* Coupon */}
            {items.length > 0 && (
            <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white p-4 sm:p-6">
              <h3 className="text-[14px] font-bold text-ink mb-3">Coupon Code</h3>
              {coupon ? (
                <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white p-4 flex items-center gap-3">
                  {/* %-discount badge in #3E0149 */}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: "#3E0149" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 5L5 19" />
                      <circle cx="7.5" cy="7.5" r="2.5" />
                      <circle cx="16.5" cy="16.5" r="2.5" />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[14px] font-bold tracking-wide" style={{ color: "#3E0149" }}>{coupon.code}</span>
                      <span className="text-[12.5px] font-medium text-[#878787]">Coupon Applied</span>
                    </div>
                    <p className="mt-1 text-[12.5px] font-semibold" style={{ color: "#3E0149" }}>
                      You&apos;ve saved {fmt(couponDiscount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    aria-label="Remove coupon"
                    className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-[#525151] hover:bg-[#f5f5f5] transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                    </svg>
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
            <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white p-4 sm:p-6">
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
            </div>

            {/* Top-level blocker if any line is OOS / unavailable. Stops the
                user from clicking Place Order and losing time on the address
                step, which would then fail at the server with a 409. */}
            {hasBlockingIssue && (
              <div className="flex items-start gap-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>
                  {blockingItems.length === 1
                    ? `"${blockingItems[0].name}" is no longer available. Remove it to continue.`
                    : `${blockingItems.length} items in your cart are no longer available. Remove them to continue.`}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={items.length === 0 || hasBlockingIssue}
              className="flex h-[58px] w-full items-center justify-center rounded-[10px] bg-[#1c1c1c] text-[16px] font-bold text-white hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1c1c1c]"
            >
              Check Out Now
            </button>

            {/* Continue Shopping */}
            <Link
              href="/"
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[5px] border-2 border-dashed border-[#e7e7e7] text-[14px] font-medium text-[#525151] hover:text-ink hover:border-ink transition-all"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Continue Shopping
            </Link>

            {/* Disclaimer */}
            <div className="rounded-[5px] bg-[#fff8e1] p-5 border border-[#ffe082]">
              <h4 className="text-[14px] font-bold text-black mb-2">Disclaimer !</h4>
              <p className="text-[12px] leading-[1.6] text-black">
                Prices are inclusive of all taxes. Delivery charges may apply based on your location and order value.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-sell strip — pulls popular products and skips anything already
          in the cart so we don't recommend what's already there. */}
      <BuyTogether excludeIds={[...items.map((i) => i.id), ...saved.map((i) => i.id)]} />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => { setIsLoggedIn(true); setAuthOpen(false); router.push("/checkout"); }}
      />
      </div>
    </div>
  );
}
