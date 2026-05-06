"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "../components/icons";
import ProductImage from "../components/ProductImage";
import { imgUrl } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const PLACEHOLDER_IMG = "/product-placeholder.svg";

type OrderRow = {
  id: number;
  total: string | number;
  final_total: string | number;
  status: string;
  payment_method: string;
  date_added: string;
  items_count: number;
  thumbnails?: string[];
};

const STATUS_STYLES: Record<string, string> = {
  awaiting: "bg-amber-50 text-amber-700",
  received: "bg-blue-50 text-blue-700",
  processed: "bg-indigo-50 text-indigo-700",
  shipped: "bg-violet-50 text-violet-700",
  out_for_delivery: "bg-orange-50 text-orange-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
  returned: "bg-slate-100 text-slate-700",
};

const STATUS_DOT: Record<string, string> = {
  awaiting: "bg-amber-500",
  received: "bg-blue-500",
  processed: "bg-indigo-500",
  shipped: "bg-violet-500",
  out_for_delivery: "bg-orange-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
  returned: "bg-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  awaiting: "Awaiting confirmation",
  received: "Order received",
  processed: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

const ACTIVE_STATUSES = new Set(["awaiting", "received", "processed", "shipped", "out_for_delivery"]);

type Tab = "all" | "active" | "delivered" | "cancelled";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

function fmt(n: number | string) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function formatDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function resolveImg(path: string | undefined): string {
  if (!path) return PLACEHOLDER_IMG;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

function inTab(status: string, tab: Tab): boolean {
  const k = (status || "").toLowerCase();
  if (tab === "all") return true;
  if (tab === "active") return ACTIVE_STATUSES.has(k);
  if (tab === "delivered") return k === "delivered";
  if (tab === "cancelled") return k === "cancelled" || k === "returned";
  return true;
}

const PER_PAGE = 10;

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${API}/api/v1/orders`, { credentials: "include" })
      .then(async (r) => {
        if (r.status === 401) { router.push("/"); return null; }
        return r.json();
      })
      .then((j) => {
        if (!j) return;
        if (j.error) { setError(j.message || "Failed to load orders."); setOrders([]); return; }
        setOrders(j.data?.rows ?? []);
      })
      .catch(() => { setError("Network error. Please try again."); setOrders([]); });
  }, [router]);

  const counts = useMemo(() => {
    const c = { all: 0, active: 0, delivered: 0, cancelled: 0 };
    (orders || []).forEach((o) => {
      const k = (o.status || "").toLowerCase();
      c.all += 1;
      if (ACTIVE_STATUSES.has(k)) c.active += 1;
      else if (k === "delivered") c.delivered += 1;
      else if (k === "cancelled" || k === "returned") c.cancelled += 1;
    });
    return c;
  }, [orders]);

  const filtered = useMemo(
    () => (orders || []).filter((o) => inTab(o.status, tab)),
    [orders, tab],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // Reset page when filters change so the user always lands on page 1.
  useEffect(() => { setPage(1); }, [tab]);

  if (orders === null) {
    return (
      <div className="w-full bg-white min-h-screen">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8 flex items-center justify-center">
          <p className="text-[14px] text-[#8c8c8c]">Loading your orders…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-8 md:py-10">
        {/* Breadcrumbs */}
        <nav className="text-[13px] text-[#8c8c8c] mb-3">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span className="mx-1.5">›</span>
          <span className="text-ink">My Orders</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-1 mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[26px] font-bold text-ink md:text-[30px]">My Orders</h1>
            <p className="mt-0.5 text-[13px] text-[#525151]">Track and manage your purchases</p>
          </div>
          {counts.all > 0 && (
            <div className="flex items-center gap-4 text-[12px] text-[#525151]">
              <span><span className="font-bold text-ink">{counts.all}</span> total</span>
              {counts.active > 0 && <span><span className="font-bold text-orange-600">{counts.active}</span> in progress</span>}
              {counts.delivered > 0 && <span><span className="font-bold text-green-600">{counts.delivered}</span> delivered</span>}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-5 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center rounded-[16px] border border-dashed border-[#e7e7e7] bg-[#fafafa]">
            <div className="text-[64px] leading-none">📦</div>
            <h2 className="text-[20px] font-bold text-ink">No orders yet</h2>
            <p className="text-[13px] text-[#8c8c8c] max-w-[320px]">
              When you place an order, it&apos;ll show up here so you can track delivery and reorder anytime.
            </p>
            <Link href="/" className="mt-2 inline-flex h-[44px] items-center justify-center rounded-full bg-ink px-7 text-[13px] font-bold text-white hover:bg-black">
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="mb-5 flex gap-1 rounded-full bg-[#f3f3f5] p-1 w-fit overflow-x-auto">
              {TABS.map((t) => {
                const n = counts[t.id];
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`inline-flex h-[34px] items-center gap-1.5 rounded-full px-4 text-[12px] font-semibold transition-all whitespace-nowrap ${active ? "bg-white text-ink shadow-sm" : "text-[#525151] hover:text-ink"}`}
                  >
                    {t.label}
                    {n > 0 && (
                      <span className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-brand-purple text-white" : "bg-[#e0e0e0] text-[#525151]"}`}>
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center rounded-[14px] border border-dashed border-[#e7e7e7]">
                <div className="text-[44px]">🧐</div>
                <p className="text-[14px] font-semibold text-ink">No {tab === "all" ? "" : tab} orders</p>
                <p className="text-[12px] text-[#8c8c8c]">Try a different filter.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {paginated.map((o) => {
                  const statusKey = (o.status || "").toLowerCase();
                  const statusLabel = STATUS_LABEL[statusKey] || o.status;
                  const statusClass = STATUS_STYLES[statusKey] || "bg-slate-100 text-slate-700";
                  const dotClass = STATUS_DOT[statusKey] || "bg-slate-500";
                  const thumbs = (o.thumbnails || []).slice(0, 3);
                  const extra = Math.max(0, Number(o.items_count) - thumbs.length);
                  return (
                    <Link
                      key={o.id}
                      href={`/orders/${o.id}`}
                      className="group flex flex-col gap-4 rounded-[14px] border border-[#ececec] bg-white p-4 hover:border-ink hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all sm:flex-row sm:items-center sm:p-5"
                    >
                      {/* Thumbnails */}
                      <div className="flex -space-x-3 shrink-0">
                        {thumbs.length === 0 ? (
                          <div className="h-[60px] w-[60px] rounded-[12px] border border-[#e7e7e7] bg-[#f9f9f9] flex items-center justify-center text-[20px]">📦</div>
                        ) : (
                          thumbs.map((src, i) => (
                            <div
                              key={i}
                              className="h-[60px] w-[60px] rounded-[12px] border-2 border-white bg-[#f9f9f9] ring-1 ring-[#e7e7e7] overflow-hidden flex items-center justify-center"
                            >
                              <ProductImage src={resolveImg(src)} alt="" className="h-full w-full object-contain p-1" />
                            </div>
                          ))
                        )}
                        {extra > 0 && (
                          <div className="h-[60px] w-[60px] rounded-[12px] border-2 border-white bg-[#f3eaf7] ring-1 ring-[#e7e7e7] flex items-center justify-center text-[12px] font-bold text-brand-purple">
                            +{extra}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-1 flex-col gap-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-bold text-ink">Order #{o.id}</span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[#878787]">
                          <span>{formatDate(o.date_added)}</span>
                          <span>·</span>
                          <span>{o.items_count} {Number(o.items_count) === 1 ? "item" : "items"}</span>
                          <span>·</span>
                          <span className="uppercase tracking-wide">{o.payment_method || "—"}</span>
                        </div>
                      </div>

                      {/* Total + chevron */}
                      <div className="flex items-center justify-between gap-3 sm:gap-5 sm:justify-end">
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wide text-[#a3a3a3] font-semibold">Total</div>
                          <div className="text-[18px] font-bold text-ink">{fmt(o.final_total ?? o.total)}</div>
                        </div>
                        <span className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#f6f6f8] text-[#525151] group-hover:bg-ink group-hover:text-white transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {filtered.length > PER_PAGE && (
              <div className="mt-6 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-[#e7e7e7] bg-white px-4 text-[12.5px] font-semibold text-[#525151] hover:border-ink hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                  const active = n === safePage;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[12.5px] font-semibold transition-colors ${active ? "bg-ink text-white" : "border border-[#e7e7e7] bg-white text-[#525151] hover:border-ink hover:text-ink"}`}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-[#e7e7e7] bg-white px-4 text-[12.5px] font-semibold text-[#525151] hover:border-ink hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
