"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { imgUrl } from "@/lib/api";
import ProductImage from "../../components/ProductImage";
import RateProductModal from "../../components/RateProductModal";
import ReturnRequestModal, { type ReturnableItem } from "../../components/ReturnRequestModal";
import TrackReturnModal from "../../components/TrackReturnModal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const PLACEHOLDER_IMG = "/product-placeholder.svg";

type StatusEntry = { name: string; at: string | null };

type OrderItem = {
  id: number;
  product_id?: number;
  product_name: string;
  variant_name?: string;
  quantity: number;
  price: number | string;
  discounted_price?: number | string;
  sub_total: number | string;
  product_image?: string;
  current_status?: string;
  status_history?: StatusEntry[];
  is_returnable?: number;
  size?: string;
  color?: { name: string; swatch?: string };
};

type ReturnRequestRow = {
  id: number;
  order_item_id: number;
  request_type: "return" | "exchange";
  return_reason: string;
  status: number;
  remarks?: string;
  date_created?: string;
  refund_amount?: number | string;
  refund_method?: string | null;
  pickup_address_id?: number | null;
  pickup_name?: string | null;
  pickup_mobile?: string | null;
  pickup_address?: string | null;
  pickup_city?: string | null;
  pickup_state?: string | null;
  pickup_pincode?: string | null;
  media?: { url: string; type: "image" | "video" }[];
};

const RETURN_STATUS_LABEL: Record<number, string> = {
  0: "Pending review",
  1: "Approved",
  2: "Rejected",
  3: "Picked up",
  4: "Refunded / Exchanged",
};

const RETURN_STATUS_BADGE: Record<number, string> = {
  0: "bg-amber-50 text-amber-700 border-amber-200",
  1: "bg-blue-50 text-blue-700 border-blue-200",
  2: "bg-red-50 text-red-700 border-red-200",
  3: "bg-violet-50 text-violet-700 border-violet-200",
  4: "bg-green-50 text-green-700 border-green-200",
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
  // Map from order_item_id -> the rating the buyer just submitted in this
  // session. Keyed per line item (not per product) so that the same product
  // appearing in multiple cart rows can carry independent ratings.
  const [myRatings, setMyRatings] = useState<Record<number, { rating: number; comment: string } | null>>({});
  const [rateOpen, setRateOpen] = useState(false);
  const [rateTarget, setRateTarget] = useState<{ productId: number; orderItemId: number; name: string; rating: number; comment: string } | null>(null);
  // Return / exchange state — fetched once per order, indexed by order_item_id.
  const [returnRequests, setReturnRequests] = useState<Record<number, ReturnRequestRow>>({});
  const [returnWindowDays, setReturnWindowDays] = useState<number>(7);
  const [returnOpen, setReturnOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackTarget, setTrackTarget] = useState<{ request: ReturnRequestRow; name: string } | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  // Drives the delivery-truck slide-in on the timeline. Starts at 0 and is
  // bumped to reachedIdx after first paint so CSS interpolates the change.
  const [animIdx, setAnimIdx] = useState(0);

  function downloadInvoice() {
    if (!order) return;
    const fmtAmt = (n: number | string | undefined) => `Rs. ${Number(n ?? 0).toLocaleString("en-IN")}`;
    const placedOn = formatDate(order.date_added);
    const subTotal = order.items.reduce((s, i) => s + Number(i.sub_total ?? 0), 0);
    const taxAmt = order.items.reduce((s, i) => s + Number((i as { tax_amount?: number | string }).tax_amount ?? 0), 0);
    const addr = order.address || parseAddressFromNotes(order.notes || "") || {};
    const a = addr as { name?: string; mobile?: string; email?: string; address?: string; landmark?: string; city?: string; state?: string; pincode?: string; zip?: string };
    const escapeHtml = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
    const itemsRows = order.items.map((it) => `
      <tr>
        <td>${escapeHtml(it.product_name)}${it.size || it.color ? `<div class="muted">${[it.color?.name, it.size].filter(Boolean).map(escapeHtml).join(" / ")}</div>` : ""}</td>
        <td class="num">${escapeHtml(it.quantity)}</td>
        <td class="num">${fmtAmt(it.price)}</td>
        <td class="num">${fmtAmt(it.sub_total)}</td>
      </tr>
    `).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Invoice #${order.id}</title><style>
      *{box-sizing:border-box}
      body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#1c1c1c;margin:0;padding:32px;max-width:800px;margin:0 auto}
      h1{font-size:22px;margin:0 0 4px}
      .muted{color:#878787;font-size:12px}
      .row{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}
      .box{margin-top:24px}
      table{width:100%;border-collapse:collapse;margin-top:24px}
      th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;vertical-align:top}
      th{background:#fafafa;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#525151}
      .num{text-align:right;white-space:nowrap}
      .totals{margin-top:16px;margin-left:auto;width:280px}
      .totals .line{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#525151}
      .totals .grand{border-top:2px solid #1c1c1c;margin-top:8px;padding-top:10px;font-weight:700;font-size:16px;color:#1c1c1c}
      h3{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#525151;margin:0 0 6px}
      .foot{margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center;color:#878787;font-size:12px}
      @media print{body{padding:16px}}
    </style></head><body>
      <div class="row">
        <div>
          <h1>Invoice</h1>
          <div class="muted">Order #${order.id} · Placed on ${escapeHtml(placedOn)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;font-size:16px">SUVCRAFT</div>
          <div class="muted">Tax Invoice</div>
        </div>
      </div>

      <div class="row box">
        <div>
          <h3>Bill To</h3>
          <div>${escapeHtml(a.name || order.customer || "")}</div>
          ${a.address ? `<div>${escapeHtml(a.address)}${a.landmark ? `, ${escapeHtml(a.landmark)}` : ""}</div>` : ""}
          ${(a.city || a.state || a.pincode || a.zip) ? `<div>${[a.city, a.state, a.pincode || a.zip].filter(Boolean).map(escapeHtml).join(", ")}</div>` : ""}
          ${a.mobile ? `<div>${escapeHtml(a.mobile)}</div>` : ""}
          ${a.email || order.customer_email ? `<div>${escapeHtml(a.email || order.customer_email)}</div>` : ""}
        </div>
        <div style="text-align:right">
          <h3>Payment</h3>
          <div>${escapeHtml((order.payment_method || "—").toUpperCase())}</div>
          ${order.transaction?.txn_id || order.transaction?.payu_txn_id ? `<div class="muted">Txn: ${escapeHtml(order.transaction?.txn_id || order.transaction?.payu_txn_id)}</div>` : ""}
        </div>
      </div>

      <table>
        <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Subtotal</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>

      <div class="totals">
        <div class="line"><span>Subtotal</span><span>${fmtAmt(subTotal)}</span></div>
        ${Number(order.delivery_charge) > 0 ? `<div class="line"><span>Delivery</span><span>${fmtAmt(order.delivery_charge)}</span></div>` : `<div class="line"><span>Delivery</span><span>${fmtAmt(0)}</span></div>`}
        ${Number(order.discount) > 0 ? `<div class="line"><span>Discount</span><span>-${fmtAmt(order.discount)}</span></div>` : ""}
        ${Number(order.promo_discount) > 0 ? `<div class="line"><span>Promo${order.promo_code ? ` (${escapeHtml(order.promo_code)})` : ""}</span><span>-${fmtAmt(order.promo_discount)}</span></div>` : ""}
        ${taxAmt > 0 ? `<div class="line"><span>Tax</span><span>+${fmtAmt(taxAmt)}</span></div>` : ""}
        <div class="line grand"><span>Total</span><span>${fmtAmt(order.final_total ?? order.total)}</span></div>
      </div>

      <div class="foot">Thank you for shopping with SUVCRAFT.</div>
      <script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),200)})</script>
    </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  }

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

  // Once the order loads and is delivered, pull existing return/exchange
  // requests so the UI shows "Requested · pending" instead of the button.
  useEffect(() => {
    if (!order) return;
    if ((order.status || "").toLowerCase() !== "delivered") return;
    fetch(`${API}/api/v1/orders/${order.id}/returns`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const rows: ReturnRequestRow[] = Array.isArray(j?.data?.rows) ? j.data.rows : [];
        const map: Record<number, ReturnRequestRow> = {};
        for (const r of rows) map[r.order_item_id] = r;
        setReturnRequests(map);
      })
      .catch(() => {});
  }, [order?.id, order?.status]);

  // Pull the admin-configured return window (defaults to 7 days).
  useEffect(() => {
    fetch(`${API}/api/v1/settings`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const n = Number(j?.data?.return_window_days);
        if (Number.isFinite(n) && n > 0) setReturnWindowDays(Math.floor(n));
      })
      .catch(() => {});
  }, []);

  // Pre-fetch the buyer's per-line ratings for this order so a previously-rated
  // item still shows the "Rated X" badge after a page refresh. The endpoint
  // joins `product_rating.order_item_id` with this order's items — seed/legacy
  // ratings made outside this order won't show up here.
  useEffect(() => {
    if (!order) return;
    if ((order.status || "").toLowerCase() !== "delivered") return;
    fetch(`${API}/api/v1/orders/${order.id}/ratings`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const rows: Array<{ order_item_id: number; rating: number; comment?: string }> = Array.isArray(j?.data?.rows) ? j.data.rows : [];
        const map: Record<number, { rating: number; comment: string } | null> = {};
        for (const r of rows) {
          map[r.order_item_id] = { rating: Number(r.rating || 0), comment: String(r.comment || "") };
        }
        setMyRatings((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {});
  }, [order?.id, order?.status]);

  // Slide the delivery truck from "Order Confirmed" → "Delivered" on load.
  // The timeline on this page only appears for delivered orders, so the
  // truck always animates to index 3 (the final step).
  useEffect(() => {
    if (!order) return;
    if ((order.status || "").toLowerCase() !== "delivered") return;
    const idx = 3;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setAnimIdx(idx);
      return;
    }
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimIdx(idx));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [order?.id, order?.status]);

  function openRateModal(productId: number, orderItemId: number, name: string) {
    const existing = myRatings[orderItemId];
    setRateTarget({
      productId,
      orderItemId,
      name,
      rating: existing?.rating ?? 0,
      comment: existing?.comment ?? "",
    });
    setRateOpen(true);
  }

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

  const isCancelled = statusKey === "cancelled";
  const isDelivered = statusKey === "delivered";
  const canCancel = CUSTOMER_CANCELLABLE.has(statusKey);

  // Timeline shown on the details page only after the order is finished
  // (delivered or cancelled). Mid-flight orders use /orders/:id/track instead.
  const showTimeline = isDelivered || isCancelled;
  const TIMELINE_STEPS = [
    { key: "received", label: "Order Confirmed" },
    { key: "shipped", label: "Shipped" },
    { key: "out_for_delivery", label: "Out for Delivery" },
    { key: "delivered", label: "Delivered" },
  ];
  const effectiveStatus = statusKey === "processed" ? "received" : statusKey;
  const currentIdx = TIMELINE_STEPS.findIndex((s) => s.key === effectiveStatus);
  const reachedIdx = currentIdx >= 0 ? currentIdx : 0;
  // ~550ms per step travelled, clamped to 0.8s–2.2s total.
  const animDuration = Math.min(2200, Math.max(800, reachedIdx * 550));
  const animEasing = "cubic-bezier(0.22, 0.61, 0.36, 1)";
  const motionStyle = {
    transition: `left ${animDuration}ms ${animEasing}, width ${animDuration}ms ${animEasing}`,
  };
  const history: StatusEntry[] = order.items[0]?.status_history || [];
  const timestampOf = (key: string): string | null => {
    const hit = history.find((h) => (h.name || "").toLowerCase() === key);
    return hit?.at || null;
  };
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
            onClick={downloadInvoice}
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

      {/* Finished-order banner / timeline. Live tracking lives on /orders/:id/track. */}
      {isCancelled && (
        <div className="mb-6 rounded-[12px] border border-red-200 bg-red-50 p-5 flex items-center gap-3">
          <div className="text-[28px]">⊘</div>
          <div>
            <h3 className="text-[15px] font-bold text-red-800">Order Cancelled</h3>
            <p className="text-[12px] text-red-700 mt-0.5">This order is no longer active.</p>
          </div>
        </div>
      )}
      {showTimeline && !isCancelled && (
        <div className="mb-8 border-t border-[#e7e7e7] py-6">
          <div className="flex justify-between mb-2">
            {TIMELINE_STEPS.map((step, idx) => {
              // Light up each label as the truck reaches its position.
              const reached = idx <= animIdx + 0.001;
              const delay = reachedIdx > 0
                ? Math.max(0, (idx / reachedIdx) * animDuration - 80)
                : 0;
              return (
                <div
                  key={step.key}
                  className={`w-0 flex-1 text-center text-[12px] font-semibold transition-colors duration-300 ${reached ? "text-[#F17A20]" : "text-[#9c9c9c]"}`}
                  style={{ transitionDelay: `${delay}ms` }}
                >
                  {step.label}
                </div>
              );
            })}
          </div>
          <div className="relative h-[64px]">
            <div
              className="absolute top-1/2 -translate-y-1/2 h-[3px] bg-[#D0D5DD]"
              style={{
                left: `${(0.5 / TIMELINE_STEPS.length) * 100}%`,
                right: `${(0.5 / TIMELINE_STEPS.length) * 100}%`,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-[3px] bg-[#F17A20]"
              style={{
                left: `${(0.5 / TIMELINE_STEPS.length) * 100}%`,
                width: `${(animIdx / TIMELINE_STEPS.length) * 100}%`,
                ...motionStyle,
              }}
            />
            {TIMELINE_STEPS.map((step, idx) => {
              // Hide the destination marker — the parked truck covers it.
              if (idx === reachedIdx) return null;
              const reached = idx < animIdx;
              const delay = reachedIdx > 0
                ? Math.max(0, (idx / reachedIdx) * animDuration - 80)
                : 0;
              return (
                <div
                  key={`marker-${step.key}`}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full transition-colors duration-200 ${reached ? "bg-[#F17A20]" : "bg-white border-2 border-[#D0D5DD]"}`}
                  style={{
                    left: `${((idx + 0.5) / TIMELINE_STEPS.length) * 100}%`,
                    transitionDelay: `${delay}ms`,
                  }}
                />
              );
            })}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{
                left: `${((animIdx + 0.5) / TIMELINE_STEPS.length) * 100}%`,
                ...motionStyle,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/figma/delivery_car.png" alt="" className="h-[64px] w-auto block" />
            </div>
          </div>
          <div className="flex justify-between mt-2">
            {TIMELINE_STEPS.map((step, idx) => {
              const reached = idx <= reachedIdx;
              const ts = timestampOf(step.key) ?? (reached ? order.date_added : null);
              return (
                <div key={step.key} className="w-0 flex-1 text-center text-[11px] text-[#878787]">
                  {ts ? formatDate(ts).split(",")[0] : ""}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Eligible items for a return/exchange — delivered, marked returnable,
          within the admin window, and not already in an open request. */}
      {(() => {
        const deliveredTs = timestampOf("delivered") ?? (isDelivered ? order.date_added : null);
        const deadline = deliveredTs
          ? new Date(new Date(deliveredTs).getTime() + returnWindowDays * 86400000)
          : null;
        const withinWindow = deadline ? Date.now() <= deadline.getTime() : false;
        // Everything in a delivered order is eligible for exchange as long as
        // there's no request open yet. The is_returnable flag only blocks the
        // refund path (handled inside the modal).
        const eligible: ReturnableItem[] = isDelivered && withinWindow
          ? order.items
              .filter((it) => !returnRequests[it.id])
              .map((it) => ({
                id: it.id,
                product_name: it.product_name,
                product_image: resolveImg(it.product_image),
                size: it.size,
                color: it.color,
                quantity: it.quantity,
                sub_total: it.sub_total,
                refund_allowed: it.is_returnable == null ? true : Number(it.is_returnable) === 1,
              }))
          : [];
        if (!eligible.length) return null;
        return (
          <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-[12px] border border-[#e7e7e7] bg-[#fafafa] px-4 py-3">
            <div className="text-[13px] text-[#525151]">
              Return or exchange any item before{" "}
              <span className="font-semibold text-ink">
                {deadline?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>.
            </div>
            <button
              type="button"
              onClick={() => setReturnOpen(true)}
              className="inline-flex h-[40px] w-fit items-center justify-center gap-1.5 rounded-[10px] border border-ink bg-white px-5 text-[12px] font-bold uppercase tracking-wide text-ink hover:bg-ink hover:text-white transition-colors"
            >
              Return / Exchange
            </button>
          </div>
        );
      })()}

      {/* Items list */}
      <div className="flex flex-col">
        {order.items.map((it, idx) => {
          // Per-item return state — used only to show the deadline/status text
          // under each line (the action button itself lives in the strip above).
          const deliveredTs = timestampOf("delivered") ?? (isDelivered ? order.date_added : null);
          const deadline = deliveredTs
            ? new Date(new Date(deliveredTs).getTime() + returnWindowDays * 86400000)
            : null;
          const withinWindow = deadline ? Date.now() <= deadline.getTime() : false;
          const itemIsReturnable = it.is_returnable == null ? true : Number(it.is_returnable) === 1;
          const existingReturn = returnRequests[it.id];
          // Even non-returnable items are still exchangeable, so show the
          // deadline/status row for every delivered line.
          const showReturnBlock = isDelivered;
          return (
            <div
              key={it.id}
              className={`flex items-start gap-4 py-5 ${idx === 0 ? "" : "border-t border-[#eee]"}`}
            >
              {it.product_id ? (
                <Link
                  href={`/product/${it.product_id}`}
                  className="h-[64px] w-[64px] shrink-0 rounded-[8px] bg-[#f6f6f8] overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-ink transition-all"
                >
                  <ProductImage src={resolveImg(it.product_image)} alt={it.product_name} className="h-full w-full object-contain p-1" />
                </Link>
              ) : (
                <div className="h-[64px] w-[64px] shrink-0 rounded-[8px] bg-[#f6f6f8] overflow-hidden flex items-center justify-center">
                  <ProductImage src={resolveImg(it.product_image)} alt={it.product_name} className="h-full w-full object-contain p-1" />
                </div>
              )}
              <div className="flex flex-1 min-w-0 flex-col gap-1">
                {it.product_id ? (
                  <Link
                    href={`/product/${it.product_id}`}
                    className="text-[15px] font-semibold text-ink line-clamp-1 hover:underline"
                  >
                    {it.product_name}
                  </Link>
                ) : (
                  <h4 className="text-[15px] font-semibold text-ink line-clamp-1">{it.product_name}</h4>
                )}
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
                {showReturnBlock && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px]">
                    {existingReturn ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold ${RETURN_STATUS_BADGE[existingReturn.status] || "bg-slate-50 text-slate-700 border-slate-200"}`}
                      >
                        {existingReturn.request_type === "exchange" ? "Exchange" : "Return"} ·{" "}
                        {RETURN_STATUS_LABEL[existingReturn.status] || "Pending"}
                      </span>
                    ) : withinWindow ? (
                      <span className="text-[#525151]">
                        Return/exchange by{" "}
                        <span className="font-semibold text-ink">
                          {deadline?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </span>
                    ) : deadline ? (
                      <span className="text-[#a3a3a3]">
                        Return window closed on{" "}
                        {deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    ) : null}
                  </div>
                )}
                {isDelivered && !itemIsReturnable && (
                  <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-[6px] bg-[#FEF2F2] px-2 py-0.5 text-[10.5px] font-semibold text-[#B42318]">
                    No return · only exchange
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-[15px] font-bold text-ink">{fmt(it.sub_total)}</div>
                  <div className="text-[12px] text-[#878787]">Qty: {it.quantity}</div>
                </div>
                {isDelivered && it.product_id && (() => {
                  // When the buyer has an open return/exchange request for this
                  // line, swap the Rate button for a Track Return Order CTA —
                  // they shouldn't be rating an item they're sending back.
                  if (existingReturn) {
                    return (
                      <button
                        type="button"
                        onClick={() => { setTrackTarget({ request: existingReturn, name: it.product_name }); setTrackOpen(true); }}
                        className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] border border-ink bg-white px-3 text-[12px] font-semibold text-ink hover:bg-ink hover:text-white transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        Track return order
                      </button>
                    );
                  }
                  const mine = myRatings[it.id];
                  const rated = mine && mine.rating > 0;
                  // Once a line is rated, the review is final — show a static
                  // badge instead of a clickable button so the buyer can't
                  // re-submit. Re-rating remains possible via the public
                  // product page if we ever want to expose it.
                  if (rated) {
                    return (
                      <span className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] border border-[#e7e7e7] bg-white px-3 text-[12px] font-semibold text-ink">
                        <svg className="h-3.5 w-3.5 text-[#F5A524]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l2.4 5.4L20 8.3l-4 3.9.9 5.5L12 15.1l-4.9 2.6.9-5.5-4-3.9 5.6-.9L12 2z" />
                        </svg>
                        Rated {mine?.rating}
                      </span>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => openRateModal(it.product_id as number, it.id, it.product_name)}
                      className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[#F5A524] px-3 text-[12px] font-semibold text-white hover:brightness-110 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l2.4 5.4L20 8.3l-4 3.9.9 5.5L12 15.1l-4.9 2.6.9-5.5-4-3.9 5.6-.9L12 2z" />
                      </svg>
                      Rate this product
                    </button>
                  );
                })()}
              </div>
            </div>
          );
        })}
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
                className="inline-flex h-[52px] min-w-[220px] items-center justify-center rounded-[12px] border-2 border-red-500 px-8 text-[15px] font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cancelling ? "Cancelling…" : "Cancel Order"}
              </button>
            </div>
          )}

          {/* Desktop-only Need Help — fills the left column whitespace next to
              the Delivery + Order Summary. Mobile uses the full-width block below. */}
          <div className="hidden lg:block">
            <h3 className="text-[15px] font-bold text-ink mb-3">Need Help</h3>
            <div className="flex flex-col gap-2 text-[13px] text-[#525151]">
              <Link href="/faq#order-issues" className="inline-flex items-center gap-1.5 hover:text-ink">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Order Issues
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
              </Link>
              <Link href="/faq#delivery-info" className="inline-flex items-center gap-1.5 hover:text-ink">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                Delivery Info
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
              </Link>
              <Link href="/faq#returns" className="inline-flex items-center gap-1.5 hover:text-ink">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                Returns
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
              </Link>
            </div>
          </div>
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

      {/* Need Help — mobile / tablet only. On desktop it lives inside the
          left column above to fill the whitespace next to the order summary. */}
      <div className="mt-10 pt-6 border-t border-[#eee] lg:hidden">
        <h3 className="text-[15px] font-bold text-ink mb-3">Need Help</h3>
        <div className="flex flex-col gap-2 text-[13px] text-[#525151]">
          <Link href="/faq#order-issues" className="inline-flex items-center gap-1.5 hover:text-ink">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Order Issues
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
          </Link>
          <Link href="/faq#delivery-info" className="inline-flex items-center gap-1.5 hover:text-ink">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Delivery Info
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
          </Link>
          <Link href="/faq#returns" className="inline-flex items-center gap-1.5 hover:text-ink">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Returns
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
          </Link>
        </div>
      </div>
      </div>

      <RateProductModal
        open={rateOpen}
        productId={rateTarget?.productId ?? null}
        orderItemId={rateTarget?.orderItemId ?? null}
        productName={rateTarget?.name}
        initialRating={rateTarget?.rating ?? 0}
        initialComment={rateTarget?.comment ?? ""}
        onClose={() => setRateOpen(false)}
        onSaved={(rating, comment) => {
          if (rateTarget) {
            setMyRatings((prev) => ({ ...prev, [rateTarget.orderItemId]: { rating, comment } }));
          }
        }}
      />

      <TrackReturnModal
        open={trackOpen}
        orderId={order.id}
        request={trackTarget?.request ?? null}
        itemName={trackTarget?.name}
        onClose={() => setTrackOpen(false)}
        onCancelled={() => {
          // Buyer just backed out — drop the row so the Return/Exchange button
          // re-appears on that line.
          if (trackTarget) {
            setReturnRequests((prev) => {
              const next = { ...prev };
              delete next[trackTarget.request.order_item_id];
              return next;
            });
          }
        }}
      />

      <ReturnRequestModal
        open={returnOpen}
        orderId={order.id}
        items={
          isDelivered
            ? order.items
                .filter((it) => !returnRequests[it.id])
                .map((it) => ({
                  id: it.id,
                  product_id: it.product_id,
                  product_name: it.product_name,
                  product_image: resolveImg(it.product_image),
                  size: it.size,
                  color: it.color,
                  quantity: it.quantity,
                  sub_total: it.sub_total,
                  refund_allowed: it.is_returnable == null ? true : Number(it.is_returnable) === 1,
                }))
            : []
        }
        onClose={() => setReturnOpen(false)}
        onSubmitted={() => {
          // Refetch the user's return requests so the badge appears immediately.
          fetch(`${API}/api/v1/orders/${order.id}/returns`, { credentials: "include", cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
              const rows: ReturnRequestRow[] = Array.isArray(j?.data?.rows) ? j.data.rows : [];
              const map: Record<number, ReturnRequestRow> = {};
              for (const r of rows) map[r.order_item_id] = r;
              setReturnRequests(map);
            })
            .catch(() => {});
        }}
      />
    </div>
  );
}
