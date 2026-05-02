"use client";

import { useEffect, useState } from "react";
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
import { type ProductDetail, type Product, type ProductRating, type RatingSummary, imgUrl } from "@/lib/api";
import { useCart } from "@/lib/cartContext";
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

function formatDate(s: string | undefined) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  const v = Math.round(Number(value) || 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={n <= v ? "text-[#f5a524]" : "text-[#e0e0e0]"} style={{ width: size, height: size }} />
      ))}
    </div>
  );
}

export default function ProductDetailClient({
  product,
  related,
  ratings = [],
  ratingSummary,
  popular = [],
}: {
  product: ProductDetail;
  related: Product[];
  ratings?: ProductRating[];
  ratingSummary?: RatingSummary;
  popular?: Product[];
}) {
  const images = parseImages(product);
  const { current, original } = getPrice(product);

  const minQty = Math.max(1, Number(product.minimum_order_quantity) || 1);
  const stepSize = Math.max(1, Number(product.quantity_step_size) || 1);
  const stockCap = product.stock != null ? Number(product.stock) : Infinity;
  const allowedCap = product.total_allowed_quantity != null
    ? Number(product.total_allowed_quantity)
    : Infinity;
  const maxQty = Math.min(stockCap, allowedCap);
  const isOutOfStock = product.stock === 0 || maxQty < minQty;

  const { addToCart } = useCart();
  const [activeImg, setActiveImg] = useState(images[0]);
  const [qty, setQty] = useState(minQty);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [popupMsg, setPopupMsg] = useState("Product added to cart.");
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [qtyError, setQtyError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/v1/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setIsAuthed(Boolean(j?.data?.user)))
      .catch(() => setIsAuthed(false));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wishlist");
      const ids: number[] = raw ? JSON.parse(raw) : [];
      setIsWishlisted(ids.includes(product.id));
    } catch {}
  }, [product.id]);

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

  const handleWishlist = () => {
    if (!isAuthed) {
      setShowAuth(true);
      return;
    }
    try {
      const raw = localStorage.getItem("wishlist");
      const ids: number[] = raw ? JSON.parse(raw) : [];
      const next = ids.includes(product.id) ? ids.filter((i) => i !== product.id) : [...ids, product.id];
      localStorage.setItem("wishlist", JSON.stringify(next));
      const added = next.includes(product.id);
      setIsWishlisted(added);
      showToast(added ? "Added to wishlist." : "Removed from wishlist.");
    } catch {
      showToast("Could not update wishlist.");
    }
  };

  const handleBuyNow = () => {
    if (isOutOfStock) {
      setQtyError("This product is out of stock.");
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
      },
      qty,
    );
    window.location.href = `${BASE}/checkout`;
  };

  const breadcrumbs = [
    { label: "Homepage", href: "/" },
    ...(product.category_name
      ? [{ label: product.category_name, href: product.category_slug ? `/${product.category_slug}` : "/" }]
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
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          <div className="flex gap-4">
            <div
              className="relative flex aspect-[4/5] flex-1 items-center justify-center rounded-[20px] border border-[#e7e7e7] overflow-hidden bg-[#f9f9f9] shadow-sm"
            >
              <div
                className="absolute top-0 right-0 z-10 flex h-11 items-center justify-center bg-gradient-to-r from-[#FFF3B8] to-[#FFE602] px-8 pr-12 text-[15px] font-bold text-ink shadow-sm"
                style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 8% 50%)" }}
              >
                Trusted Seller
              </div>
              <ProductImage src={activeImg} alt={product.name} className="h-[95%] w-[95%] object-contain" />
            </div>

            <div className="flex flex-col gap-4 pt-2">
              <button
                onClick={handleShare}
                aria-label="Share product"
                className="flex h-[52px] w-[52px] items-center justify-center rounded-[10px] bg-[#f5f5f5] text-ink hover:bg-[#e0e0e0] shadow-sm"
              >
                <ShareIcon className="h-6 w-6" />
              </button>
              <button
                onClick={handleWishlist}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={isWishlisted}
                className={`flex h-[52px] w-[52px] items-center justify-center rounded-[10px] shadow-sm transition-colors ${isWishlisted ? "bg-[#fdecec] text-red-500 hover:bg-[#fadcdc]" : "bg-[#f5f5f5] text-ink hover:bg-[#e0e0e0]"}`}
              >
                {isWishlisted ? <HeartFill className="h-6 w-6" /> : <HeartLine className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(img)}
                  className={`relative flex aspect-square w-[100px] shrink-0 items-center justify-center rounded-[12px] border ${activeImg === img ? "border-ink" : "border-[#e7e7e7]"} bg-[#f9f9f9] overflow-hidden shadow-sm transition-all`}
                >
                  <ProductImage src={img} alt={`view ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          <div>
            {product.short_description && (
              <div className="mb-2 text-[13px] text-[#525151]">{product.short_description}</div>
            )}
            <div className="flex items-start justify-between">
              <h1 className="text-[28px] font-semibold leading-tight text-ink md:text-[32px]">
                {product.name}
              </h1>
              <div className="flex flex-col items-end pt-1 ml-4 shrink-0">
                {Number(product.rating) > 0 && (
                  <div className="flex items-center gap-1 text-[18px] font-bold text-ink">
                    <Star className="h-5 w-5 text-[#f5a524]" />
                    {Number(product.rating).toFixed(1)}
                  </div>
                )}
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-[4px] bg-[#fdf2f8] px-2 py-1 text-[11px] font-semibold text-[#8b005d] ring-1 ring-[#fbcfe8]">
                  Fulfilled by <span className="font-bold text-brand-purple ml-1">SUVCRAFT</span>
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-3">
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
          {product.description && (
            <div className="border-t-2 border-dashed border-[#e7e7e7] pt-6">
              <h3 className="mb-3 text-[18px] font-semibold text-ink">Description :</h3>
              <div
                className="text-[13px] leading-relaxed text-[#525151] prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
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
              className="inline-flex h-[54px] flex-1 items-center justify-center rounded-[10px] bg-ink text-[16px] font-bold text-white hover:bg-black disabled:opacity-50"
            >
              {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={product.stock === 0}
              className="inline-flex h-[54px] w-[160px] items-center justify-center rounded-[10px] border border-ink text-[16px] font-bold text-ink hover:bg-black/5 disabled:opacity-50"
            >
              Buy Now
            </button>
          </div>

          <div className="text-[13px] text-[#8c8c8c]">
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
            <h2 className="text-[26px] font-bold text-ink mb-8">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((p) => {
                const rp = p as any;
                const sp = Number(rp.special_price ?? 0);
                const rg = Number(rp.price ?? 0);
                const pr = sp && rg && sp < rg ? sp : rg;
                return (
                  <Link key={p.id} href={`/product/${p.id}`} className="group flex flex-col cursor-pointer">
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[20px] bg-[#f9f9f9] border border-[#e7e7e7]">
                      <ProductImage
                        src={getCardImg(p)}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="mt-4 flex flex-col gap-1">
                      <h3 className="text-[15px] font-medium text-ink truncate">{p.name}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-[17px] font-bold text-ink">{fmt(pr)}</span>
                      </div>
                      {Number(p.rating) > 0 && (
                        <div className="flex items-center gap-1 text-[13px] text-[#605e5e]">
                          <Star className="h-3.5 w-3.5 text-[#f5a524]" />
                          {Number(p.rating).toFixed(1)}
                        </div>
                      )}
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
        <div className="flex flex-col gap-1 mb-8">
          <h2 className="text-[26px] font-bold text-ink">Product Reviews</h2>
          <p className="text-[13px] text-[#8c8c8c]">What buyers are saying about this product</p>
        </div>

        {ratingSummary && Number(ratingSummary.total) > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Summary card */}
            <div className="lg:col-span-1 rounded-[16px] border border-[#e7e7e7] bg-[#fafafa] p-6">
              <div className="flex items-baseline gap-2">
                <span className="text-[44px] font-bold text-ink leading-none">{Number(ratingSummary.avg_rating).toFixed(1)}</span>
                <span className="text-[14px] text-[#8c8c8c]">/ 5</span>
              </div>
              <div className="mt-2"><StarRow value={Number(ratingSummary.avg_rating)} size={18} /></div>
              <p className="mt-1 text-[13px] text-[#8c8c8c]">{Number(ratingSummary.total)} {Number(ratingSummary.total) === 1 ? "review" : "reviews"}</p>

              <div className="mt-6 flex flex-col gap-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = Number((ratingSummary as Record<string, number>)[`r${star}`] || 0);
                  const pct = ratingSummary.total ? (count / Number(ratingSummary.total)) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-[12px]">
                      <span className="w-8 text-[#525151]">{star}★</span>
                      <div className="flex-1 h-2 rounded-full bg-[#eaeaea] overflow-hidden">
                        <div className="h-full bg-[#f5a524] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-[#8c8c8c]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Review list */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {ratings.map((r) => (
                <div key={r.id} className="rounded-[14px] border border-[#e7e7e7] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-brand-purple text-white font-semibold">
                      {(r.username || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold text-ink">{r.username || "Anonymous"}</div>
                      <div className="flex items-center gap-2 text-[12px] text-[#8c8c8c]">
                        <StarRow value={Number(r.rating)} size={12} />
                        <span>·</span>
                        <span>{formatDate(r.data_added)}</span>
                      </div>
                    </div>
                  </div>
                  {r.comment && <p className="mt-3 text-[14px] leading-relaxed text-[#525151]">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
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
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-[26px] font-bold text-ink">Popular This Week</h2>
                <p className="text-[13px] text-[#8c8c8c] mt-1">Trending picks loved by other shoppers</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {popular.map((p) => {
                const rp = p as Product;
                const sp = Number(rp.special_price ?? 0);
                const rg = Number(rp.price ?? 0);
                const pr = sp && rg && sp < rg ? sp : rg;
                return (
                  <Link key={p.id} href={`/product/${p.id}`} className="group flex flex-col cursor-pointer">
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[20px] bg-[#f9f9f9] border border-[#e7e7e7]">
                      <ProductImage
                        src={getCardImg(p)}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {Number(p.no_of_ratings) > 0 && (
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-ink shadow-sm">
                          <Star className="h-3 w-3 text-[#f5a524]" />
                          {Number(p.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-col gap-1">
                      <h3 className="text-[15px] font-medium text-ink truncate group-hover:underline">{p.name}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-[17px] font-bold text-ink">{fmt(pr)}</span>
                        {sp > 0 && rg > sp && (
                          <span className="text-[13px] text-[#8c8c8c] line-through">{fmt(rg)}</span>
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
