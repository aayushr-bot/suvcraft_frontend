"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CartIcon,
  ChevronRight,
  HeartFill,
  HeartLine,
  MinusIcon,
  Plus,
  ShareIcon,
  Star,
  CheckCircleSolid,
} from "../../components/icons";
import { IoMdHeartEmpty } from "react-icons/io";
import { IoCart } from "react-icons/io5";
import { SlLike, SlDislike } from "react-icons/sl";
import { type ProductDetail, type Product, type ProductRating, type RatingSummary, imgUrl } from "@/lib/api";
import { useCart } from "@/lib/cartContext";
import { useWishlist } from "@/lib/wishlistContext";
import ProductImage from "../../components/ProductImage";
import AuthModal from "../../components/AuthModal";

const PLACEHOLDER_IMG = "/product-placeholder.svg";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
// <Link> auto-prefixes basePath, but window.location.href does NOT.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

function resolveImg(path: string): string {
  if (!path) return PLACEHOLDER_IMG;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

function parseImages(p: ProductDetail): string[] {
  const imgs: string[] = [];
  if (p.image) imgs.push(resolveImg(p.image));
  if (p.other_images) {
    try {
      const arr = JSON.parse(p.other_images);
      if (Array.isArray(arr)) arr.forEach((i: string) => i && imgs.push(resolveImg(i)));
    } catch {
      p.other_images.split(",").filter(Boolean).forEach((i) => imgs.push(resolveImg(i.trim())));
    }
  }
  if (!imgs.length) imgs.push(PLACEHOLDER_IMG);
  return imgs;
}

function getPrice(p: ProductDetail) {
  const special = Number(p.special_price ?? 0);
  const regular = Number(p.price ?? 0);
  if (special && regular && special < regular) return { current: special, original: regular };
  if (regular) return { current: regular, original: 0 };
  return { current: 0, original: 0 };
}

function fmt(n: number) {
  return n ? `₹${n.toLocaleString("en-IN")}` : "—";
}

function getCardImg(p: Product) {
  if (!p.image) return `https://picsum.photos/seed/product${p.id}/300/400`;
  if (p.image.startsWith("http")) return p.image;
  if (p.image.startsWith("/figma/")) return p.image;
  const clean = p.image.startsWith("/uploads/") ? p.image.slice("/uploads/".length) : p.image.replace(/^\//, "");
  return imgUrl(clean);
}

type ReviewMedia = { url: string; type: "image" | "video" };

// Reviews store attached media as a JSON-stringified array of {url, type} in
// the `images` column (see RateProductModal). Legacy rows may carry a plain
// comma-separated URL list, so handle both shapes.
function parseReviewMedia(raw: string | null | undefined): ReviewMedia[] {
  if (!raw) return [];
  const s = String(raw).trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) {
        return arr
          .filter((m): m is ReviewMedia => m && typeof m.url === "string")
          .map((m) => ({ url: m.url, type: m.type === "video" ? "video" : "image" }));
      }
    } catch {}
    return [];
  }
  return s.split(",")
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u) => ({ url: u, type: /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u) ? "video" : "image" }));
}

function formatDate(s: string | undefined) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        // Fraction of THIS star that should be filled (0–1).
        const fill = Math.max(0, Math.min(1, v - (n - 1)));
        return (
          <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-[#e0e0e0]" style={{ width: size, height: size }} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className="text-[#f5a524]" style={{ width: size, height: size }} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function ProductDetailClient({
  product,
  related,
  ratings = [],
  ratingSummary,
  popular = [],
  settings = {},
}: {
  product: ProductDetail;
  related: Product[];
  ratings?: ProductRating[];
  ratingSummary?: RatingSummary;
  popular?: Product[];
  settings?: Record<string, unknown>;
}) {
  const images = parseImages(product);

  const minQty = Math.max(1, Number(product.minimum_order_quantity) || 1);
  const stepSize = Math.max(1, Number(product.quantity_step_size) || 1);
  const stockCap = product.stock != null ? Number(product.stock) : Infinity;
  const allowedCap = product.total_allowed_quantity != null
    ? Number(product.total_allowed_quantity)
    : Infinity;
  const maxQty = Math.min(stockCap, allowedCap);
  const isOutOfStock = product.stock === 0 || maxQty < minQty;

  const { addToCart } = useCart();
  const relatedScrollRef = useRef<HTMLDivElement>(null);
  const [relatedHasOverflow, setRelatedHasOverflow] = useState(false);
  const popularScrollRef = useRef<HTMLDivElement>(null);
  const [popularHasOverflow, setPopularHasOverflow] = useState(false);
  const [reviewTab, setReviewTab] = useState<"all" | "photo" | "desc">("all");
  const [reviewRatingFilter, setReviewRatingFilter] = useState<Set<number>>(new Set());
  const [reviewTopicFilter, setReviewTopicFilter] = useState<Set<string>>(new Set());
  const [reviewPage, setReviewPage] = useState(1);
  const [ratingList, setRatingList] = useState<ProductRating[]>(ratings);
  // Lightbox for full-size review media. `null` = closed.
  const [lightbox, setLightbox] = useState<{ media: ReviewMedia[]; index: number } | null>(null);

  const voteOnRating = async (ratingId: number, currentVote: number, intent: 1 | -1) => {
    if (!isAuthed) {
      setShowAuth(true);
      return;
    }
    // Toggle off when re-clicking the same direction; otherwise switch.
    const next = currentVote === intent ? 0 : intent;
    // Optimistic update so the UI feels instant.
    setRatingList((list) =>
      list.map((r) => {
        if (r.id !== ratingId) return r;
        const likeDelta = (next === 1 ? 1 : 0) - (currentVote === 1 ? 1 : 0);
        const dislikeDelta = (next === -1 ? 1 : 0) - (currentVote === -1 ? 1 : 0);
        return {
          ...r,
          like_count: Math.max(0, Number(r.like_count || 0) + likeDelta),
          dislike_count: Math.max(0, Number(r.dislike_count || 0) + dislikeDelta),
          user_vote: next,
        };
      })
    );
    try {
      const res = await fetch(`${API}/api/v1/products/${product.id}/ratings/${ratingId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: next }),
      });
      const j = await res.json();
      if (!j?.error && j?.data) {
        setRatingList((list) =>
          list.map((r) =>
            r.id === ratingId
              ? { ...r, like_count: Number(j.data.like_count), dislike_count: Number(j.data.dislike_count), user_vote: Number(j.data.user_vote) }
              : r
          )
        );
      }
    } catch {
      // Roll back on network error.
      setRatingList((list) =>
        list.map((r) =>
          r.id === ratingId
            ? { ...r, user_vote: currentVote, like_count: Math.max(0, Number(r.like_count || 0)), dislike_count: Math.max(0, Number(r.dislike_count || 0)) }
            : r
        )
      );
    }
  };
  const [activeIdx, setActiveIdx] = useState(0);
  const activeImg = images[activeIdx] ?? images[0];
  function setActiveImg(img: string) {
    const i = images.indexOf(img);
    if (i >= 0) setActiveIdx(i);
  }
  const [qty, setQty] = useState(minQty);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [popupMsg, setPopupMsg] = useState("Product added to cart.");
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [qtyError, setQtyError] = useState("");
  // Pull attribute groups from the backend. We treat any attribute whose values
  // have swatche_type === "color" (or attribute name like "Color") as the color
  // swatch row, everything else as a text-pill row (Size, Material, etc.).
  const attributeOptions = product.attribute_options || [];
  const colorAttr = attributeOptions.find((a) =>
    a.name.toLowerCase().includes("color") ||
    a.values.some((v) => Number(v.swatche_type) === 1)
  );
  const sizeAttr = attributeOptions.find((a) => a !== colorAttr);

  // Pre-select the first color so the price + swatch reflect a real variant
  // immediately. Size stays unselected so the user is forced to pick one.
  const [selectedColorId, setSelectedColorId] = useState<number | null>(
    colorAttr?.values[0]?.id ?? null,
  );
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [showDeliveryTerms, setShowDeliveryTerms] = useState(false);
  const selectedColor = colorAttr?.values.find((v) => v.id === selectedColorId) || null;
  const selectedSize = sizeAttr?.values.find((v) => v.id === selectedSizeId) || null;

  // Match the picked color + size back to a specific variant row so we can show
  // its price + stock instead of the product-wide minimum. Falls back to the
  // first variant when nothing is selected (or when no variants exist).
  const variants = product.variants || [];
  const matchedVariant = (() => {
    const wanted = [selectedColorId, selectedSizeId].filter((n): n is number => !!n);
    if (!wanted.length) return variants[0] || null;
    return (
      variants.find((v) => wanted.every((id) => v.attribute_value_ids.includes(id))) ||
      variants[0] ||
      null
    );
  })();

  // Variant price wins when present; otherwise fall back to the product-level price.
  const { current, original } = (() => {
    if (matchedVariant) {
      const sp = Number(matchedVariant.special_price ?? 0);
      const rg = Number(matchedVariant.price ?? 0);
      if (sp && rg && sp < rg) return { current: sp, original: rg };
      if (rg) return { current: rg, original: 0 };
    }
    return getPrice(product);
  })();

  const wishlist = useWishlist();
  const isWishlisted = wishlist.has(product.id);

  useEffect(() => {
    fetch(`${API}/api/v1/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setIsAuthed(Boolean(j?.data?.user)))
      .catch(() => setIsAuthed(false));
  }, []);

  // Hide the related-products arrows when the row fits without scrolling.
  useEffect(() => {
    const el = relatedScrollRef.current;
    if (!el) return;
    const measure = () => setRelatedHasOverflow(el.scrollWidth - el.clientWidth > 1);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [related.length]);

  // Same for popular.
  useEffect(() => {
    const el = popularScrollRef.current;
    if (!el) return;
    const measure = () => setPopularHasOverflow(el.scrollWidth - el.clientWidth > 1);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [popular.length]);

  const showToast = (msg: string) => {
    setPopupMsg(msg);
    setShowCartPopup(true);
    setTimeout(() => setShowCartPopup(false), 1000);
  };

  const limitMsg = () => {
    if (allowedCap < stockCap) {
      return `Maximum ${allowedCap} unit${allowedCap === 1 ? "" : "s"} per order.`;
    }
    return `Only ${stockCap} item${stockCap === 1 ? "" : "s"} available.`;
  };

  const handleAddToCart = () => {
    if (isOutOfStock) {
      setQtyError("This product is out of stock.");
      return;
    }
    if (colorAttr && colorAttr.values.length > 0 && !selectedColorId) {
      setQtyError(`Please select a ${colorAttr.name.toLowerCase()}.`);
      return;
    }
    if (sizeAttr && sizeAttr.values.length > 0 && !selectedSizeId) {
      setQtyError(`Please select a ${sizeAttr.name.toLowerCase()}.`);
      return;
    }
    if (qty < minQty) {
      setQtyError(`Minimum order quantity is ${minQty}.`);
      return;
    }
    if (qty > maxQty) {
      setQtyError(limitMsg());
      return;
    }
    setQtyError("");
    addToCart(
      {
        id: product.id,
        name: product.name,
        image: images[0],
        price: current,
        minQty,
        maxQty: Number.isFinite(maxQty) ? (maxQty as number) : undefined,
        step: stepSize,
        stock: product.stock,
        tax_percentage: Number(product.tax_percentage || 0),
        is_prices_inclusive_tax: Number(product.is_prices_inclusive_tax || 0),
        size: selectedSize?.value,
        color: selectedColor
          ? { name: selectedColor.value, swatch: String(selectedColor.swatche_value || "").trim() || undefined }
          : undefined,
        variant_id: matchedVariant?.id,
      },
      qty,
    );
    showToast("Product added to cart.");
  };

  const decQty = () => {
    if (qty - stepSize < minQty) {
      setQtyError(`Minimum order quantity is ${minQty}.`);
      return;
    }
    setQtyError("");
    setQty(qty - stepSize);
  };

  const incQty = () => {
    if (qty + stepSize > maxQty) {
      setQtyError(limitMsg());
      return;
    }
    setQtyError("");
    setQty(qty + stepSize);
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = { title: product.name, text: product.short_description || product.name, url };
    try {
      if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(shareData);
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard.");
    } catch {
      showToast("Could not share.");
    }
  };

  const handleWishlist = async () => {
    const wasWishlisted = isWishlisted;
    try {
      await wishlist.toggle({
        id: product.id,
        name: product.name,
        image: product.image || images[0],
        slug: product.slug,
        price: current,
        list_price: original || undefined,
        status: product.status,
      });
      showToast(wasWishlisted ? "Removed from wishlist." : "Added to wishlist.");
    } catch {
      showToast("Could not update wishlist.");
    }
  };

  const handleBuyNow = () => {
    if (isOutOfStock) {
      setQtyError("This product is out of stock.");
      return;
    }
    if (colorAttr && colorAttr.values.length > 0 && !selectedColorId) {
      setQtyError(`Please select a ${colorAttr.name.toLowerCase()}.`);
      return;
    }
    if (sizeAttr && sizeAttr.values.length > 0 && !selectedSizeId) {
      setQtyError(`Please select a ${sizeAttr.name.toLowerCase()}.`);
      return;
    }
    if (qty < minQty) {
      setQtyError(`Minimum order quantity is ${minQty}.`);
      return;
    }
    if (qty > maxQty) {
      setQtyError(limitMsg());
      return;
    }
    setQtyError("");
    if (!isAuthed) {
      setShowAuth(true);
      return;
    }
    addToCart(
      {
        id: product.id,
        name: product.name,
        image: images[0],
        price: current,
        minQty,
        maxQty: Number.isFinite(maxQty) ? (maxQty as number) : undefined,
        step: stepSize,
        stock: product.stock,
        tax_percentage: Number(product.tax_percentage || 0),
        is_prices_inclusive_tax: Number(product.is_prices_inclusive_tax || 0),
        size: selectedSize?.value,
        color: selectedColor
          ? { name: selectedColor.value, swatch: String(selectedColor.swatche_value || "").trim() || undefined }
          : undefined,
        variant_id: matchedVariant?.id,
      },
      qty,
    );
    window.location.href = `${BASE}/checkout`;
  };

  const breadcrumbs = [
    { label: "Homepage", href: "/" },
    ...(product.category_name
      ? [{ label: product.category_name, href: product.category_id ? `/?category_id=${product.category_id}` : "/" }]
      : []),
    { label: product.name, href: "#", current: true },
  ];

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8">
      {/* Breadcrumbs */}
      <nav className="flex flex-wrap items-center gap-2 text-[13px] text-[#8c8c8c]">
        {breadcrumbs.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <Link href={b.href} className={(b as any).current ? "font-medium text-ink" : "hover:text-ink"}>
              {b.label}
            </Link>
            {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
          </div>
        ))}
      </nav>

      {/* Main Product Section */}
      <div className="mt-8 flex flex-col items-start gap-8 md:flex-row lg:gap-12">
        {/* Left: Images */}
        <div className="w-full md:w-[42%] flex flex-col gap-6 md:sticky md:top-24 md:self-start">
          <div className="flex gap-4">
            <div
              className="relative flex aspect-square flex-1 items-center justify-center overflow-hidden bg-[#f9f9f9]"
            >
              <div
                className="absolute top-0 right-0 z-10 flex h-11 items-center justify-center px-8 pr-12 text-[15px] font-bold text-ink shadow-sm"
                style={{
                  background: "linear-gradient(90deg, #FFF3B8 0%, #FFE602 100%)",
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 8% 50%)",
                }}
              >
                Trusted Seller
              </div>
              <ProductImage src={activeImg} alt={product.name} className="h-[95%] w-[95%] object-contain" />
            </div>

            <div className="flex flex-col gap-4 pt-2">
              <button
                onClick={handleShare}
                aria-label="Share product"
                className="flex h-[52px] w-[52px] items-center justify-center rounded-[5px] bg-[#f5f5f5] text-ink hover:bg-[#e0e0e0] shadow-sm"
              >
                <ShareIcon className="h-6 w-6" />
              </button>
              <button
                onClick={handleWishlist}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={isWishlisted}
                className={`flex h-[52px] w-[52px] items-center justify-center rounded-[5px] shadow-sm transition-colors ${isWishlisted ? "bg-[#fdecec] text-red-500 hover:bg-[#fadcdc]" : "bg-[#f5f5f5] text-ink hover:bg-[#e0e0e0]"}`}
              >
                {isWishlisted ? <HeartFill className="h-6 w-6" /> : <HeartLine className="h-6 w-6" />}
              </button>
              {images.length > 1 && (
                <div className="mt-auto flex flex-col gap-3">
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => setActiveIdx((i) => (i + 1) % images.length)}
                    className="flex h-[44px] w-[44px] items-center justify-center rounded-[4px] bg-[#F2F2F2] text-ink hover:bg-[#e7e7e7]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={() => setActiveIdx((i) => (i - 1 + images.length) % images.length)}
                    className="flex h-[44px] w-[44px] items-center justify-center rounded-[4px] bg-[#F2F2F2] text-ink hover:bg-[#e7e7e7]"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(img)}
                  className={`relative flex aspect-square w-[100px] shrink-0 items-center justify-center bg-[#f9f9f9] overflow-hidden transition-all ${activeImg === img ? "opacity-100" : "opacity-70 hover:opacity-100"}`}
                >
                  <ProductImage src={img} alt={`view ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="w-full md:flex-1 flex flex-col gap-6">
          <div>
            {product.short_description && (
              <div className="mb-2 text-[13px] text-[#525151]">{product.short_description}</div>
            )}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-[28px] font-semibold leading-tight text-ink md:text-[32px]">
                  {product.name}
                </h1>
                <div className="mt-3 flex items-center gap-3">
                  {original > 0 && (
                    <span className="text-[16px] text-[#8c8c8c] line-through">{fmt(original)}</span>
                  )}
                  <span className="text-[26px] font-bold text-ink">{fmt(current)}</span>
                  {original > 0 && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[12px] font-semibold text-green-700">
                      {Math.round(((original - current) / original) * 100)}% off
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 pt-1 shrink-0">
                {Number(product.rating) > 0 && (
                  <div className="flex items-center gap-1 text-[18px] font-bold text-ink">
                    <Star className="h-5 w-5 text-[#f5a524]" />
                    {Number(product.rating).toFixed(1)}
                  </div>
                )}
                <div className="inline-flex flex-col items-center gap-1.5">
                  <span className="text-[14px] font-medium text-ink leading-none">Fulfilled by</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/figma/suvcraft-logo2.png" alt="Suvcraft" className="h-8 w-auto" />
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-3">
              {original > 0 && (
                <span className="text-[14px] text-[#8c8c8c] line-through">{fmt(original)}</span>
              )}
              <span className="text-[26px] font-bold text-ink">{fmt(current)}</span>
              {original > 0 && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[12px] font-semibold text-green-700">
                  {Math.round(((original - current) / original) * 100)}% off
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (() => {
            const plain = product.description.replace(/<[^>]*>/g, "").trim();
            const isLong = plain.length > 280;
            return (
              <div className="border-t-2 border-dashed border-[#e7e7e7] pt-6">
                <h3 className="mb-3 text-[18px] font-semibold text-ink">Description :</h3>
                <div
                  className={`text-[13px] leading-relaxed text-[#525151] prose prose-sm max-w-none ${isLong && !showFullDesc ? "line-clamp-4" : ""}`}
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
                {isLong && (
                  <button
                    type="button"
                    onClick={() => setShowFullDesc((v) => !v)}
                    className="mt-1 text-[13px] font-semibold text-[#242424] underline underline-offset-2 hover:text-black"
                  >
                    {showFullDesc ? "See Less" : "See More..."}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Color */}
          {colorAttr && colorAttr.values.length > 0 && (
            <div>
              <div className="mb-3 text-[15px] text-[#525151]">
                {colorAttr.name} : <span className="font-bold text-ink">{selectedColor?.value || colorAttr.values[0].value}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {colorAttr.values.map((v) => {
                  const active = selectedColorId === v.id;
                  // Use the swatche_value (hex) when present; fall back to a
                  // light grey so the swatch is still visible.
                  const swatch = (v.swatche_value || "").trim() || "#e7e7e7";
                  return (
                    <button
                      key={v.id}
                      type="button"
                      aria-label={`${colorAttr.name} ${v.value}`}
                      onClick={() => { setSelectedColorId(v.id); setQtyError(""); }}
                      style={{ backgroundColor: swatch }}
                      className={`h-[28px] w-[64px] cursor-pointer rounded-[2px] transition-all ${active ? "ring-[1.5px] ring-black ring-offset-4 ring-offset-white" : "border border-[#e7e7e7] hover:border-ink/40"}`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Size */}
          {sizeAttr && sizeAttr.values.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[15px] font-medium text-ink">{sizeAttr.name} :</span>
                {product.size_chart ? (
                  <button
                    type="button"
                    onClick={() => setShowSizeChart(true)}
                    className="font-sans text-[14px] md:text-[16px] font-normal leading-none tracking-normal text-[#666666] underline underline-offset-4 hover:text-ink cursor-pointer"
                  >
                    View Size Chart
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sizeAttr.values.map((v) => {
                  const active = selectedSizeId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => { setSelectedSizeId(v.id); setQtyError(""); }}
                      className={`inline-flex h-[40px] min-w-[56px] cursor-pointer items-center justify-center rounded-[5px] border px-3 text-[13px] font-semibold transition-colors ${active ? "border-ink bg-ink text-white" : "border-[#d4d4d4] bg-white text-ink hover:border-ink"}`}
                    >
                      {v.value}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Brand / Category info */}
          <div className="flex flex-wrap gap-4 text-[13px] text-[#525151]">
            {product.category_name && (
              <span>Category: <span className="font-medium text-ink">{product.category_name}</span></span>
            )}
            {product.brand_name && (
              <span>Brand: <span className="font-medium text-ink">{product.brand_name}</span></span>
            )}
            {product.stock != null && (
              <span>
                Stock:{" "}
                <span className={`font-medium ${product.stock > 0 ? "text-green-600" : "text-red-500"}`}>
                  {product.stock > 0 ? `${product.stock} available` : "Out of stock"}
                </span>
              </span>
            )}
          </div>

          {/* Quantity */}
          <div>
            <span className="mb-2 block text-[15px] font-medium text-ink">
              Quantity : <span className="font-normal text-[#525151]">{qty.toString().padStart(2, "0")}</span>
            </span>
            <div className="inline-flex h-[44px] items-center rounded-[8px] border border-[#e7e7e7] bg-[#fdfdfd]">
              <button
                onClick={decQty}
                disabled={isOutOfStock || qty - stepSize < minQty}
                className="flex h-full w-[44px] items-center justify-center text-[#8c8c8c] hover:text-ink rounded-l-[8px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              <span className="flex h-full w-[44px] items-center justify-center text-[15px] font-bold text-ink border-x border-[#e7e7e7]">
                {qty.toString().padStart(2, "0")}
              </span>
              <button
                onClick={incQty}
                disabled={isOutOfStock || qty + stepSize > maxQty}
                className="flex h-full w-[44px] items-center justify-center text-[#8c8c8c] hover:text-ink rounded-r-[8px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {(minQty > 1 || allowedCap !== Infinity) && !qtyError && (
              <p className="mt-2 text-[12px] text-[#8c8c8c]">
                {minQty > 1 && `Min order: ${minQty}`}
                {minQty > 1 && allowedCap !== Infinity && " · "}
                {allowedCap !== Infinity && `Max per order: ${allowedCap}`}
              </p>
            )}
            {qtyError && (
              <p className="mt-2 text-[13px] text-red-500" role="alert">
                {qtyError}
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="inline-flex h-[64px] flex-1 cursor-pointer items-center justify-center rounded-[8px] border border-ink bg-white text-[16px] font-medium text-ink hover:bg-[#fafafa] disabled:opacity-50"
            >
              {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={product.stock === 0}
              className="inline-flex h-[64px] flex-1 cursor-pointer items-center justify-center rounded-[8px] bg-ink text-[16px] font-medium text-white hover:bg-black disabled:opacity-50"
            >
              Buy Now
            </button>
          </div>

          {(settings as { delivery_terms?: string }).delivery_terms ? (
            <button
              type="button"
              onClick={() => setShowDeliveryTerms(true)}
              className="self-start text-[14px] text-[#666666] underline underline-offset-4 hover:text-ink cursor-pointer"
            >
              Delivery T&amp;C
            </button>
          ) : null}

          {/* Trust badges row — admin-controlled via the same settings as the home FeatureStrip. */}
          {(() => {
            const s = settings as Record<string, unknown>;
            const num = (k: string) => Number((s[k] as number | string | undefined) ?? 0);
            const str = (k: string) => String((s[k] as string | undefined) || "");
            const items = [
              { key: "shipping", title: str("shipping_title"), desc: str("shipping_description"), enabled: num("shipping_mode") === 1 },
              { key: "return",   title: str("return_title"),   desc: str("return_description"),   enabled: num("return_mode")   === 1 },
              { key: "safety",   title: str("safety_security_title"), desc: str("safety_security_description"), enabled: num("safety_security_mode") === 1 },
              { key: "support",  title: str("support_title"),  desc: str("support_description"),  enabled: num("support_mode")  === 1 },
            ].filter((i) => i.enabled && i.title);

            const ICONS: Record<string, React.ReactElement> = {
              shipping: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="M3 7h11v9H3z" />
                  <path d="M14 10h4l3 3v3h-7z" />
                  <circle cx="7" cy="18" r="1.8" />
                  <circle cx="17" cy="18" r="1.8" />
                </svg>
              ),
              return: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="M9 14L4 9l5-5" />
                  <path d="M4 9h10a6 6 0 0 1 6 6v0a6 6 0 0 1-6 6H8" />
                </svg>
              ),
              safety: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              ),
              support: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="M4 12a8 8 0 1 1 16 0v4a3 3 0 0 1-3 3h-1v-7h4" />
                  <path d="M4 16a3 3 0 0 0 3 3h1v-7H4z" />
                </svg>
              ),
            };

            if (!items.length) return null;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                {items.map((it) => (
                  <div key={it.key} className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-brand-purple text-white">
                      {ICONS[it.key]}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-ink">{it.title}</div>
                      {it.desc && <div className="mt-0.5 text-[12px] text-[#605e5e]">{it.desc}</div>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="hidden text-[13px] text-[#8c8c8c]">
            {product.is_returnable ? "✓ Returns accepted" : "No returns"}
            {" · "}
            {product.cod_allowed ? "✓ Cash on delivery available" : "Online payment only"}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <>
          <hr className="my-16 border-[#e7e7e7] border-dashed border-t-2" />
          <section className="mt-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[26px] font-bold text-[#1C1C1C]">Related Product</h2>
              {relatedHasOverflow && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous"
                    onClick={() => relatedScrollRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
                    className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next"
                    onClick={() => relatedScrollRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
                    className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div
              ref={relatedScrollRef}
              className="flex gap-6 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {related.map((p) => {
                const rp = p as Product & { colors?: { id: number; value: string; swatche_value?: string | null }[] };
                const sp = Number(rp.special_price ?? 0);
                const rg = Number(rp.price ?? 0);
                const pr = sp && rg && sp < rg ? sp : rg;
                const sold = Number(p.no_of_ratings) || 0;
                return (
                  <Link key={p.id} href={`/product/${p.id}`} className="group flex shrink-0 w-[230px] flex-col cursor-pointer">
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[8px] bg-[#f9f9f9] border border-[#e7e7e7]">
                      <ProductImage
                        src={getCardImg(p)}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="mt-4 flex flex-col gap-1.5">
                      <h3 className="text-[15px] font-medium text-ink truncate">{p.name}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[17px] font-bold text-ink">{fmt(pr)}</span>
                        {sp > 0 && rg > sp && (
                          <span className="text-[13px] text-[#8c8c8c] line-through">{fmt(rg)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-[#605e5e]">
                        {Number(p.rating) > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-[#f5a524]" />
                            {Number(p.rating).toFixed(1)}
                          </span>
                        )}
                        {sold > 0 && (
                          <>
                            <span className="text-[#cfcfcf]">·</span>
                            <span>{sold} Sold</span>
                          </>
                        )}
                        {(rp.colors?.length ?? 0) > 0 && (
                          <span className="ml-auto flex items-center gap-1.5 pr-2">
                            {rp.colors!.slice(0, 4).map((c) => (
                              <span
                                key={c.id}
                                title={c.value}
                                className="h-[10px] w-[10px] rounded-full ring-1 ring-black/10"
                                style={{ backgroundColor: c.swatche_value || "#cccccc" }}
                              />
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Product Reviews */}
      <hr className="my-16 border-[#e7e7e7] border-dashed border-t-2" />
      <section>
        <h2 className="text-[26px] font-bold text-[#1C1C1C] mb-6">Product Review</h2>

        {ratingSummary && Number(ratingSummary.total) > 0 ? (
          <>
            {/* Top summary card — circular avg + horizontal bars */}
            {(() => {
              const total = Number(ratingSummary.total);
              const avg = Number(ratingSummary.avg_rating) || 0;
              const pct = (avg / 5) * 100;
              const fmtTotal = total >= 1000
                ? `${(total / 1000).toFixed(2).replace(/\.?0+$/, "")}k`
                : String(total);
              const ringSize = 96;
              const stroke = 6;
              const radius = (ringSize - stroke) / 2;
              const circ = 2 * Math.PI * radius;
              return (
                <div className="rounded-[14px] border-2 border-dashed border-[#e7e7e7] bg-white p-8 md:p-10 mb-8">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {/* Left: circle + stars */}
                    <div className="flex items-center gap-5 md:w-[280px] shrink-0">
                      <div className="relative" style={{ width: ringSize, height: ringSize }}>
                        <svg width={ringSize} height={ringSize} className="-rotate-90">
                          <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} stroke="#f0f0f0" strokeWidth={stroke} fill="none" />
                          <circle
                            cx={ringSize / 2}
                            cy={ringSize / 2}
                            r={radius}
                            stroke="#f5a524"
                            strokeWidth={stroke}
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={circ}
                            strokeDashoffset={circ - (pct / 100) * circ}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-[24px] font-bold text-ink">
                          {avg.toFixed(1)}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <StarRow value={avg} size={16} />
                        <span className="text-[13px] text-[#8c8c8c]">from {fmtTotal} reviews</span>
                      </div>
                    </div>

                    {/* Right: bars */}
                    <div className="flex-1 flex flex-col gap-4">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = Number((ratingSummary as Record<string, number>)[`r${star}`] || 0);
                        const widthPct = total > 0 ? (count / total) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-3 text-[12px]">
                            <span className="inline-flex items-center gap-1 w-10 text-[#525151] font-medium">
                              {star.toFixed(1)}
                              <Star className="h-3 w-3 text-[#f5a524]" />
                            </span>
                            <div className="flex-1 h-[8px] rounded-full bg-[#eaeaea] overflow-hidden">
                              <div className="h-full bg-ink rounded-full" style={{ width: `${widthPct}%` }} />
                            </div>
                            <span className="w-12 text-right text-[#525151] font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Two-column: filter + reviews */}
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
              {/* Filter sidebar */}
              <aside className="rounded-[12px] border-2 border-dashed border-[#e7e7e7] p-5 h-fit">
                <h3 className="text-[15px] font-bold text-ink pb-4 mb-4 border-b border-[#eee]">Reviews Filter</h3>
                <details open className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none mb-3">
                    <span className="text-[14px] font-semibold text-ink">Rating</span>
                    <svg className="h-3.5 w-3.5 text-[#525151] transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 15l6-6 6 6" /></svg>
                  </summary>
                  <div className="flex flex-col gap-3 pl-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const checked = reviewRatingFilter.has(star);
                      return (
                        <label key={star} className="flex items-center gap-2.5 cursor-pointer text-[13px] text-[#525151] hover:text-ink">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setReviewRatingFilter((prev) => {
                                const next = new Set(prev);
                                if (checked) next.delete(star); else next.add(star);
                                return next;
                              });
                              setReviewPage(1);
                            }}
                            className="h-4 w-4 rounded border-[#cfcfcf]"
                          />
                          <Star className="h-4 w-4 text-[#f5a524]" />
                          <span className="text-ink font-medium">{star}</span>
                        </label>
                      );
                    })}
                  </div>
                </details>
                <hr className="my-5 border-t border-dashed border-[#e7e7e7]" />
                <details open className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none mb-3">
                    <span className="text-[14px] font-semibold text-ink">Review Topics</span>
                    <svg className="h-3.5 w-3.5 text-[#525151] transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 15l6-6 6 6" /></svg>
                  </summary>
                  <div className="flex flex-col gap-3 pl-1">
                    {["Product Quality", "Seller Services", "Product Price", "Shipment", "Match with Description"].map((topic) => {
                      const checked = reviewTopicFilter.has(topic);
                      return (
                        <label key={topic} className="flex items-center gap-2.5 cursor-pointer text-[13px] text-[#525151] hover:text-ink">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setReviewTopicFilter((prev) => {
                                const next = new Set(prev);
                                if (checked) next.delete(topic); else next.add(topic);
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-[#cfcfcf]"
                          />
                          <span>{topic}</span>
                        </label>
                      );
                    })}
                  </div>
                </details>
              </aside>

              {/* Right: tabs + reviews */}
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h3 className="text-[15px] font-bold text-ink">Review Lists</h3>
                  <div className="flex items-center gap-2">
                    {([
                      { key: "all", label: "All Reviews" },
                      { key: "photo", label: "With Photo & Video" },
                      { key: "desc", label: "With Description" },
                    ] as const).map((t) => {
                      const active = reviewTab === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => { setReviewTab(t.key); setReviewPage(1); }}
                          className={active
                            ? "inline-flex h-[34px] items-center justify-center rounded-[6px] border border-ink bg-white px-4 text-[12px] font-semibold text-ink"
                            : "inline-flex h-[34px] items-center justify-center rounded-[6px] border border-[#e7e7e7] bg-white px-4 text-[12px] font-medium text-[#525151] hover:border-ink hover:text-ink"
                          }
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(() => {
                  // Apply tab + rating filters client-side over the loaded ratings.
                  const filtered = ratingList.filter((r) => {
                    if (reviewRatingFilter.size > 0 && !reviewRatingFilter.has(Math.round(Number(r.rating)))) return false;
                    if (reviewTab === "photo" && parseReviewMedia(r.images).length === 0) return false;
                    if (reviewTab === "desc" && !(r.comment && r.comment.trim().length > 0)) return false;
                    return true;
                  });

                  const perPage = 4;
                  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
                  const safePage = Math.min(reviewPage, totalPages);
                  const visible = filtered.slice((safePage - 1) * perPage, safePage * perPage);

                  if (filtered.length === 0) {
                    return (
                      <div className="rounded-[12px] border border-dashed border-[#e7e7e7] bg-[#fafafa] p-10 text-center">
                        <p className="text-[14px] text-[#8c8c8c]">No reviews match these filters.</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="flex flex-col">
                        {visible.map((r, idx) => {
                          const reviewMedia = parseReviewMedia(r.images);
                          return (
                          <div key={r.id} className={`flex flex-col gap-2 py-5 ${idx > 0 ? "border-t border-dashed border-[#e7e7e7]" : ""}`}>
                            <StarRow value={Number(r.rating)} size={14} />
                            {r.comment && <p className="text-[14px] font-medium text-ink leading-snug">{r.comment}</p>}
                            {reviewMedia.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-2">
                                {reviewMedia.map((m, mIdx) => (
                                  <button
                                    key={m.url}
                                    type="button"
                                    onClick={() => setLightbox({ media: reviewMedia, index: mIdx })}
                                    aria-label={m.type === "video" ? "Play review video" : "View review photo"}
                                    className="relative h-[78px] w-[78px] shrink-0 overflow-hidden rounded-[8px] border border-[#e7e7e7] bg-[#f6f6f8] hover:border-ink transition-colors"
                                  >
                                    {m.type === "image" ? (
                                      /* eslint-disable-next-line @next/next/no-img-element */
                                      <img src={resolveImg(m.url)} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <>
                                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                        <video src={resolveImg(m.url)} className="h-full w-full object-cover" preload="metadata" />
                                        <span className="absolute inset-0 flex items-center justify-center text-white bg-black/15">
                                          <svg className="h-7 w-7 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                          </svg>
                                        </span>
                                      </>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            <span className="text-[12px] text-[#8c8c8c]">{formatDate(r.data_added)}</span>
                            <div className="mt-1 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-brand-purple text-white text-[11px] font-semibold">
                                  {(r.username || "U").charAt(0).toUpperCase()}
                                </div>
                                <span className="text-[13px] font-semibold text-ink">{r.username || "Anonymous"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[12px] text-[#525151]">
                                {(() => {
                                  const myVote = Number(r.user_vote || 0);
                                  const liked = myVote === 1;
                                  const disliked = myVote === -1;
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => voteOnRating(r.id, myVote, 1)}
                                        className={`inline-flex h-[34px] items-center gap-1.5 rounded-[8px] border bg-white px-3 text-[12px] font-medium transition-colors ${liked ? "border-ink text-ink" : "border-[#e7e7e7] text-ink hover:border-ink"}`}
                                      >
                                        <SlLike className="h-4 w-4" />
                                        {Number(r.like_count || 0)}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => voteOnRating(r.id, myVote, -1)}
                                        className={`inline-flex h-[34px] items-center gap-1.5 rounded-[8px] border bg-white px-3 text-[12px] font-medium transition-colors ${disliked ? "border-ink text-ink" : "border-[#e7e7e7] text-[#525151] hover:border-ink hover:text-ink"}`}
                                      >
                                        <SlDislike className="h-4 w-4" />
                                        {Number(r.dislike_count || 0)}
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1.5 mt-4">
                          {Array.from({ length: totalPages }).map((_, i) => {
                            const page = i + 1;
                            const active = page === safePage;
                            return (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setReviewPage(page)}
                                className={active
                                  ? "flex h-[34px] w-[34px] items-center justify-center rounded-[6px] bg-ink text-[12px] font-semibold text-white"
                                  : "flex h-[34px] w-[34px] items-center justify-center rounded-[6px] border border-[#e7e7e7] text-[12px] font-medium text-[#525151] hover:border-ink hover:text-ink"
                                }
                              >
                                {page}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setReviewPage(Math.min(totalPages, safePage + 1))}
                            disabled={safePage >= totalPages}
                            className="flex h-[34px] w-[34px] items-center justify-center rounded-[6px] border border-[#e7e7e7] text-[#525151] hover:border-ink hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[14px] border border-dashed border-[#e7e7e7] bg-[#fafafa] p-10 text-center">
            <div className="text-[40px] mb-2">⭐</div>
            <p className="text-[15px] font-semibold text-ink">No reviews yet</p>
            <p className="text-[13px] text-[#8c8c8c] mt-1">Be the first to review this product after purchase.</p>
          </div>
        )}
      </section>

      {/* Popular This Week */}
      {popular.length > 0 && (
        <>
          <hr className="my-16 border-[#e7e7e7] border-dashed border-t-2" />
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[26px] font-bold text-[#1C1C1C]">Popular This Week</h2>
              {popularHasOverflow && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous"
                    onClick={() => popularScrollRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
                    className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next"
                    onClick={() => popularScrollRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
                    className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <div
              ref={popularScrollRef}
              className="flex gap-6 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {popular.map((p) => {
                const rp = p as Product & { colors?: { id: number; value: string; swatche_value?: string | null }[] };
                const sp = Number(rp.special_price ?? 0);
                const rg = Number(rp.price ?? 0);
                const pr = sp && rg && sp < rg ? sp : rg;
                return (
                  <Link key={p.id} href={`/product/${p.id}`} className="group relative flex shrink-0 w-[230px] flex-col cursor-pointer">
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[8px] bg-[#f9f9f9] border border-[#e7e7e7]">
                      <ProductImage
                        src={getCardImg(p)}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Quick wishlist + add-to-cart buttons */}
                      <div className="absolute right-3 top-3 z-10 flex flex-col items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={wishlist.has(p.id) ? "Remove from wishlist" : "Add to wishlist"}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            wishlist.toggle({
                              id: p.id,
                              name: p.name,
                              image: p.image,
                              slug: p.slug,
                              price: Number(rp.special_price ?? 0) || Number(rp.price ?? 0),
                              list_price: Number(rp.price ?? 0) || undefined,
                              status: p.status,
                            });
                          }}
                          className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white shadow-sm hover:bg-[#fafafa]"
                        >
                          {wishlist.has(p.id)
                            ? <HeartFill className="h-[18px] w-[18px] text-[#D90A0A]" />
                            : <IoMdHeartEmpty className="h-[18px] w-[18px] text-[#a3a3a3]" />}
                        </button>
                        <button
                          type="button"
                          aria-label="Add to cart"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addToCart({
                              id: p.id,
                              name: p.name,
                              image: p.image || "",
                              price: Number(rp.special_price ?? 0) || Number(rp.price ?? 0),
                            }, 1);
                            showToast("Product added to cart.");
                          }}
                          className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white shadow-sm hover:bg-[#fafafa] text-ink"
                        >
                          <IoCart className="h-[18px] w-[18px]" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-1.5">
                      <h3 className="text-[15px] font-medium text-ink truncate group-hover:underline">{p.name}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[17px] font-bold text-ink">{fmt(pr)}</span>
                        {sp > 0 && rg > sp && (
                          <span className="text-[13px] text-[#8c8c8c] line-through">{fmt(rg)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-[#605e5e]">
                        {Number(p.rating) > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-[#f5a524]" />
                            {Number(p.rating).toFixed(1)}
                          </span>
                        )}
                        {(rp.colors?.length ?? 0) > 0 && (
                          <span className="ml-auto flex items-center gap-1.5 pr-2">
                            {rp.colors!.slice(0, 4).map((c) => (
                              <span
                                key={c.id}
                                title={c.value}
                                className="h-[10px] w-[10px] rounded-full ring-1 ring-black/10"
                                style={{ backgroundColor: c.swatche_value || "#cccccc" }}
                              />
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}

      {showSizeChart && product.size_chart && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSizeChart(false)}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <div className="relative flex max-h-[90vh] w-full max-w-[720px] flex-col rounded-[12px] bg-white shadow-2xl pointer-events-auto">
              {/* Sticky header */}
              <div className="flex items-center justify-between border-b border-[#eee] px-6 py-4">
                <h3 className="text-[18px] font-bold text-ink">Size Chart</h3>
                <button
                  type="button"
                  onClick={() => setShowSizeChart(false)}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#525151] hover:bg-[#f5f5f5]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Scrollable body — both vertical (long content) and horizontal (wide tables on mobile) */}
              <div
                className="flex-1 overflow-y-auto overflow-x-auto px-6 py-5 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-[#e7e7e7] [&_th]:bg-[#f9f9f9] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-[#e7e7e7] [&_td]:px-3 [&_td]:py-2 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-[8px] prose prose-sm max-w-none text-[14px] text-ink"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#cfcfcf transparent" }}
              >
                <div dangerouslySetInnerHTML={{ __html: product.size_chart }} />
              </div>
            </div>
          </div>
        </>
      )}

      {showDeliveryTerms && (settings as { delivery_terms?: string }).delivery_terms && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeliveryTerms(false)}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <div className="relative flex max-h-[90vh] w-full max-w-[720px] flex-col rounded-[12px] bg-white shadow-2xl pointer-events-auto">
              <div className="flex items-center justify-between border-b border-[#eee] px-6 py-4">
                <h3 className="text-[18px] font-bold text-ink">Delivery T&amp;C</h3>
                <button
                  type="button"
                  onClick={() => setShowDeliveryTerms(false)}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#525151] hover:bg-[#f5f5f5]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div
                className="flex-1 overflow-y-auto overflow-x-auto px-6 py-5 prose prose-sm max-w-none text-[14px] text-ink [&_a]:text-brand-purple [&_a]:underline [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-[#e7e7e7] [&_th]:bg-[#f9f9f9] [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-[#e7e7e7] [&_td]:px-3 [&_td]:py-2"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#cfcfcf transparent" }}
              >
                <div dangerouslySetInnerHTML={{ __html: (settings as { delivery_terms?: string }).delivery_terms || "" }} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Review media lightbox */}
      {lightbox && (() => {
        const m = lightbox.media[lightbox.index];
        const hasPrev = lightbox.index > 0;
        const hasNext = lightbox.index < lightbox.media.length - 1;
        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 px-4"
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-label="Review media viewer"
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            {hasPrev && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightbox({ media: lightbox.media, index: lightbox.index - 1 }); }}
                aria-label="Previous"
                className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightbox({ media: lightbox.media, index: lightbox.index + 1 }); }}
                aria-label="Next"
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
            <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
              {m.type === "image" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={resolveImg(m.url)} alt="" className="max-h-[90vh] max-w-[90vw] rounded-[10px] object-contain" />
              ) : (
                /* eslint-disable-next-line jsx-a11y/media-has-caption */
                <video
                  src={resolveImg(m.url)}
                  controls
                  autoPlay
                  className="max-h-[90vh] max-w-[90vw] rounded-[10px]"
                />
              )}
            </div>
            {lightbox.media.length > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[12px] font-semibold text-white">
                {lightbox.index + 1} / {lightbox.media.length}
              </div>
            )}
          </div>
        );
      })()}

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setIsAuthed(true);
          setShowAuth(false);
          addToCart(
      {
        id: product.id,
        name: product.name,
        image: images[0],
        price: current,
        minQty,
        maxQty: Number.isFinite(maxQty) ? (maxQty as number) : undefined,
        step: stepSize,
        stock: product.stock,
        tax_percentage: Number(product.tax_percentage || 0),
        is_prices_inclusive_tax: Number(product.is_prices_inclusive_tax || 0),
        size: selectedSize?.value,
        color: selectedColor
          ? { name: selectedColor.value, swatch: String(selectedColor.swatche_value || "").trim() || undefined }
          : undefined,
        variant_id: matchedVariant?.id,
      },
      qty,
    );
          window.location.href = `${BASE}/checkout`;
        }}
      />

      {/* Added to Cart Popup */}
      {showCartPopup && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]" />
          <div className="fixed bottom-10 left-1/2 z-[100] flex -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-[12px] bg-white px-6 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#e7e7e7]">
              <CheckCircleSolid className="h-6 w-6 text-green-600" />
              <span className="text-[15px] font-medium text-ink">{popupMsg}</span>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
