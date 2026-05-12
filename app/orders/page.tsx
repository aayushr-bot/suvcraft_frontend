"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductImage from "../components/ProductImage";
import { imgUrl } from "@/lib/api";
import { useCart } from "@/lib/cartContext";

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

const STATUS_BADGE: Record<string, string> = {
  awaiting: "bg-amber-50 text-amber-700",
  received: "bg-blue-50 text-blue-700",
  processed: "bg-indigo-50 text-indigo-700",
  shipped: "bg-violet-50 text-violet-700",
  out_for_delivery: "bg-orange-50 text-orange-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
  returned: "bg-slate-100 text-slate-700",
};

const STATUS_LABEL: Record<string, string> = {
  awaiting: "Awaiting",
  received: "Received",
  processed: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

function fmt(n: number | string) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function formatDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function resolveImg(path: string | undefined): string {
  if (!path) return PLACEHOLDER_IMG;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

export default function OrdersPage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState("");
  const [reorderingId, setReorderingId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "total-high" | "total-low">("newest");
  const [page, setPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const PER_PAGE = 5;

  async function buyAgain(orderId: number) {
    setReorderingId(orderId);
    try {
      const res = await fetch(`${API}/api/v1/orders/${orderId}`, { credentials: "include" });
      const j = await res.json();
      const items: Array<{
        product_id?: number;
        product_variant_id?: number;
        product_name?: string;
        product_image?: string;
        price?: number | string;
        quantity?: number;
        size?: string;
        color?: { name: string; swatch?: string };
      }> = j?.data?.order?.items || [];
      let added = 0;
      for (const it of items) {
        const pid = Number(it.product_id);
        if (!pid) continue;
        addToCart(
          {
            id: pid,
            name: String(it.product_name || ""),
            image: String(it.product_image || ""),
            price: Number(it.price) || 0,
            variant_id: Number(it.product_variant_id) || undefined,
            size: it.size,
            color: it.color,
          },
          Math.max(1, Number(it.quantity) || 1),
        );
        added += 1;
      }
      if (added > 0) router.push("/cart");
    } catch {
      // silently swallow — user can try again
    } finally {
      setReorderingId(null);
    }
  }

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

  const filtered = useMemo(() => {
    let list = (orders || []).slice();
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => String(o.id).toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      list = list.filter((o) => (o.status || "").toLowerCase() === statusFilter);
    }
    if (paymentFilter !== "all") {
      list = list.filter((o) => (o.payment_method || "").toLowerCase() === paymentFilter);
    }
    switch (sortBy) {
      case "newest":
        list.sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime());
        break;
      case "oldest":
        list.sort((a, b) => new Date(a.date_added).getTime() - new Date(b.date_added).getTime());
        break;
      case "total-high":
        list.sort((a, b) => Number(b.final_total ?? b.total) - Number(a.final_total ?? a.total));
        break;
      case "total-low":
        list.sort((a, b) => Number(a.final_total ?? a.total) - Number(b.final_total ?? b.total));
        break;
    }
    return list;
  }, [orders, searchQuery, statusFilter, paymentFilter, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setSortBy("newest");
    setPage(1);
  };

  // Reset page whenever filters / sort change.
  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, paymentFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  if (orders === null) {
    return (
      <div className="w-full bg-white min-h-screen">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-20 md:px-8 flex items-center justify-center">
          <p className="text-[14px] text-[#8c8c8c]">Loading your orders…</p>
        </div>
      </div>
    );
  }

  const filterBody = (
    <>
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <h2 className="text-[15px] font-bold text-ink">Filter</h2>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-ink mb-1.5">Search by order number</label>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8c8c8c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Order"
            className="w-full h-[40px] rounded-[8px] border border-[#e7e7e7] bg-white pl-9 pr-3 text-[13px] text-ink placeholder:text-[#8c8c8c] focus:outline-none focus:border-ink"
          />
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-ink mb-1.5">Order status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full h-[40px] rounded-[8px] border border-[#e7e7e7] bg-white px-3 text-[13px] text-ink focus:outline-none focus:border-ink cursor-pointer"
        >
          <option value="all">Order Status (All)</option>
          <option value="awaiting">Awaiting</option>
          <option value="received">Received</option>
          <option value="processed">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="out_for_delivery">Out for delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-ink mb-1.5">Payment status</label>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="w-full h-[40px] rounded-[8px] border border-[#e7e7e7] bg-white px-3 text-[13px] text-ink focus:outline-none focus:border-ink cursor-pointer"
        >
          <option value="all">Payment Status (All)</option>
          <option value="cod">Cash on Delivery</option>
          <option value="online">Online</option>
          <option value="wallet">Wallet</option>
        </select>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-ink mb-1.5">Sort By</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="w-full h-[40px] rounded-[8px] border border-[#e7e7e7] bg-white px-3 text-[13px] text-ink focus:outline-none focus:border-ink cursor-pointer"
        >
          <option value="newest">Newest (Default)</option>
          <option value="oldest">Oldest</option>
          <option value="total-high">Total: High to Low</option>
          <option value="total-low">Total: Low to High</option>
        </select>
      </div>

      <button
        type="button"
        onClick={clearFilters}
        className="h-[40px] rounded-[8px] bg-[#f3f3f5] text-[12px] font-bold uppercase tracking-wide text-[#8c8c8c] hover:bg-[#e7e7e7] hover:text-ink transition-colors"
      >
        Clear Filters
      </button>
    </>
  );

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
        <nav className="text-[13px] text-[#8c8c8c] mb-3">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span className="mx-1.5">›</span>
          <span className="text-ink">My Orders</span>
        </nav>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold text-ink md:text-[30px]">My Orders</h1>
            <p className="mt-0.5 text-[13px] text-[#525151]">Track and manage your purchases.</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            aria-label="Open filters"
            className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#e7e7e7] bg-white text-ink"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
          {/* Filter sidebar — desktop only */}
          <aside className="hidden lg:flex rounded-[12px] border border-[#e7e7e7] bg-white p-5 flex-col gap-4 h-fit">
            {filterBody}
          </aside>

          {/* Orders list */}
          <div>
            {(orders || []).length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center rounded-[12px] border border-[#e7e7e7] bg-white">
                <div className="text-[64px] leading-none">📦</div>
                <h2 className="text-[20px] font-bold text-ink">No orders yet</h2>
                <p className="text-[13px] text-[#8c8c8c] max-w-[320px]">
                  When you place an order, it&apos;ll show up here so you can track delivery and reorder anytime.
                </p>
                <Link href="/" className="mt-2 inline-flex h-[44px] items-center justify-center rounded-full bg-ink px-7 text-[13px] font-bold text-white hover:bg-black">
                  Start shopping
                </Link>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center rounded-[12px] border border-[#e7e7e7] bg-white">
                <div className="text-[44px]">🧐</div>
                <p className="text-[14px] font-semibold text-ink">No orders match these filters</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-1 text-[12px] font-semibold text-brand-purple hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {paginated.map((o) => {
                  const statusKey = (o.status || "").toLowerCase();
                  const statusLabel = STATUS_LABEL[statusKey] || o.status;
                  const statusClass = STATUS_BADGE[statusKey] || "bg-slate-100 text-slate-700";
                  const thumbs = (o.thumbnails || []).slice(0, 3);
                  return (
                    <div
                      key={o.id}
                      className="rounded-[12px] border border-[#e7e7e7] bg-white p-5"
                    >
                      <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-[#8c8c8c]">Order</span>
                          <span className="text-[13px] font-semibold text-ink">#{o.id}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] text-[#8c8c8c]">Created date</span>
                          <span className="text-[13px] font-medium text-ink">{formatDate(o.date_added)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] text-[#8c8c8c]">Payment method</span>
                          <span className="text-[13px] font-medium text-ink uppercase">{o.payment_method || "—"}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] text-[#8c8c8c]">Order status</span>
                          <span className={`mt-0.5 inline-flex w-fit items-center rounded-[6px] px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="ml-auto flex flex-col items-end">
                          <span className="text-[11px] text-[#8c8c8c]">Order total</span>
                          <span className="text-[16px] font-bold text-ink">{fmt(o.final_total ?? o.total)}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex -space-x-2">
                          {thumbs.length === 0 ? (
                            <div className="h-[48px] w-[48px] rounded-[8px] border border-[#e7e7e7] bg-[#f9f9f9] flex items-center justify-center text-[18px]">📦</div>
                          ) : (
                            thumbs.map((src, i) => (
                              <div
                                key={i}
                                className="h-[48px] w-[48px] rounded-[8px] border-2 border-white bg-[#f9f9f9] ring-1 ring-[#e7e7e7] overflow-hidden flex items-center justify-center"
                              >
                                <ProductImage src={resolveImg(src)} alt="" className="h-full w-full object-contain p-1" />
                              </div>
                            ))
                          )}
                          {Number(o.items_count) > thumbs.length && (
                            <div className="h-[48px] w-[48px] rounded-[8px] border-2 border-white bg-[#f3eaf7] ring-1 ring-[#e7e7e7] flex items-center justify-center text-[11px] font-bold text-brand-purple">
                              +{Number(o.items_count) - thumbs.length}
                            </div>
                          )}
                        </div>

                        {/* Action buttons:
                            - In-progress (awaiting → out_for_delivery): Track Order + Order Details
                            - Delivered / Cancelled: Order Details + Buy Again
                            Tracking is hidden on finished orders since there's no progress left to show. */}
                        <div className="flex items-center gap-2.5">
                          {statusKey === "delivered" || statusKey === "cancelled" ? (
                            <>
                              <Link
                                href={`/orders/${o.id}`}
                                className="inline-flex h-[40px] w-[180px] items-center justify-center rounded-[10px] border border-ink px-4 text-[12px] font-bold uppercase tracking-wide text-ink hover:bg-ink hover:text-white transition-colors"
                              >
                                Order Details
                              </Link>
                              <button
                                type="button"
                                onClick={() => buyAgain(o.id)}
                                disabled={reorderingId === o.id}
                                className="inline-flex h-[40px] w-[180px] items-center justify-center rounded-[10px] bg-ink-soft px-4 text-[12px] font-bold uppercase tracking-wide text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {reorderingId === o.id ? "Adding…" : "Buy Again"}
                              </button>
                            </>
                          ) : (
                            <>
                              <Link
                                href={`/orders/${o.id}/track`}
                                className="inline-flex h-[40px] w-[180px] items-center justify-center gap-1.5 rounded-[10px] border border-ink px-4 text-[12px] font-bold uppercase tracking-wide text-ink hover:bg-ink hover:text-white transition-colors"
                              >
                                Track Order
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                              </Link>
                              <Link
                                href={`/orders/${o.id}`}
                                className="inline-flex h-[40px] w-[180px] items-center justify-center rounded-[10px] bg-ink-soft px-4 text-[12px] font-bold uppercase tracking-wide text-white hover:bg-black"
                              >
                                Order Details
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filtered.length > PER_PAGE && (
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[#e7e7e7] bg-white px-4 text-[12.5px] font-semibold text-[#525151] hover:border-ink hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-[12.5px] font-semibold transition-colors ${active ? "bg-ink text-white" : "border border-[#e7e7e7] bg-white text-[#525151] hover:border-ink hover:text-ink"}`}
                        >
                          {n}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[#e7e7e7] bg-white px-4 text-[12.5px] font-semibold text-[#525151] hover:border-ink hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFilterOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-[100] bg-black/40"
            onClick={() => setMobileFilterOpen(false)}
          />
          <aside className="lg:hidden fixed right-0 top-0 z-[101] flex h-full w-[88%] max-w-[360px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eee] px-5 py-4">
              <h2 className="text-[16px] font-bold text-ink">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#525151] hover:bg-[#f5f5f5]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {filterBody}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
