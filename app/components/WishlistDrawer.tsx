"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { imgUrl } from "@/lib/api";
import { useWishlist } from "@/lib/wishlistContext";
import ProductImage from "./ProductImage";
import QuickAddModal from "./QuickAddModal";
import { HeartFill, Trash2 } from "./icons";

const PLACEHOLDER_IMG = "/product-placeholder.svg";

function fmt(n: number) {
  return n ? `₹${n.toLocaleString("en-IN")}` : "—";
}

function resolveImg(path: string) {
  if (!path) return PLACEHOLDER_IMG;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

export default function WishlistDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, remove } = useWishlist();
  const [quickAddId, setQuickAddId] = useState<number | null>(null);

  // Lock body scroll while drawer is open and close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function openQuickAdd(item: typeof items[number]) {
    setQuickAddId(item.id);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[100] bg-black/45 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Wishlist"
        className={`fixed right-0 top-0 z-[101] flex h-full w-full max-w-[440px] flex-col bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eee] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <HeartFill className="h-5 w-5 text-[#D90A0A]" />
            <h2 className="text-[18px] font-bold text-ink">Wishlist</h2>
            {items.length > 0 && (
              <span className="text-[13px] text-[#878787]">({items.length})</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#525151] hover:bg-[#f5f5f5]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#f5f5f5] text-[#cfcfcf] mb-4">
              <HeartFill className="h-10 w-10" />
            </div>
            <p className="text-[15px] text-[#878787]">Your wishlist is empty</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 inline-flex h-[40px] items-center justify-center rounded-[6px] bg-ink-soft px-5 text-[12.5px] font-bold text-white hover:bg-black"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-[12px] border border-[#eee] bg-white p-3 hover:border-[#cfcfcf] transition-colors"
                >
                  <Link
                    href={`/product/${item.id}`}
                    onClick={onClose}
                    className="h-[80px] w-[80px] shrink-0 overflow-hidden rounded-[10px] bg-[#f9f9f9] flex items-center justify-center"
                  >
                    <ProductImage src={resolveImg(item.image)} alt={item.name} className="h-full w-full object-contain p-1" />
                  </Link>
                  <div className="flex flex-1 min-w-0 flex-col">
                    <Link
                      href={`/product/${item.id}`}
                      onClick={onClose}
                      className="text-[13px] font-medium text-ink line-clamp-2 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <span className="mt-0.5 text-[14px] font-bold text-ink">{fmt(item.price)}</span>
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => openQuickAdd(item)}
                        className="flex-1 inline-flex h-[34px] items-center justify-center rounded-[8px] bg-ink-soft px-3 text-[12px] font-bold text-white hover:bg-black"
                      >
                        Move to Cart
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        aria-label="Remove from wishlist"
                        className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] text-[#878787] hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      <QuickAddModal
        productId={quickAddId}
        open={quickAddId !== null}
        onClose={() => setQuickAddId(null)}
        onAdded={() => {
          if (quickAddId !== null) remove(quickAddId);
        }}
      />
    </>
  );
}
