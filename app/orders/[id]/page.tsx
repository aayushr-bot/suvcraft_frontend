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
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8 min-h-screen bg-white flex items-center justify-center">
        <p className="text-[14px] text-[#8c8c8c]">Loading order…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8 min-h-screen bg-white flex flex-col items-center justify-center gap-4 text-center">
        <div className="text-[60px]">😕</div>
        <h2 className="text-[22px] font-bold text-ink">{error || "Order not found"}</h2>
        <Link href="/orders" className="inline-flex h-[44px] items-center justify-center rounded-[10px] bg-ink px-8 text-[14px] font-bold text-white hover:bg-black">
          Back to Orders
        </Link>
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
  const timelineSteps = [{ key: "placed", label: "Order Placed" }, ...TIMELINE_STEPS];
  const currentIdx = timelineSteps.findIndex((s) => s.key === statusKey);
  const reachedIdx = currentIdx >= 0 ? currentIdx : 0; // unknown status → only "placed" reached
  const history: StatusEntry[] = order.items[0]?.status_history || [];
  const timestampOf = (key: string): string | null => {
    if (key === "placed") return order.date_added;
    const hit = history.find((h) => (h.name || "").toLowerCase() === key);
    return hit?.at || null;
  };

  const canCancel = CUSTOMER_CANCELLABLE.has(statusKey);
  const tracking = order.tracking || [];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8 min-h-screen bg-white">
      <nav className="text-[13px] text-[#8c8c8c] mb-4">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/orders" className="hover:text-ink">My Orders</Link>
        <span className="mx-1.5">›</span>
        <span className="text-ink">Order #{order.id}</span>
      </nav>

      <div className="flex flex-col gap-2 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-ink md:text-[30px]">Order #{order.id}</h1>
          <p className="text-[13px] text-[#525151] mt-1">Placed on {formatDate(order.date_added)}</p>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[12px] font-semibold uppercase tracking-wide ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Status timeline — hidden when cancelled, replaced by a Cancelled banner */}
          {isCancelled ? (
            <div className="rounded-[14px] border border-red-200 bg-red-50 p-5 flex items-center gap-3">
              <div className="text-[28px]">⊘</div>
              <div>
                <h3 className="text-[15px] font-bold text-red-800">Order Cancelled</h3>
                <p className="text-[12px] text-red-700 mt-0.5">This order is no longer active.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-[14px] border border-[#e7e7e7] bg-white p-5">
              <h3 className="text-[14px] font-semibold text-ink mb-5">Order Tracking</h3>
              <ol className="relative flex flex-col gap-5">
                {timelineSteps.map((step, idx) => {
                  const reached = idx <= reachedIdx;
                  const isCurrent = idx === reachedIdx;
                  const ts = timestampOf(step.key);
                  const isLast = idx === timelineSteps.length - 1;
                  return (
                    <li key={step.key} className="relative flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold transition-colors ${
                          reached
                            ? (isCurrent ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-green-600 text-white")
                            : "bg-[#f0f0f0] text-[#9c9c9c]"
                        }`}>
                          {reached && !isCurrent ? "✓" : idx + 1}
                        </div>
                        {!isLast && (
                          <div className={`w-px flex-1 mt-1 ${idx < reachedIdx ? "bg-green-600" : "bg-[#e7e7e7]"}`} style={{ minHeight: 20 }} />
                        )}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className={`text-[13px] font-semibold ${reached ? "text-ink" : "text-[#9c9c9c]"}`}>{step.label}</div>
                        {ts && <div className="text-[11px] text-[#878787] mt-0.5">{formatDate(ts)}</div>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Tracking details — only shown when at least one tracking row exists */}
          {tracking.length > 0 && (
            <div className="rounded-[14px] border border-[#e7e7e7] bg-white p-5">
              <h3 className="text-[14px] font-semibold text-ink mb-3">Shipment Tracking</h3>
              <div className="flex flex-col gap-3">
                {tracking.map((t) => (
                  <div key={t.id} className="rounded-[10px] border border-[#e7e7e7] bg-[#fafafa] p-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-ink">{t.courier_agency || "Courier"}</span>
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-brand-purple hover:underline">
                          Track on courier site →
                        </a>
                      )}
                    </div>
                    {t.tracking_id && (
                      <div className="text-[12px] text-[#525151]">
                        Tracking ID: <span className="font-mono font-semibold text-ink">{t.tracking_id}</span>
                      </div>
                    )}
                    {t.awb_code && (
                      <div className="text-[12px] text-[#525151]">
                        AWB: <span className="font-mono font-semibold text-ink">{t.awb_code}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-[14px] border border-[#e7e7e7] bg-white">
            <div className="px-5 py-3 border-b border-[#e7e7e7]">
              <h3 className="text-[14px] font-semibold text-ink">Items in this order ({order.items.length})</h3>
            </div>
            <div className="p-5 flex flex-col gap-5">
              {order.items.map((it) => (
                <div key={it.id} className="flex gap-4">
                  <div className="h-[80px] w-[80px] shrink-0 rounded-[10px] border border-[#e7e7e7] bg-[#f9f9f9] overflow-hidden flex items-center justify-center">
                    <ProductImage src={resolveImg(it.product_image)} alt={it.product_name} className="h-full w-full object-contain p-1" />
                  </div>
                  <div className="flex flex-1 min-w-0 flex-col">
                    <h4 className="text-[14px] font-semibold text-ink line-clamp-2">{it.product_name}</h4>
                    {it.variant_name && <span className="text-[12px] text-[#8c8c8c] mt-0.5">{it.variant_name}</span>}
                    <div className="mt-1 flex items-center gap-3 text-[12px] text-[#525151]">
                      <span>Qty: {it.quantity}</span>
                      <span className="text-[#cfcfcf]">•</span>
                      <span>{fmt(it.price)} each</span>
                    </div>
                    {it.current_status && (
                      <span className="mt-2 inline-flex w-fit items-center rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#525151]">
                        {STATUS_LABEL[it.current_status.toLowerCase()] || it.current_status}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-bold text-ink">{fmt(it.sub_total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          {deliveryAddr && (
            <div className="rounded-[14px] border border-[#e7e7e7] bg-white p-5">
              <h3 className="text-[14px] font-semibold text-ink mb-3">Delivery Address</h3>
              <div className="text-[14px] text-[#525151] leading-relaxed">
                {(deliveryAddr as { name?: string }).name && <div className="font-semibold text-ink">{(deliveryAddr as { name?: string }).name}</div>}
                {(deliveryAddr as { mobile?: string }).mobile && <div>{(deliveryAddr as { mobile?: string }).mobile}</div>}
                <div>
                  {(deliveryAddr as { address?: string }).address}
                  {(deliveryAddr as { landmark?: string }).landmark ? `, ${(deliveryAddr as { landmark?: string }).landmark}` : ""}
                </div>
                <div>
                  {(deliveryAddr as { city?: string }).city}
                  {(deliveryAddr as { state?: string }).state ? `, ${(deliveryAddr as { state?: string }).state}` : ""}
                  {" - "}
                  <span className="font-semibold text-ink">
                    {(deliveryAddr as { pincode?: string; zip?: string }).pincode || (deliveryAddr as { pincode?: string; zip?: string }).zip}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Price Summary */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[14px] border border-[#e7e7e7] bg-white p-5">
            <h3 className="text-[13px] font-semibold uppercase text-[#878787] tracking-wide mb-4">Price Details</h3>
            <div className="flex flex-col gap-3 text-[14px]">
              <div className="flex justify-between">
                <span className="text-ink">Subtotal</span>
                <span className="text-ink">{fmt(subtotal)}</span>
              </div>
              {Number(order.delivery_charge) > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink">Delivery Charge</span>
                  <span className="text-ink">{fmt(order.delivery_charge)}</span>
                </div>
              )}
              {Number(order.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink">Discount</span>
                  <span className="text-green-700">-{fmt(order.discount)}</span>
                </div>
              )}
              {Number(order.promo_discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink">Promo Discount</span>
                  <span className="text-green-700">-{fmt(order.promo_discount)}</span>
                </div>
              )}
              <hr className="my-1 border-dashed border-[#e7e7e7]" />
              <div className="flex justify-between text-[16px] font-bold">
                <span className="text-ink">Total</span>
                <span className="text-ink">{fmt(order.final_total ?? order.total)}</span>
              </div>
              <div className="flex justify-between text-[12px] text-[#525151] mt-1">
                <span>Payment</span>
                <span className="uppercase font-semibold">{order.payment_method || "—"}</span>
              </div>
            </div>
          </div>

          {canCancel && (
            <div className="rounded-[14px] border border-[#e7e7e7] bg-white p-5 flex flex-col gap-3">
              <div>
                <h3 className="text-[14px] font-semibold text-ink">Need to cancel?</h3>
                <p className="text-[12px] text-[#878787] mt-1">You can cancel this order until it's packed.</p>
              </div>
              {cancelError && <p className="text-[12px] font-medium text-red-600">{cancelError}</p>}
              <button
                type="button"
                onClick={cancelOrder}
                disabled={cancelling}
                className="h-[40px] rounded-[10px] border border-red-500 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cancelling ? "Cancelling…" : "Cancel Order"}
              </button>
            </div>
          )}

          <Link
            href="/orders"
            className="inline-flex h-[44px] items-center justify-center rounded-[10px] border border-[#d4d4d4] text-[13px] font-semibold text-ink hover:bg-black/5"
          >
            ← Back to Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
