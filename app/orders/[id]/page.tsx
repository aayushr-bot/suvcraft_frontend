"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { imgUrl } from "@/lib/api";
import ProductImage from "../../components/ProductImage";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const PLACEHOLDER_IMG = "/product-placeholder.svg";

type StatusEntry = { name: string; at: string | null };

type OrderItem = {
  id: number;
  product_name: string;
  variant_name?: string;
  quantity: number;
  price: number | string;
  discounted_price?: number | string;
  sub_total: number | string;
  product_image?: string;
  current_status?: string;
  status_history?: StatusEntry[];
  size?: string;
  color?: { name: string; swatch?: string };
};

type TrackingEntry = {
  id: number;
  order_item_id?: string | number;
  courier_agency?: string;
  tracking_id?: string;
  url?: string;
  awb_code?: string;
  date_created?: string;
};

type OrderDetail = {
  id: number;
  user_id: number;
  total: number | string;
  final_total: number | string;
  status: string;
  payment_method: string;
  delivery_charge?: number | string;
  discount?: number | string;
  promo_discount?: number | string;
  promo_code?: string;
  date_added: string;
  notes?: string;
  customer?: string;
  customer_email?: string;
  mobile?: string;
  items: OrderItem[];
  tracking?: TrackingEntry[];
  transaction?: {
    id?: number;
    txn_id?: string;
    payu_txn_id?: string;
  } | null;
  address?: {
    name: string;
    mobile: string;
    address: string;
    landmark?: string;
    city: string;
    state?: string;
    pincode: string;
  } | null;
};

const TIMELINE_STEPS: { key: string; label: string }[] = [
  { key: "received", label: "Order Confirmed" },
  { key: "processed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
];

const CUSTOMER_CANCELLABLE = new Set(["awaiting", "received"]);

const STATUS_STYLES: Record<string, string> = {
  awaiting: "bg-amber-50 text-amber-700 border-amber-200",
  received: "bg-blue-50 text-blue-700 border-blue-200",
  processed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  shipped: "bg-violet-50 text-violet-700 border-violet-200",
  out_for_delivery: "bg-orange-50 text-orange-700 border-orange-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  returned: "bg-slate-100 text-slate-700 border-slate-300",
};

const STATUS_LABEL: Record<string, string> = {
  awaiting: "Awaiting Confirmation",
  received: "Order Received",
  processed: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

function fmt(n: number | string | undefined) {
  if (n == null) return "₹0";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function formatDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function resolveImg(path: string | undefined) {
  if (!path) return PLACEHOLDER_IMG;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

function parseAddressFromNotes(notes: string): { name?: string; address?: string; city?: string; state?: string; zip?: string } | null {
  if (!notes) return null;
  try { return JSON.parse(notes); } catch { return null; }
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  async function cancelOrder() {
    if (!order) return;
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch(`${API}/api/v1/orders/${order.id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const j = await res.json();
      if (j.error) { setCancelError(j.message || "Could not cancel order."); return; }
      // Refetch the order so the timeline + status badge update.
      const fresh = await fetch(`${API}/api/v1/orders/${order.id}`, { credentials: "include" }).then((r) => r.json());
      if (fresh?.data?.order) setOrder(fresh.data.order);
    } catch {
      setCancelError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    fetch(`${API}/api/v1/orders/${id}`, { credentials: "include" })
      .then(async (r) => {
        if (r.status === 401) { router.push("/"); return null; }
        return r.json();
      })
      .then((j) => {
        if (!j) return;
        if (j.error) { setError(j.message || "Order not found."); return; }
        setOrder(j.data?.order ?? null);
      })
      .catch(() => setError("Network error. Please try again."));
  }, [id, router]);

  if (!order && !error) {
    return (
      <div className="w-full bg-white min-h-screen">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-20 md:px-8 flex items-center justify-center">
          <p className="text-[14px] text-[#8c8c8c]">Loading order…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="w-full bg-white min-h-screen">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-20 md:px-8 flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-[60px]">😕</div>
          <h2 className="text-[22px] font-bold text-ink">{error || "Order not found"}</h2>
          <Link href="/orders" className="inline-flex h-[44px] items-center justify-center rounded-[10px] bg-ink px-8 text-[14px] font-bold text-white hover:bg-black">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const statusKey = (order.status || "").toLowerCase();
  const statusLabel = STATUS_LABEL[statusKey] || order.status;
  const statusClass = STATUS_STYLES[statusKey] || "bg-slate-100 text-slate-700 border-slate-300";

  const subtotal = order.items.reduce((s, i) => s + Number(i.sub_total ?? 0), 0);
  const deliveryAddr = order.address || parseAddressFromNotes(order.notes || "");

  // Timeline reflects the order-level status — admin updates `orders.status`,
  // and every step at or before that status is considered "reached".
  // Per-item status_history (when present) supplies precise timestamps for each step.
  const isCancelled = statusKey === "cancelled";
  // "Order Placed" and "Packed" are intentionally hidden from the timeline.
  // When the backend status is "processed" (Packed), the truck stays at "Order Confirmed".
  const timelineSteps = TIMELINE_STEPS.filter((s) => s.key !== "processed");
  const effectiveStatus = statusKey === "processed" ? "received" : statusKey;
  const currentIdx = timelineSteps.findIndex((s) => s.key === effectiveStatus);
  const reachedIdx = currentIdx >= 0 ? currentIdx : 0;
  const history: StatusEntry[] = order.items[0]?.status_history || [];
  const timestampOf = (key: string): string | null => {
    const hit = history.find((h) => (h.name || "").toLowerCase() === key);
    return hit?.at || null;
  };

  const canCancel = CUSTOMER_CANCELLABLE.has(statusKey);
  const tracking = order.tracking || [];

  // Estimated delivery — for non-delivered orders, show "expected by" placed +14 days.
  const placedDate = new Date(order.date_added);
  const estimatedDelivery = new Date(placedDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  const fmtShortDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-6 pb-10 md:px-8">
      <nav className="text-[13px] text-[#8c8c8c] mb-4">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/orders" className="hover:text-ink">Orders</Link>
        <span className="mx-1.5">›</span>
        <span className="text-ink">ID {order.id}</span>
      </nav>

      {/* Header row */}
      <div className="flex flex-row items-center justify-between gap-3 mb-2">
        <h1 className="text-[24px] md:text-[28px] font-bold text-ink leading-tight">Order ID: {order.id}</h1>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="inline-flex h-[40px] items-center justify-center gap-1.5 rounded-[8px] border border-[#e7e7e7] bg-white px-4 text-[13px] font-semibold text-ink hover:border-ink"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Invoice
          </button>
        </div>
      </div>

      {/* Date row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] mb-6">
        <span className="text-[#525151]">Order date: <span className="font-bold text-ink">{fmtShortDate(placedDate)}</span></span>
        {!isCancelled && (
          <>
            <span className="h-4 w-px bg-[#cfcfcf]" aria-hidden />
            <span className="inline-flex items-center gap-2 font-bold text-[#19A23B]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 18H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h11v13" />
                <path d="M14 9h4l3 3v6h-2" />
                <path d="m6 12 2 2 4-4" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="17" cy="18" r="2" />
              </svg>
              Estimated delivery: {fmtShortDate(estimatedDelivery)}
            </span>
          </>
        )}
      </div>

      {/* Status timeline (horizontal) */}
      {isCancelled ? (
        <div className="mb-6 rounded-[12px] border border-red-200 bg-red-50 p-5 flex items-center gap-3">
          <div className="text-[28px]">⊘</div>
          <div>
            <h3 className="text-[15px] font-bold text-red-800">Order Cancelled</h3>
            <p className="text-[12px] text-red-700 mt-0.5">This order is no longer active.</p>
          </div>
        </div>
      ) : (
        <div className="mb-8 border-t border-[#e7e7e7] py-6">
          {/* Step labels — above the rail */}
          <div className="flex justify-between mb-2">
            {timelineSteps.map((step, idx) => {
              const reached = idx <= reachedIdx;
              return (
                <div
                  key={step.key}
                  className={`w-0 flex-1 text-center text-[12px] font-semibold ${reached ? "text-[#F17A20]" : "text-[#9c9c9c]"}`}
                >
                  {step.label}
                </div>
              );
            })}
          </div>
          {/* Rail with truck centered on the line */}
          <div className="relative h-[64px]">
            {/* Background rail — clipped from first step's center to last step's center */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-[3px] bg-[#D0D5DD]"
              style={{
                left: `${(0.5 / timelineSteps.length) * 100}%`,
                right: `${(0.5 / timelineSteps.length) * 100}%`,
              }}
            />
            {/* Progress fill — starts at first step's center, ends under the truck */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-[3px] bg-[#F17A20]"
              style={{
                left: `${(0.5 / timelineSteps.length) * 100}%`,
                width: `${(reachedIdx / timelineSteps.length) * 100}%`,
              }}
            />
            {/* Markers — orange dot for reached steps (except the truck's),
                white/gray dot for steps yet to be reached. */}
            {timelineSteps.map((step, idx) => {
              if (idx === reachedIdx) return null; // truck sits here
              const reached = idx < reachedIdx;
              return (
                <div
                  key={`marker-${step.key}`}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full ${reached ? "bg-[#F17A20]" : "bg-white border-2 border-[#D0D5DD]"}`}
                  style={{ left: `${((idx + 0.5) / timelineSteps.length) * 100}%` }}
                />
              );
            })}
            {/* Delivery truck at the latest reached step, centered on the rail */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${((reachedIdx + 0.5) / timelineSteps.length) * 100}%` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/figma/delivery_car.png" alt="" className="h-[64px] w-auto block" />
            </div>
          </div>
          {/* Dates — below the rail */}
          <div className="flex justify-between mt-2">
            {timelineSteps.map((step, idx) => {
              // Use the recorded timestamp when available. For older orders that
              // were status-bumped without per-item history entries, fall back to
              // the order's creation date so reached steps still show *a* date
              // rather than a blank slot.
              const reached = idx <= reachedIdx;
              const ts = timestampOf(step.key) ?? (reached ? order.date_added : null);
              return (
                <div key={step.key} className="w-0 flex-1 text-center text-[11px] text-[#878787]">
                  {ts ? formatDate(ts).split(",")[0] : (idx === timelineSteps.length - 1 ? `Expected by, ${fmtShortDate(estimatedDelivery)}` : "")}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="flex flex-col">
        {order.items.map((it, idx) => (
          <div
            key={it.id}
            className={`flex items-center gap-4 py-5 ${idx === 0 ? "" : "border-t border-[#eee]"}`}
          >
            <div className="h-[64px] w-[64px] shrink-0 rounded-[8px] bg-[#f6f6f8] overflow-hidden flex items-center justify-center">
              <ProductImage src={resolveImg(it.product_image)} alt={it.product_name} className="h-full w-full object-contain p-1" />
            </div>
            <div className="flex flex-1 min-w-0 flex-col gap-1">
              <h4 className="text-[15px] font-semibold text-ink line-clamp-1">{it.product_name}</h4>
              {(it.size || it.color) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#878787]">
                  {it.color && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: it.color.swatch || "#e7e7e7" }} />
                      {it.color.name}
                    </span>
                  )}
                  {it.color && it.size && <span className="text-[#cfcfcf]">|</span>}
                  {it.size && <span>{it.size}</span>}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-[15px] font-bold text-ink">{fmt(it.sub_total)}</div>
              <div className="text-[12px] text-[#878787]">Qty: {it.quantity}</div>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-[#eee] mt-2 mb-8" />

      {/* Bottom two-column block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
        {/* Left column */}
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="text-[15px] font-bold text-ink mb-3">Payment</h3>
            <div className="flex items-center gap-3 text-[13px] text-[#525151]">
              {order.transaction?.payu_txn_id || order.transaction?.txn_id ? (
                <>
                  <svg className="h-5 w-7" viewBox="0 0 32 24" fill="none">
                    <rect width="32" height="24" rx="3" fill="#1A1F71" />
                    <text x="16" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">VISA</text>
                  </svg>
                  <span>{(order.payment_method || "").toUpperCase()} ***{String(order.transaction?.txn_id || order.transaction?.payu_txn_id || "").slice(-4) || ""}</span>
                </>
              ) : (
                <span className="uppercase font-semibold text-ink">{order.payment_method || "—"}</span>
              )}
            </div>
          </div>
          {canCancel && (
            <div>
              {cancelError && <p className="text-[12px] font-medium text-red-600 mb-2">{cancelError}</p>}
              <button
                type="button"
                onClick={cancelOrder}
                disabled={cancelling}
                className="inline-flex h-[40px] items-center justify-center rounded-[10px] border border-red-500 px-5 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cancelling ? "Cancelling…" : "Cancel Order"}
              </button>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-8">
          {deliveryAddr && (
            <div>
              <h3 className="text-[15px] font-bold text-ink mb-3">Delivery</h3>
              <div className="text-[13px] text-[#525151] leading-[1.7]">
                <div className="text-[#878787] mb-1">Address</div>
                {(deliveryAddr as { name?: string }).name && <div className="text-ink font-medium">{(deliveryAddr as { name?: string }).name}</div>}
                <div>{(deliveryAddr as { address?: string }).address}{(deliveryAddr as { landmark?: string }).landmark ? `, ${(deliveryAddr as { landmark?: string }).landmark}` : ""}</div>
                <div>
                  {(deliveryAddr as { city?: string }).city}
                  {(deliveryAddr as { state?: string }).state ? `, ${(deliveryAddr as { state?: string }).state}` : ""}
                  {" "}
                  {(deliveryAddr as { pincode?: string; zip?: string }).pincode || (deliveryAddr as { pincode?: string; zip?: string }).zip}
                </div>
                {(deliveryAddr as { mobile?: string }).mobile && <div>{(deliveryAddr as { mobile?: string }).mobile}</div>}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-[15px] font-bold text-ink mb-4">Order Summary</h3>
            <div className="flex flex-col gap-3 text-[13px]">
              <div className="flex justify-between text-[#525151]">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {Number(order.delivery_charge) > 0 ? (
                <div className="flex justify-between text-[#525151]">
                  <span>Delivery</span>
                  <span>{fmt(order.delivery_charge)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-[#525151]">
                  <span>Delivery</span>
                  <span>{fmt(0)}</span>
                </div>
              )}
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-[#525151]">
                  <span>Discount</span>
                  <span className="text-green-700">-{fmt(order.discount)}</span>
                </div>
              )}
              {Number(order.promo_discount) > 0 && (
                <div className="flex justify-between text-[#525151]">
                  <span>Promo ({order.promo_code})</span>
                  <span className="text-green-700">-{fmt(order.promo_discount)}</span>
                </div>
              )}
              {(() => {
                const taxAmt = order.items.reduce((s, i) => s + Number((i as { tax_amount?: number | string }).tax_amount ?? 0), 0);
                return taxAmt > 0 ? (
                  <div className="flex justify-between text-[#525151]">
                    <span>Tax</span>
                    <span>+{fmt(taxAmt)}</span>
                  </div>
                ) : null;
              })()}
              <hr className="my-2 border-[#eee]" />
              <div className="flex justify-between text-[16px] font-bold">
                <span className="text-ink">Total</span>
                <span className="text-ink">{fmt(order.final_total ?? order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Need Help — full-width at the bottom of the page */}
      <div className="mt-10 pt-6 border-t border-[#eee]">
        <h3 className="text-[15px] font-bold text-ink mb-3">Need Help</h3>
        <div className="flex flex-col gap-2 text-[13px] text-[#525151]">
          <Link href="/orders" className="inline-flex items-center gap-1.5 hover:text-ink">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Order Issues
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
          </Link>
          <Link href="/orders" className="inline-flex items-center gap-1.5 hover:text-ink">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Delivery Info
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
          </Link>
          <Link href="/orders" className="inline-flex items-center gap-1.5 hover:text-ink">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Returns
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
