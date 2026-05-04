"use client";

import Link from "next/link";
import { useWishlist } from "@/lib/wishlistContext";
import { useCart } from "@/lib/cartContext";
import { imgUrl } from "@/lib/api";
import ProductImage from "../components/ProductImage";
import { Trash2, HeartFill } from "../components/icons";

export const dynamic = "force-dynamic";

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

export default function WishlistPage() {
  const { items, remove } = useWishlist();
  const { addToCart } = useCart();

  function moveToCart(item: typeof items[number]) {
    addToCart(
      {
        id: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
      },
      1,
    );
    remove(item.id);
  }

  if (items.length === 0) {
    return (
      <div className="w-full bg-white min-h-screen">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-20 md:px-8 flex flex-col items-center justify-center gap-6">
          <div className="text-[80px]"><HeartFill className="h-20 w-20 text-[#fadcdc]" /></div>
          <h2 className="text-[28px] font-bold text-ink">Your wishlist is empty</h2>
          <p className="text-[15px] text-[#525151]">Tap the heart on any product to save it for later.</p>
          <Link
            href="/"
            className="inline-flex h-[54px] items-center justify-center rounded-[10px] bg-ink px-10 text-[16px] font-bold text-white hover:bg-black"
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-8">
        <div className="flex items-baseline gap-2 mb-6">
          <h1 className="text-[24px] font-bold text-ink">My Wishlist</h1>
          <span className="text-[13px] text-[#8c8c8c]">{items.length} {items.length === 1 ? "item" : "items"}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <div key={item.id} className="group relative flex flex-col overflow-hidden rounded-[16px] border border-[#e7e7e7] bg-white hover:shadow-md transition-shadow">
              <Link href={`/product/${item.id}`} className="flex aspect-square items-center justify-center bg-[#f9f9f9] p-3">
                <ProductImage src={resolveImg(item.image)} alt={item.name} className="h-full w-full object-contain" />
              </Link>

              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label="Remove from wishlist"
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#9c9c9c] shadow-sm hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <div className="flex flex-col gap-2 p-3 border-t border-[#eeeeee]">
                <Link href={`/product/${item.id}`} className="text-[13px] font-medium text-ink hover:underline line-clamp-2 min-h-[34px]">
                  {item.name}
                </Link>
                <div className="flex items-baseline gap-2">
                  <span className="text-[14px] font-bold text-ink">{fmt(item.price)}</span>
                  {item.list_price && item.list_price > item.price && (
                    <span className="text-[12px] text-[#8c8c8c] line-through">{fmt(item.list_price)}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => moveToCart(item)}
                  className="mt-1 h-[36px] rounded-[8px] bg-ink text-[12px] font-bold text-white hover:bg-black transition-colors"
                >
                  Move to cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
