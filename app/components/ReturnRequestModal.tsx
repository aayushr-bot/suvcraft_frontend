"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { imgUrl } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type ReturnReason = { id: number; label: string; message?: string };
type MediaAttachment = { url: string; type: "image" | "video" };

// Rewrite "/uploads/..." paths to the configured uploads origin — see
// RateProductModal for the same pattern.
function resolveMedia(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

type SavedAddress = {
  id: number;
  name?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  type?: string;
  is_default?: number | boolean;
};

export type ReturnableItem = {
  id: number;
  /** Needed for the exchange variant picker. */
  product_id?: number;
  product_name: string;
  product_image?: string;
  size?: string;
  color?: { name: string; swatch?: string };
  quantity: number;
  sub_total: number | string;
  /** When 0/false, only `exchange` is allowed (no refund). Defaults to true. */
  refund_allowed?: boolean;
};

type ProductAttributeValue = {
  id: number;
  value: string;
  swatche_type?: number | string | null;
  swatche_value?: string | null;
};
type ProductAttribute = {
  id: number;
  name: string;
  values: ProductAttributeValue[];
};
type ProductVariant = {
  id: number;
  attribute_value_ids: number[];
  price: number;
  special_price: number;
  stock: number | null;
  status?: number;
};
type ExchangeProduct = {
  id: number;
  name?: string;
  attribute_options?: ProductAttribute[];
  variants?: ProductVariant[];
};

function fmtAddress(a: SavedAddress) {
  return [a.address, a.city, a.state, a.pincode].filter(Boolean).join(", ");
}

export default function ReturnRequestModal({
  open,
  orderId,
  items,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  orderId: number | null;
  /** Already-filtered list of items eligible for return/exchange. */
  items: ReturnableItem[];
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [requestType, setRequestType] = useState<"return" | "exchange">("return");
  const [reasons, setReasons] = useState<ReturnReason[]>([]);
  const [reasonId, setReasonId] = useState<number | "other" | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [refundMethod, setRefundMethod] = useState<"original" | "wallet">("original");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [pickupAddressId, setPickupAddressId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Exchange-only state: the product's attribute options + variant matrix
  // (loaded on demand when the user clicks Exchange), and the buyer's picked
  // attribute-value selection (one id per attribute).
  const [exchangeProduct, setExchangeProduct] = useState<ExchangeProduct | null>(null);
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantError, setVariantError] = useState("");
  const [attrPicks, setAttrPicks] = useState<Record<number, number>>({});
  // Admin can close the wallet method in payment settings — when off, hide the
  // Wallet refund choice so buyers can't pick a method we won't honor.
  const [walletEnabled, setWalletEnabled] = useState(true);

  useEffect(() => {
    if (!open) return;
    setStep("pick");
    setSelectedId(items.length === 1 ? items[0].id : null);
    setRequestType("return");
    setReasonId(null);
    setCustomReason("");
    setRemarks("");
    setMedia([]);
    setUploading(false);
    setRefundMethod("original");
    setPickupAddressId(null);
    setExchangeProduct(null);
    setAttrPicks({});
    setVariantError("");
    setVariantLoading(false);
    setError("");
    setBusy(false);

    fetch(`${API}/api/v1/return-reasons`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setReasons(Array.isArray(j?.data?.rows) ? j.data.rows : []))
      .catch(() => setReasons([]));

    fetch(`${API}/api/v1/addresses`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const rows: SavedAddress[] = Array.isArray(j?.data?.rows) ? j.data.rows : [];
        setAddresses(rows);
        const def = rows.find((a) => Number(a.is_default) === 1) || rows[0];
        if (def) setPickupAddressId(def.id);
      })
      .catch(() => setAddresses([]));

    // `wallet_method` is the admin toggle from payment settings — defaults to
    // ON when the row is missing so behaviour matches the storefront checkout.
    fetch(`${API}/api/v1/settings`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const flag = j?.data?.wallet_method;
        setWalletEnabled(flag == null ? true : Number(flag) === 1);
      })
      .catch(() => setWalletEnabled(true));
  }, [open, items]);

  // If the admin closed the wallet method while the modal was open and the
  // buyer had already picked Wallet, snap them back to Original.
  useEffect(() => {
    if (!walletEnabled && refundMethod === "wallet") setRefundMethod("original");
  }, [walletEnabled, refundMethod]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId),
    [items, selectedId],
  );
  const canRefund = selectedItem ? selectedItem.refund_allowed !== false : true;

  // Fetch the product's attribute options + variant list when we enter the
  // exchange branch. Cached on the modal — second click is free.
  useEffect(() => {
    if (!open) return;
    if (step !== "form") return;
    if (requestType !== "exchange") return;
    if (!selectedItem?.product_id) return;
    if (exchangeProduct?.id === selectedItem.product_id) return;

    let cancelled = false;
    setVariantLoading(true);
    setVariantError("");
    fetch(`${API}/api/v1/products/${selectedItem.product_id}?include_inactive=1`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        const p: ExchangeProduct | null = j?.data || j || null;
        if (!p) {
          setVariantError("Couldn't load the product's variants.");
          return;
        }
        setExchangeProduct(p);
        // Pre-select the buyer's current size / colour where possible — Flipkart
        // does this so they only have to change the dimension they're swapping.
        const picks: Record<number, number> = {};
        const opts = p.attribute_options || [];
        for (const a of opts) {
          const nm = a.name.toLowerCase();
          let match: ProductAttributeValue | undefined;
          if (nm.includes("color") || nm.includes("colour")) {
            const c = selectedItem.color?.name?.toLowerCase();
            if (c) match = a.values.find((v) => v.value.toLowerCase() === c);
          } else if (nm.includes("size")) {
            const s = selectedItem.size?.toLowerCase();
            if (s) match = a.values.find((v) => v.value.toLowerCase() === s);
          }
          if (match) picks[a.id] = match.id;
        }
        setAttrPicks(picks);
      })
      .catch(() => { if (!cancelled) setVariantError("Couldn't load the product's variants."); })
      .finally(() => { if (!cancelled) setVariantLoading(false); });
    return () => { cancelled = true; };
  }, [open, step, requestType, selectedItem, exchangeProduct?.id]);

  if (!open || !orderId) return null;

  // Resolve the picked attribute combo to a concrete variant. When the combo
  // doesn't match any variant we return null and disable submission.
  function resolveVariant(): ProductVariant | null {
    const p = exchangeProduct;
    if (!p || !p.variants?.length) return null;
    const opts = p.attribute_options || [];
    if (!opts.length) return null;
    // Need every attribute picked.
    for (const a of opts) {
      if (!attrPicks[a.id]) return null;
    }
    const wanted = new Set(opts.map((a) => attrPicks[a.id]));
    return (
      p.variants.find((v) => {
        if (v.attribute_value_ids.length !== wanted.size) return false;
        return v.attribute_value_ids.every((id) => wanted.has(id));
      }) || null
    );
  }
  const pickedVariant = requestType === "exchange" ? resolveVariant() : null;
  const sameAsOriginal = (() => {
    if (requestType !== "exchange") return false;
    if (!pickedVariant) return false;
    // Same as the buyer's original line — they're asking for a like-for-like
    // replacement (Flipkart allows this, eg. a defective unit).
    const original = exchangeProduct?.variants?.find((v) =>
      v.attribute_value_ids.every((id) => {
        const aid = (exchangeProduct?.attribute_options || []).find((a) =>
          a.values.some((vv) => vv.id === id),
        )?.id;
        if (!aid) return false;
        // Use the same matcher we used for pre-selection.
        const a = (exchangeProduct?.attribute_options || []).find((x) => x.id === aid)!;
        const nm = a.name.toLowerCase();
        if (nm.includes("color") || nm.includes("colour")) {
          const c = selectedItem?.color?.name?.toLowerCase();
          const v = a.values.find((vv) => vv.id === id);
          return !!v && !!c && v.value.toLowerCase() === c;
        }
        if (nm.includes("size")) {
          const s = selectedItem?.size?.toLowerCase();
          const v = a.values.find((vv) => vv.id === id);
          return !!v && !!s && v.value.toLowerCase() === s;
        }
        return false;
      }),
    );
    return original?.id === pickedVariant.id;
  })();

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

  function goNext() {
    if (!selectedId) {
      setError("Pick the item you want to return or exchange.");
      return;
    }
    const picked = items.find((i) => i.id === selectedId);
    if (picked && picked.refund_allowed === false) setRequestType("exchange");
    setError("");
    setStep("form");
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selectedId) return;
    let reasonLabel = "";
    if (reasonId === "other") {
      reasonLabel = customReason.trim();
    } else if (typeof reasonId === "number") {
      reasonLabel = reasons.find((r) => r.id === reasonId)?.label || "";
    }
    if (!reasonLabel) {
      setError(
        reasonId === "other"
          ? "Type your reason."
          : "Pick a reason — or choose Other to type your own.",
      );
      return;
    }
    if (uploading) { setError("Wait for uploads to finish."); return; }

    let requestedVariantId: number | null = null;
    if (requestType === "exchange") {
      const v = resolveVariant();
      if (!v) {
        setError("Pick the size/colour you want to exchange for.");
        return;
      }
      requestedVariantId = v.id;
    }

    setBusy(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        request_type: requestType,
        return_reason: reasonLabel,
        remarks: remarks.trim(),
        media,
      };
      if (requestType === "return") payload.refund_method = refundMethod;
      if (pickupAddressId) payload.pickup_address_id = pickupAddressId;
      if (requestedVariantId) payload.requested_variant_id = requestedVariantId;

      const res = await fetch(`${API}/api/v1/orders/${orderId}/items/${selectedId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) {
        setError(j?.message || "Could not submit your request.");
        setBusy(false);
        return;
      }
      onSubmitted?.();
      onClose();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4" onClick={() => !busy && onClose()}>
      <div
        className="w-full max-w-[560px] rounded-[14px] bg-white shadow-2xl border border-[#e7e7e7] max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#eee] flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold text-ink">
              {step === "pick" ? "Return or exchange — pick the item" : "Tell us why"}
            </h2>
            {step === "form" && selectedItem && (
              <p className="text-[12.5px] text-[#878787] mt-0.5 line-clamp-1">{selectedItem.product_name}</p>
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

        {step === "pick" && (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {items.length === 0 ? (
              <p className="text-[13px] text-[#525151]">No items in this order are eligible for return or exchange.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((it) => {
                  const selected = selectedId === it.id;
                  return (
                    <label
                      key={it.id}
                      className={`flex items-center gap-3 rounded-[10px] border p-3 cursor-pointer transition-colors ${selected ? "border-ink bg-[#fafafa]" : "border-[#e7e7e7] hover:border-[#cfcfcf]"}`}
                    >
                      <input
                        type="radio"
                        name="return-item"
                        checked={selected}
                        onChange={() => { setSelectedId(it.id); setError(""); }}
                        className="h-4 w-4 accent-ink"
                      />
                      <div className="h-[48px] w-[48px] shrink-0 rounded-[8px] bg-[#f6f6f8] flex items-center justify-center overflow-hidden">
                        {it.product_image && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={it.product_image} alt="" className="h-full w-full object-contain p-1" />
                        )}
                      </div>
                      <div className="flex flex-1 min-w-0 flex-col">
                        <span className="text-[13.5px] font-semibold text-ink line-clamp-1">{it.product_name}</span>
                        <span className="text-[11.5px] text-[#878787]">
                          {[it.color?.name, it.size].filter(Boolean).join(" · ")}
                          {it.color?.name || it.size ? " · " : ""}
                          Qty {it.quantity}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {error && step === "pick" && (
              <p className="mt-3 text-[12.5px] font-medium text-red-600">{error}</p>
            )}
          </div>
        )}

        {step === "form" && (
          <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => canRefund && setRequestType("return")}
                  disabled={!canRefund}
                  title={canRefund ? undefined : "This product is only eligible for exchange."}
                  className={`h-[44px] rounded-[10px] text-[13px] font-semibold transition-colors ${requestType === "return" ? "bg-ink text-white" : "bg-[#f5f5f5] text-ink hover:bg-[#eee]"} ${!canRefund ? "opacity-50 cursor-not-allowed hover:bg-[#f5f5f5]" : ""}`}
                >
                  Return for refund
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType("exchange")}
                  className={`h-[44px] rounded-[10px] text-[13px] font-semibold transition-colors ${requestType === "exchange" ? "bg-ink text-white" : "bg-[#f5f5f5] text-ink hover:bg-[#eee]"}`}
                >
                  Exchange
                </button>
              </div>
              {!canRefund && (
                <p className="mt-2 text-[11.5px] text-[#B42318]">
                  This product is marked <span className="font-semibold">No return</span> — only exchange is allowed.
                </p>
              )}
            </div>

            {/* Variant picker — only rendered for Exchange. Mirrors Flipkart:
                pre-fills the buyer's original size/colour so they only have to
                change the dimension they want swapped. */}
            {requestType === "exchange" && (
              <div>
                <label className="block text-[12.5px] font-semibold text-ink mb-1.5">
                  Choose replacement
                </label>
                {variantLoading ? (
                  <div className="rounded-[10px] border border-[#e7e7e7] bg-[#fafafa] px-3 py-3 text-[12.5px] text-[#525151]">
                    Loading available sizes &amp; colours…
                  </div>
                ) : variantError ? (
                  <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-3 text-[12.5px] text-red-700">
                    {variantError}
                  </div>
                ) : exchangeProduct && exchangeProduct.attribute_options?.length ? (
                  <div className="flex flex-col gap-3 rounded-[10px] border border-[#e7e7e7] bg-white p-3">
                    {exchangeProduct.attribute_options.map((attr) => {
                      const isColor =
                        attr.name.toLowerCase().includes("color") ||
                        attr.name.toLowerCase().includes("colour");
                      return (
                        <div key={attr.id}>
                          <div className="text-[11.5px] uppercase tracking-[0.12em] text-[#8c8c8c] mb-1.5">
                            {attr.name}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {attr.values.map((v) => {
                              const picked = attrPicks[attr.id] === v.id;
                              const swatch =
                                isColor && v.swatche_value && /^#[0-9a-fA-F]{3,8}$/.test(v.swatche_value)
                                  ? v.swatche_value
                                  : null;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    setAttrPicks((prev) => ({ ...prev, [attr.id]: v.id }));
                                    setError("");
                                  }}
                                  className={`inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors ${picked ? "border-ink bg-ink text-white" : "border-[#d4d4d4] bg-white text-ink hover:border-ink"}`}
                                >
                                  {swatch && (
                                    <span
                                      className={`h-3.5 w-3.5 rounded-full border ${picked ? "border-white/70" : "border-[#d4d4d4]"}`}
                                      style={{ backgroundColor: swatch }}
                                    />
                                  )}
                                  {v.value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {pickedVariant ? (
                      <div className={`rounded-[8px] border px-3 py-2 text-[11.5px] font-medium ${sameAsOriginal ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                        {sameAsOriginal
                          ? "Same combo as your original — we'll send a fresh replacement."
                          : "Selected — we'll try to send this combination."}
                        {pickedVariant.status === 0 && (
                          <span className="ml-1 text-[11px] text-[#8c8c8c]">(Currently inactive — admin will confirm stock.)</span>
                        )}
                      </div>
                    ) : (
                      Object.keys(attrPicks).length > 0 && (
                        <p className="text-[11.5px] text-red-600">
                          This combination isn&apos;t available. Try a different size or colour.
                        </p>
                      )
                    )}
                  </div>
                ) : exchangeProduct && (exchangeProduct.variants || []).length > 0 ? (
                  // No attributes wired up but variants exist — show a flat list
                  // so the buyer can still pick one by id.
                  <div className="flex flex-wrap gap-1.5 rounded-[10px] border border-[#e7e7e7] bg-white p-3">
                    {exchangeProduct.variants!.map((v) => {
                      const picked = pickedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            // No attribute map — record the pick under a sentinel
                            // key and just remember which variant id was chosen
                            // by collapsing attrPicks to a single -1 entry.
                            setAttrPicks({ [-1]: v.id });
                            setError("");
                          }}
                          className={`inline-flex items-center gap-1 rounded-[8px] border px-2.5 py-1.5 text-[12px] font-semibold ${picked ? "border-ink bg-ink text-white" : "border-[#d4d4d4] bg-white text-ink hover:border-ink"}`}
                        >
                          SKU #{v.id}
                          {v.status === 0 && <span className="text-[10px] opacity-60">(off)</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[10px] border border-[#e7e7e7] bg-[#fafafa] px-3 py-3 text-[12.5px] text-[#525151]">
                    No alternative variants are available.{" "}
                    {selectedItem?.product_id && (
                      <a
                        href={`/product/${selectedItem.product_id}`}
                        className="font-semibold underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open product page
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[12.5px] font-semibold text-ink mb-1.5">Reason</label>
              <select
                value={reasonId === "other" ? "other" : reasonId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "other") setReasonId("other");
                  else if (v) setReasonId(Number(v));
                  else setReasonId(null);
                  setCustomReason("");
                  setError("");
                }}
                className="w-full h-[44px] rounded-[10px] border border-[#d4d4d4] bg-white px-3 text-[13.5px] text-ink focus:outline-none focus:border-ink"
              >
                <option value="">Choose a reason…</option>
                {reasons.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
                <option value="other">Other (type my own)</option>
              </select>

              {reasonId === "other" && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  maxLength={500}
                  autoFocus
                  placeholder="e.g. Wrong size, defective, not as described…"
                  className="mt-2 w-full h-[44px] rounded-[10px] border border-[#d4d4d4] bg-white px-3 text-[13.5px] text-ink placeholder:text-[#a3a3a3] focus:outline-none focus:border-ink"
                />
              )}
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-ink mb-1.5">
                Additional remarks <span className="font-normal text-[#8c8c8c]">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                maxLength={1000}
                placeholder="Any details that help us process this faster"
                className="w-full rounded-[10px] border border-[#d4d4d4] bg-white px-3 py-2.5 text-[13.5px] text-ink placeholder:text-[#a3a3a3] focus:outline-none focus:border-ink resize-y"
              />
            </div>

            {/* Photo / video evidence — same uploader as the review modal. */}
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

            {/* Refund method — only relevant for "return". */}
            {requestType === "return" && (
              <div>
                <label className="block text-[12.5px] font-semibold text-ink mb-1.5">
                  How would you like the refund?
                </label>
                <div className={`grid gap-2 ${walletEnabled ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                  <button
                    type="button"
                    onClick={() => setRefundMethod("original")}
                    className={`flex items-start gap-3 rounded-[10px] border p-3 text-left transition-colors ${refundMethod === "original" ? "border-ink bg-[#fafafa]" : "border-[#e7e7e7] hover:border-[#cfcfcf]"}`}
                  >
                    <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${refundMethod === "original" ? "border-ink" : "border-[#c4c4c4]"}`}>
                      {refundMethod === "original" && <span className="block h-full w-full rounded-full bg-ink scale-50" />}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[13px] font-semibold text-ink">Original payment</span>
                      <span className="text-[11px] text-[#8c8c8c] leading-snug">Back to your card / UPI in 5–7 days.</span>
                    </span>
                  </button>
                  {walletEnabled && (
                    <button
                      type="button"
                      onClick={() => setRefundMethod("wallet")}
                      className={`flex items-start gap-3 rounded-[10px] border p-3 text-left transition-colors ${refundMethod === "wallet" ? "border-ink bg-[#fafafa]" : "border-[#e7e7e7] hover:border-[#cfcfcf]"}`}
                    >
                      <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${refundMethod === "wallet" ? "border-ink" : "border-[#c4c4c4]"}`}>
                        {refundMethod === "wallet" && <span className="block h-full w-full rounded-full bg-ink scale-50" />}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-[13px] font-semibold text-ink">
                          Wallet <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 align-middle">Instant</span>
                        </span>
                        <span className="text-[11px] text-[#8c8c8c] leading-snug">Credited the moment your return is verified.</span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Pickup address — defaults to delivery address. */}
            <div>
              <label className="block text-[12.5px] font-semibold text-ink mb-1.5">
                Pickup address
              </label>
              {addresses.length === 0 ? (
                <p className="text-[11.5px] text-[#8c8c8c]">
                  We&apos;ll pick up from your delivery address on file.
                </p>
              ) : (
                <select
                  value={pickupAddressId ?? ""}
                  onChange={(e) => setPickupAddressId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-[44px] rounded-[10px] border border-[#d4d4d4] bg-white px-3 text-[13px] text-ink focus:outline-none focus:border-ink"
                >
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {(a.name || "Saved address")}
                      {a.type ? ` · ${a.type}` : ""}
                      {a.mobile ? ` · ${a.mobile}` : ""}
                      {" — "}
                      {fmtAddress(a)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {error && (
              <p className="text-[12.5px] font-medium text-red-600">{error}</p>
            )}
          </form>
        )}

        <div className="px-6 py-3 border-t border-[#eee] flex items-center justify-between gap-2 bg-white">
          {step === "form" ? (
            <button
              type="button"
              onClick={() => !busy && setStep("pick")}
              className="h-[42px] rounded-[10px] border border-[#d4d4d4] bg-white px-5 text-[13px] font-semibold text-ink hover:border-ink"
            >
              ← Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => !busy && onClose()}
              className="h-[42px] rounded-[10px] border border-[#d4d4d4] bg-white px-5 text-[13px] font-semibold text-ink hover:border-ink"
            >
              Cancel
            </button>
          )}
          {step === "pick" ? (
            <button
              type="button"
              onClick={goNext}
              disabled={items.length === 0}
              className="h-[42px] rounded-[10px] bg-ink px-6 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={busy || uploading}
              className="h-[42px] rounded-[10px] bg-ink px-6 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? "Submitting…" : "Submit request"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
