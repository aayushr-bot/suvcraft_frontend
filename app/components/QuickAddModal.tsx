"use client";

import { useEffect, useState } from "react";
import { MinusIcon, Plus } from "./icons";
import ProductImage from "./ProductImage";
import { api, imgUrl, type ProductDetail } from "@/lib/api";
import { useCart, lineKey } from "@/lib/cartContext";
import { formatMoney } from "@/lib/format";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

const PLACEHOLDER_IMG = "/product-placeholder.svg";

function resolveImg(path: string): string {
  if (!path) return PLACEHOLDER_IMG;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

function fmt(n: number) {
  return n ? formatMoney(n) : "—";
}

export default function QuickAddModal({
  productId,
  open,
  onClose,
  onAdded,
}: {
  productId: number | null;
  open: boolean;
  onClose: () => void;
  onAdded: (msg: string) => void;
}) {
  const { addToCart, items: cartItems } = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [qty, setQty] = useState(1);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);

  // Fetch detail every time the modal opens for a new id.
  useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    setLoading(true);
    setErrMsg("");
    setProduct(null);
    setSelectedColorId(null);
    setSelectedSizeId(null);
    api.product(productId)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        const colorAttr = (p.attribute_options || []).find((a) =>
          a.name.toLowerCase().includes("color") ||
          a.values.some((v) => Number(v.swatche_type) === 1)
        );
        // Pre-pick first color so the price reflects a real variant.
        setSelectedColorId(colorAttr?.values[0]?.id ?? null);
        const minQty = Math.max(1, Number(p.minimum_order_quantity) || 1);
        setQty(minQty);
      })
      .catch(() => { if (!cancelled) setErrMsg("Could not load product."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, productId]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Esc.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const attributeOptions = product?.attribute_options || [];
  const colorAttr = attributeOptions.find((a) =>
    a.name.toLowerCase().includes("color") ||
    a.values.some((v) => String(v.swatche_type || "").toLowerCase() === "color")
  );
  const sizeAttr = attributeOptions.find((a) => a !== colorAttr);

  const variants = product?.variants || [];
  const matchedVariant = (() => {
    const wanted = [selectedColorId, selectedSizeId].filter((n): n is number => !!n);
    if (!wanted.length) return variants[0] || null;
    return (
      variants.find((v) => wanted.every((id) => v.attribute_value_ids.includes(id))) ||
      variants[0] ||
      null
    );
  })();

  // Exact match (no fallback) — used to flip the button to "Out of Stock"
  // only when the shopper has actually picked a full combo with zero stock.
  const exactVariantMatch = (() => {
    const wanted = [selectedColorId, selectedSizeId].filter((n): n is number => !!n);
    if (!wanted.length) return null;
    return variants.find((v) => wanted.every((id) => v.attribute_value_ids.includes(id))) || null;
  })();

  // Mirrors the product detail page's stock_type interpretation so the picker
  // chips behave the same in both surfaces. Null variant stock means "OOS"
  // for variant-wise products and "unlimited" for product-wise / unlimited.
  const stockType = String(product?.stock_type || "").toLowerCase();
  const isVariantStock = stockType.includes("variant");
  const isUnlimitedStock = stockType.includes("unlimited");

  function readVariantStock(v: { stock: number | null }): number {
    if (isUnlimitedStock) return Infinity;
    if (v.stock != null) return Number(v.stock);
    return isVariantStock ? 0 : Infinity;
  }

  // What if the shopper picked `valueId` for `attrId`, keeping the other
  // attribute's current pick? Returns total stock across matching variants.
  // Returns 0 (OOS) when no variant exists for the candidate combo at all —
  // same behavior as the full product detail picker.
  function stockForCandidate(attrId: number, valueId: number): number {
    const otherSelections: number[] = [];
    if (colorAttr && colorAttr.id !== attrId && selectedColorId != null) otherSelections.push(selectedColorId);
    if (sizeAttr && sizeAttr.id !== attrId && selectedSizeId != null) otherSelections.push(selectedSizeId);
    const wanted = [...otherSelections, valueId];
    let total = 0;
    let matched = false;
    for (const v of variants) {
      if (!wanted.every((id) => v.attribute_value_ids.includes(id))) continue;
      matched = true;
      const s = readVariantStock(v);
      if (s === Infinity) return Infinity;
      total += s;
    }
    return matched ? total : 0;
  }

  // True when the selected combo resolves to zero stock — flips Add to Cart
  // to "Out of Stock" even though the product rollup might show stock for
  // other combos.
  const selectedComboOutOfStock =
    exactVariantMatch != null && readVariantStock(exactVariantMatch) <= 0;

  const { current, original } = (() => {
    if (matchedVariant) {
      const sp = Number(matchedVariant.special_price ?? 0);
      const rg = Number(matchedVariant.price ?? 0);
      if (sp && rg && sp < rg) return { current: sp, original: rg };
      if (rg) return { current: rg, original: 0 };
    }
    if (product) {
      const sp = Number(product.special_price ?? 0);
      const rg = Number(product.price ?? 0);
      if (sp && rg && sp < rg) return { current: sp, original: rg };
      if (rg) return { current: rg, original: 0 };
    }
    return { current: 0, original: 0 };
  })();

  const minQty = Math.max(1, Number(product?.minimum_order_quantity) || 1);
  const stepSize = Math.max(1, Number(product?.quantity_step_size) || 1);
  // Variant-aware stock cap (mirrors the PDP). For variant-wise products
  // `product.stock` is the rollup across all variants — using it here would
  // let qty rise past what's actually in stock for the picked combo.
  const stockCap = (() => {
    if (isUnlimitedStock) return Infinity;
    if (matchedVariant) return readVariantStock(matchedVariant);
    return product?.stock != null ? Number(product.stock) : Infinity;
  })();
  const allowedCap = product?.total_allowed_quantity != null
    ? Number(product.total_allowed_quantity)
    : Infinity;
  const maxQty = Math.min(stockCap, allowedCap);
  const isOutOfStock = stockCap === 0 || maxQty < minQty;

  // How many of THIS product+variant line are already sitting in the cart.
  // Without this check, clicking Add to Cart from the quick-add modal would
  // accumulate past available stock (Amazon/Flipkart parity).
  const existingCartQty = product
    ? (cartItems.find(
        (i) => lineKey(i) === lineKey({ id: product.id, variant_id: matchedVariant?.id }),
      )?.qty ?? 0)
    : 0;
  const remainingStock = Number.isFinite(maxQty)
    ? Math.max(0, (maxQty as number) - existingCartQty)
    : Infinity;
  const atCartCap = !isOutOfStock && !selectedComboOutOfStock && remainingStock < minQty;

  const decQty = () => {
    if (qty - stepSize < minQty) return;
    setQty(qty - stepSize);
    setErrMsg("");
  };
  const incQty = () => {
    if (qty + stepSize > maxQty) return;
    // Also stop once we've reached what can still be added on top of what's
    // already in the cart — otherwise the stepper rises and then Add to Cart
    // rejects the click.
    if (qty + stepSize > remainingStock) {
      setErrMsg(
        `Only ${remainingStock} more can be added — you already have ${existingCartQty} in your cart.`,
      );
      return;
    }
    setQty(qty + stepSize);
    setErrMsg("");
  };

  const handleAdd = () => {
    if (!product) return;
    if (isOutOfStock) { setErrMsg("This product is out of stock."); return; }
    if (selectedComboOutOfStock) { setErrMsg("This combination is out of stock — please pick another size or colour."); return; }
    if (colorAttr && colorAttr.values.length > 0 && !selectedColorId) {
      setErrMsg(`Please select a ${colorAttr.name.toLowerCase()}.`);
      return;
    }
    if (sizeAttr && sizeAttr.values.length > 0 && !selectedSizeId) {
      setErrMsg(`Please select a ${sizeAttr.name.toLowerCase()}.`);
      return;
    }
    // Enforce stock cap across the cart, not just this click — same rule as
    // the full PDP. Clicking Add to Cart can't push the line past stock.
    if (existingCartQty + qty > maxQty) {
      if (existingCartQty >= maxQty) {
        setErrMsg(
          `You already have ${existingCartQty} in your cart — no more available.`,
        );
      } else {
        setErrMsg(
          `Only ${remainingStock} more can be added — you already have ${existingCartQty} in your cart.`,
        );
      }
      return;
    }
    const pickedColor = colorAttr?.values.find((v) => v.id === selectedColorId);
    const pickedSize = sizeAttr?.values.find((v) => v.id === selectedSizeId);
    addToCart(
      {
        id: product.id,
        name: product.name,
        image: product.image || "",
        price: current,
        minQty,
        maxQty: Number.isFinite(maxQty) ? (maxQty as number) : undefined,
        step: stepSize,
        stock: product.stock,
        tax_percentage: Number(product.tax_percentage || 0),
        is_prices_inclusive_tax: Number(product.is_prices_inclusive_tax || 0),
        size: pickedSize?.value,
        color: pickedColor
          ? { name: pickedColor.value, swatch: String(pickedColor.swatche_value || "").trim() || undefined }
          : undefined,
        variant_id: matchedVariant?.id,
      },
      qty,
    );
    onAdded("Product added to cart.");
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-4 pointer-events-none">
        <div className="relative flex max-h-[90vh] w-full max-w-[560px] flex-col rounded-[12px] bg-white shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between border-b border-[#eee] px-6 py-4">
            <h3 className="text-[17px] font-bold text-ink">Quick Add</h3>
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

          <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: "thin" }}>
            {loading && (
              <div className="flex h-[300px] items-center justify-center text-[14px] text-[#8c8c8c]">Loading…</div>
            )}

            {!loading && errMsg && !product && (
              <div className="flex h-[200px] items-center justify-center text-[14px] text-red-500">{errMsg}</div>
            )}

            {product && (
              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-4">
                  <div className="h-[100px] w-[100px] shrink-0 overflow-hidden rounded-[8px] bg-[#f9f9f9]">
                    <ProductImage src={resolveImg(product.image)} alt={product.name} className="h-full w-full object-contain" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <h4 className="text-[16px] font-bold text-ink">{product.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[18px] font-bold text-ink">{fmt(current)}</span>
                      {original > 0 && current < original && (
                        <span className="text-[13px] text-[#8c8c8c] line-through">{fmt(original)}</span>
                      )}
                    </div>
                    {product.category_name && (
                      <span className="text-[12px] text-[#525151]">Category: <span className="font-medium text-ink">{product.category_name}</span></span>
                    )}
                  </div>
                </div>

                {colorAttr && colorAttr.values.length > 0 && (
                  <div>
                    <span className="mb-2 block text-[14px] font-medium text-ink">
                      {colorAttr.name}{selectedColorId && colorAttr.values.find((v) => v.id === selectedColorId) ? <>: <span className="font-bold">{colorAttr.values.find((v) => v.id === selectedColorId)!.value}</span></> : null}
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      {colorAttr.values.map((v) => {
                        const active = selectedColorId === v.id;
                        const swatch = String(v.swatche_value || "").trim() || "#e7e7e7";
                        const oos = stockForCandidate(colorAttr.id, v.id) <= 0;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => { setSelectedColorId(v.id); setErrMsg(""); }}
                            aria-pressed={active}
                            aria-label={`${colorAttr.name} ${v.value}${oos ? " — out of stock" : ""}`}
                            aria-disabled={oos}
                            disabled={oos}
                            title={oos ? `${v.value} — out of stock` : v.value}
                            style={{ backgroundColor: swatch }}
                            className={`relative h-[28px] w-[40px] overflow-hidden rounded-[2px] transition-all ${
                              active ? "ring-[1.5px] ring-black ring-offset-4 ring-offset-white" : "border border-[#e7e7e7] hover:border-ink/40"
                            } ${oos ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            {oos && (
                              <span aria-hidden className="pointer-events-none absolute inset-0">
                                <span className="absolute left-0 right-0 top-1/2 h-[1.5px] -translate-y-1/2 rotate-[-14deg] bg-red-500/70" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sizeAttr && sizeAttr.values.length > 0 && (
                  <div>
                    <span className="mb-2 block text-[14px] font-medium text-ink">
                      {sizeAttr.name}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {sizeAttr.values.map((v) => {
                        const active = selectedSizeId === v.id;
                        const oos = stockForCandidate(sizeAttr.id, v.id) <= 0;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => { setSelectedSizeId(v.id); setErrMsg(""); }}
                            disabled={oos}
                            aria-disabled={oos}
                            title={oos ? "Out of stock for this selection" : undefined}
                            className={`relative inline-flex h-[36px] min-w-[48px] items-center justify-center overflow-hidden rounded-[5px] border px-3 text-[12px] font-semibold transition-colors ${
                              active
                                ? "border-ink bg-ink text-white"
                                : oos
                                  ? "border-[#d4d4d4] bg-[#f6f6f8] text-[#9c9c9c] line-through cursor-not-allowed"
                                  : "border-[#d4d4d4] bg-white text-ink hover:border-ink cursor-pointer"
                            }`}
                          >
                            <span className="relative z-10">{v.value}</span>
                            {oos && (
                              <span aria-hidden className="pointer-events-none absolute inset-0">
                                <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 rotate-[-18deg] bg-[#9c9c9c]" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <span className="mb-2 block text-[14px] font-medium text-ink">
                    Quantity : <span className="font-normal text-[#525151]">{qty.toString().padStart(2, "0")}</span>
                  </span>
                  <div className="inline-flex h-[40px] items-center rounded-[8px] border border-[#e7e7e7] bg-[#fdfdfd]">
                    <button
                      onClick={decQty}
                      disabled={isOutOfStock || selectedComboOutOfStock || qty - stepSize < minQty}
                      className="flex h-full w-[40px] items-center justify-center text-[#8c8c8c] hover:text-ink rounded-l-[8px] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="flex h-full w-[40px] items-center justify-center text-[14px] font-bold text-ink border-x border-[#e7e7e7]">
                      {qty.toString().padStart(2, "0")}
                    </span>
                    <button
                      onClick={incQty}
                      disabled={
                        isOutOfStock ||
                        selectedComboOutOfStock ||
                        atCartCap ||
                        qty + stepSize > maxQty ||
                        qty + stepSize > remainingStock
                      }
                      className="flex h-full w-[40px] items-center justify-center text-[#8c8c8c] hover:text-ink rounded-r-[8px] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {existingCartQty > 0 && !errMsg && (
                    <p className="mt-2 text-[12px] text-[#8c8c8c]">
                      You already have {existingCartQty} of this item in your cart.
                      {Number.isFinite(remainingStock) && remainingStock > 0 && ` Only ${remainingStock} more can be added.`}
                    </p>
                  )}
                </div>

                {errMsg && (
                  <p className="text-[13px] text-red-500" role="alert">{errMsg}</p>
                )}
              </div>
            )}
          </div>

          {product && (
            <div className="border-t border-[#eee] px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  if (atCartCap) {
                    onClose();
                    window.location.href = `${BASE}/cart`;
                    return;
                  }
                  handleAdd();
                }}
                disabled={isOutOfStock || selectedComboOutOfStock}
                className="inline-flex h-[48px] w-full cursor-pointer items-center justify-center rounded-[8px] bg-ink text-[15px] font-medium text-white hover:bg-black disabled:opacity-50"
              >
                {isOutOfStock || selectedComboOutOfStock
                  ? "Out of Stock"
                  : atCartCap
                    ? "Go to Cart"
                    : "Add to Cart"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
