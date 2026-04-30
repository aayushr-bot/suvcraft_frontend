"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "../components/icons";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type OrderRow = {
  id: number;
  total: string | number;
  final_total: string | number;
  status: string;
  payment_method: string;
  date_added: string;
  items_count: number;
};

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

function fmt(n: number | string) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function formatDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState("");

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

  if (orders === null) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8 min-h-screen bg-white flex items-center justify-center">
        <p className="text-[14px] text-[#8c8c8c]">Loading your orders…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8 min-h-screen bg-white">
      <div className="mb-8">
        <nav className="text-[13px] text-[#8c8c8c] mb-2">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span className="mx-1.5">›</span>
          <span className="text-ink">My Orders</span>
        </nav>
        <h1 className="text-[28px] font-bold text-ink md:text-[32px]">My Orders</h1>
        <p className="mt-1 text-[14px] text-[#525151]">Track and manage your past orders</p>
      </div>

      {error && (
        <div className="mb-6 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center rounded-[16px] border border-dashed border-[#e7e7e7]">
          <div className="text-[60px]">📦</div>
          <h2 className="text-[20px] font-bold text-ink">No orders yet</h2>
          <p className="text-[14px] text-[#8c8c8c]">When you place an order, it'll show up here.</p>
          <Link href="/" className="inline-flex h-[48px] items-center justify-center rounded-[10px] bg-ink px-8 text-[14px] font-bold text-white hover:bg-black">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((o) => {
            const statusKey = (o.status || "").toLowerCase();
            const statusLabel = STATUS_LABEL[statusKey] || o.status;
            const statusClass = STATUS_STYLES[statusKey] || "bg-slate-100 text-slate-700 border-slate-300";
            return (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex flex-col gap-3 rounded-[14px] border border-[#e7e7e7] bg-white p-5 hover:border-ink hover:shadow-sm transition-all sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[15px] font-bold text-ink">Order #{o.id}</span>
                    <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#525151]">
                    <span>Placed on {formatDate(o.date_added)}</span>
                    <span className="text-[#cfcfcf]">•</span>
                    <span>{o.items_count} {Number(o.items_count) === 1 ? "item" : "items"}</span>
                    <span className="text-[#cfcfcf]">•</span>
                    <span className="uppercase tracking-wide">{o.payment_method || "—"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:gap-6">
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-wide text-[#878787] font-semibold">Total</div>
                    <div className="text-[18px] font-bold text-ink">{fmt(o.final_total ?? o.total)}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#cfcfcf]" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
