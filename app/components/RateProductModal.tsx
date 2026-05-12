"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export default function RateProductModal({
  open,
  productId,
  orderItemId,
  productName,
  initialRating = 0,
  initialComment = "",
  onClose,
  onSaved,
}: {
  open: boolean;
  productId: number | null;
  orderItemId?: number | null;
  productName?: string;
  initialRating?: number;
  initialComment?: string;
  onClose: () => void;
  onSaved?: (rating: number, comment: string) => void;
}) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Reset form whenever a different product or different initial values come in.
  useEffect(() => {
    if (open) {
      setRating(initialRating);
      setComment(initialComment);
      setHover(0);
      setError("");
      setBusy(false);
    }
  }, [open, initialRating, initialComment, productId]);

  if (!open || !productId) return null;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!rating) { setError("Pick a star rating from 1 to 5."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/products/${productId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rating,
          comment,
          // Scope this rating to the specific order line, so the same product
          // across multiple line items can have independent reviews.
          order_item_id: orderItemId ?? undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) {
        setError(j?.message || "Could not save your review.");
        setBusy(false);
        return;
      }
      onSaved?.(rating, comment);
      onClose();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4" onClick={() => !busy && onClose()}>
      <div
        className="w-full max-w-[480px] rounded-[14px] bg-white shadow-2xl border border-[#e7e7e7]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#eee] flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold text-ink">
              {initialRating > 0 ? "Update your review" : "Rate this product"}
            </h2>
            {productName && (
              <p className="text-[12.5px] text-[#878787] mt-0.5 line-clamp-1">{productName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#525151] hover:bg-[#f5f5f5]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 flex flex-col gap-4">
          {/* Star picker */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => { setRating(n); setError(""); }}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <svg viewBox="0 0 24 24" className={`h-9 w-9 ${active ? "text-[#F5A524]" : "text-[#e0e0e0]"}`} fill="currentColor">
                      <path d="M12 2l2.4 5.4L20 8.3l-4 3.9.9 5.5L12 15.1l-4.9 2.6.9-5.5-4-3.9 5.6-.9L12 2z" />
                    </svg>
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-[#8c8c8c]">
              {rating === 0 && "Tap to rate"}
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </p>
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-ink mb-1.5">
              Your review <span className="font-normal text-[#8c8c8c]">(optional)</span>
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              placeholder="What did you like or dislike about it?"
              className="w-full rounded-[10px] border border-[#d4d4d4] bg-white px-3 py-2.5 text-[13.5px] text-ink placeholder:text-[#a3a3a3] focus:outline-none focus:border-ink resize-y"
            />
            <div className="mt-1 text-right text-[11px] text-[#a3a3a3]">{comment.length} / 2000</div>
          </div>

          {error && (
            <p className="text-[12.5px] font-medium text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => !busy && onClose()}
              className="h-[42px] rounded-[10px] border border-[#d4d4d4] bg-white px-5 text-[13px] font-semibold text-ink hover:border-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-[42px] rounded-[10px] bg-ink px-6 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? "Saving…" : (initialRating > 0 ? "Update" : "Submit Review")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
