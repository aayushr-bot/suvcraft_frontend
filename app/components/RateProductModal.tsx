"use client";

import { useEffect, useRef, useState } from "react";
import { imgUrl } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type MediaAttachment = { url: string; type: "image" | "video" };

// The upload endpoint returns paths like "/uploads/reviews/2026/..." which
// resolve against the storefront origin in the browser. On prod the API and
// storefront sit on different subdomains, so we have to rewrite the path to
// hit NEXT_PUBLIC_UPLOADS_URL (same helper every other surface uses).
function resolveMedia(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

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
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset form whenever a different product or different initial values come in.
  useEffect(() => {
    if (open) {
      setRating(initialRating);
      setComment(initialComment);
      setMedia([]);
      setHover(0);
      setError("");
      setBusy(false);
      setUploading(false);
    }
  }, [open, initialRating, initialComment, productId]);

  if (!open || !productId) return null;

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    setError("");
    try {
      const uploads: MediaAttachment[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${API}/api/v1/uploads/review-media`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j?.error) {
          setError(j?.message || `Failed to upload ${file.name}.`);
          continue;
        }
        if (j?.data?.url && j?.data?.type) {
          uploads.push({ url: j.data.url, type: j.data.type });
        }
      }
      if (uploads.length) setMedia((prev) => [...prev, ...uploads].slice(0, 6));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeMedia(url: string) {
    setMedia((prev) => prev.filter((m) => m.url !== url));
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!rating) { setError("Pick a star rating from 1 to 5."); return; }
    if (uploading) { setError("Wait for uploads to finish."); return; }
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
          // Stored as a JSON array of {url, type} in product_rating.images.
          images: JSON.stringify(media),
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

          {/* Media attachments — photos / short videos */}
          <div>
            <label className="block text-[12.5px] font-semibold text-ink mb-1.5">
              Add photos or videos <span className="font-normal text-[#8c8c8c]">(optional · max 6)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-2">
              {media.map((m) => (
                <div
                  key={m.url}
                  className="relative h-[72px] w-[72px] rounded-[8px] overflow-hidden border border-[#e7e7e7] bg-[#f6f6f8]"
                >
                  {m.type === "image" ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={resolveMedia(m.url)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="relative h-full w-full">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video src={resolveMedia(m.url)} className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center text-white">
                        <svg className="h-7 w-7 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(m.url)}
                    aria-label="Remove"
                    className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {media.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-[72px] w-[72px] flex-col items-center justify-center gap-1 rounded-[8px] border-2 border-dashed border-[#d4d4d4] bg-white text-[#8c8c8c] hover:border-ink hover:text-ink transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <span className="text-[10px] font-semibold">Uploading…</span>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span className="text-[10.5px] font-semibold leading-none">Add</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[10.5px] text-[#a3a3a3]">JPG/PNG/WebP up to 8MB · MP4/WebM up to 50MB</p>
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
