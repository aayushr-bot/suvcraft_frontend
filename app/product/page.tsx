"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CartIcon,
  ChevronRight,
  HeartLine,
  MinusIcon,
  Plus,
  ShareIcon,
  Star,
  StarHalf,
  ThumbUp,
  ThumbDown,
  Flag,
  TagIcon,
  BoltIcon,
  CheckCircleSolid
} from "../components/icons";

const breadcrumbs = [
  { label: "Homepage", href: "/" },
  { label: "Our All Products", href: "/products" },
  { label: "Clothing", href: "/clothing" },
  { label: "A-line pink dress for women", href: "#", current: true },
];

const images = [
  "/figma/prod-dress.png",
  "/figma/woman-top1.png",
  "/figma/woman-top2.jpg",
  "/figma/Woman-top3.jpg",
];

const sizes = ["S", "M", "L", "XL", "XXL", "3XL"];
const colors = [
  { name: "Pink", value: "#ffc0cb" },
  { name: "Red", value: "#ff9999" },
  { name: "Yellow", value: "#ffff99" },
  { name: "Light Pink", value: "#ffe6e6" },
];

const relatedProducts = [
  { img: "/figma/dress1.jpg", title: "Blue A line dress for women", price: 1200, oldPrice: 1300, rating: 4.9, sold: 500, colors: ["#8b0000", "#1a1a1a", "#000080", "#f4c430"] },
  { img: "/figma/dress2.jpg", title: "Blue A line dress for women", price: 1200, oldPrice: 1300, rating: 4.9, sold: 500, colors: ["#8b0000", "#1a1a1a", "#000080", "#f4c430"] },
  { img: "/figma/dress3.jpg", title: "Blue A line dress for women", price: 1200, oldPrice: 1300, rating: 4.9, sold: 500, colors: ["#8b0000", "#1a1a1a", "#000080", "#f4c430"] },
  { img: "/figma/dress4.jpg", title: "Blue A line dress for women", price: 1200, oldPrice: 1300, rating: 4.9, sold: 500, colors: ["#8b0000", "#1a1a1a", "#000080", "#f4c430"] },
];

const reviews = [
  { name: "Bessie Cooper", date: "Jan 1, 2023 - 22 mins ago", text: "This is amazing product I have.", rating: 5, likes: 20 },
  { name: "Jane Cooper", date: "Jan 1, 2023 - 22 mins ago", text: "This is amazing product I have.", rating: 5, likes: 20 },
  { name: "Brooklyn Simmons", date: "Jan 1, 2023 - 22 mins ago", text: "This is amazing product I have.", rating: 5, likes: 20 },
  { name: "Savannah Nguyen", date: "Jan 1, 2023 - 22 mins ago", text: "This is amazing product I have.", rating: 5, likes: 20 },
];

export default function ProductDetail() {
  const [activeImg, setActiveImg] = useState(images[0]);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState("S");
  const [showCartPopup, setShowCartPopup] = useState(false);

  const handleAddToCart = () => {
    setShowCartPopup(true);
    setTimeout(() => {
      setShowCartPopup(false);
    }, 3000);
  };
  const [selectedColor, setSelectedColor] = useState(colors[0].name);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 bg-white min-h-screen no-scrollbar">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[13px] text-[#8c8c8c]">
        {breadcrumbs.map((b, i) => (
          <div key={b.label} className="flex items-center gap-2">
            <Link
              href={b.href}
              className={b.current ? "font-medium text-ink" : "hover:text-ink"}
            >
              {b.label}
            </Link>
            {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
          </div>
        ))}
      </nav>

      {/* Main Product Section */}
      <div className="mt-8 flex flex-col items-start gap-8 md:flex-row lg:gap-12">
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          <div className="flex gap-4">
            <div 
              className="relative flex aspect-[4/5] flex-1 items-center justify-center rounded-[20px] border border-[#e7e7e7] overflow-hidden bg-cover bg-center shadow-sm"
              style={{ backgroundImage: "url('/figma/background-color.jpg')" }}
            >
              <div 
                className="absolute top-0 right-0 z-10 flex h-11 items-center justify-center bg-gradient-to-r from-[#FFF3B8] to-[#FFE602] px-8 pr-12 text-[15px] font-bold text-ink shadow-sm"
                style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 8% 50%)" }}
              >
                Trusted Seller
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeImg} alt="Product" className="h-[95%] w-[95%] object-contain" />
            </div>
            
            {/* Action Buttons Column */}
            <div className="flex flex-col gap-4 pt-2">
              <button className="flex h-[52px] w-[52px] items-center justify-center rounded-[10px] bg-[#f5f5f5] text-ink hover:bg-[#e0e0e0] shadow-sm">
                <ShareIcon className="h-6 w-6" />
              </button>
              <button className="flex h-[52px] w-[52px] items-center justify-center rounded-[10px] bg-[#f5f5f5] text-ink hover:bg-[#e0e0e0] shadow-sm">
                <HeartLine className="h-6 w-6" />
              </button>
              
              {/* Vertical Arrows moved here */}
              <div className="mt-auto flex flex-col gap-3">
                <button className="flex h-[44px] w-[44px] items-center justify-center rounded-[6px] bg-[#f5f5f5] text-[#8c8c8c] hover:text-ink shadow-sm transition-colors">
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </button>
                <button className="flex h-[44px] w-[44px] items-center justify-center rounded-[6px] bg-[#f5f5f5] text-[#8c8c8c] hover:text-ink shadow-sm transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar" style={{ scrollbarWidth: "none" }}>
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(img)}
                className={`relative flex aspect-square w-[120px] shrink-0 items-center justify-center rounded-[12px] border ${activeImg === img ? "border-ink" : "border-[#e7e7e7]"} bg-paper overflow-hidden shadow-md transition-all`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Thumb ${i}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Info */}
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          <div>
            <div className="mb-2 text-[13px] text-[#525151]">
              Please write a brief summary regarding the exact product
            </div>
            <div className="flex items-start justify-between">
              <h1 className="text-[28px] font-semibold leading-tight text-ink md:text-[32px]">
                Pink A-Line Dress for Women
              </h1>
              <div className="flex flex-col items-end pt-1">
                <div className="flex items-center gap-1 text-[18px] font-bold text-ink">
                  <Star className="h-5 w-5 text-[#f5a524]" /> 4.9
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-[4px] bg-[#fdf2f8] px-2 py-1 text-[11px] font-semibold text-[#8b005d] ring-1 ring-[#fbcfe8]">
                  Fulfilled by <span className="font-bold text-brand-purple">SUVCRAFT</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[14px] text-[#8c8c8c] line-through">₹ 3,500</span>
              <span className="text-[26px] font-bold text-ink">₹ 2,400</span>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-[#e7e7e7] pt-6">
            <h3 className="mb-3 text-[18px] font-semibold text-ink">Description :</h3>
            <p className="text-[13px] leading-relaxed text-[#525151]">
              What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing and typesetting industry What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing and typesetting industry What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing and typesetting industry What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing and typesetting industry, <span className="font-bold text-ink cursor-pointer hover:underline">See More...</span>
            </p>
          </div>

          <div className="flex flex-col gap-4 pt-6">
            <div>
              <span className="mb-2 block text-[15px] font-medium text-ink">Color : <span className="font-normal text-[#525151]">{selectedColor}</span></span>
              <div className="flex gap-3">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    className={`h-[36px] w-[60px] rounded-[6px] ${selectedColor === c.name ? "ring-2 ring-ink ring-offset-2" : "ring-1 ring-[#e7e7e7]"}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[15px] font-medium text-ink">Size : <span className="font-normal text-[#525151]">{selectedSize}</span></span>
                <button className="text-[13px] font-medium text-[#8c8c8c] hover:text-ink underline">View Size Chart</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`flex h-[40px] min-w-[48px] items-center justify-center rounded-[8px] border px-3 text-[14px] font-medium ${selectedSize === s ? "border-ink bg-ink text-white" : "border-[#e7e7e7] text-ink hover:border-ink"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-[15px] font-medium text-ink">Quantity : <span className="font-normal text-[#525151]">{qty.toString().padStart(2, '0')}</span></span>
              <div className="inline-flex h-[44px] items-center rounded-[8px] border border-[#e7e7e7] bg-[#fdfdfd]">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="flex h-full w-[44px] items-center justify-center text-[#8c8c8c] hover:text-ink hover:bg-soft-gray rounded-l-[8px]"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="flex h-full w-[44px] items-center justify-center text-[15px] font-bold text-ink border-x border-[#e7e7e7]">
                  {qty.toString().padStart(2, '0')}
                </span>
                <button
                  onClick={() => setQty(qty + 1)}
                  className="flex h-full w-[44px] items-center justify-center text-[#8c8c8c] hover:text-ink hover:bg-soft-gray rounded-r-[8px]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

            <div className="mt-8 flex gap-4">
              <button 
                onClick={handleAddToCart}
                className="inline-flex h-[54px] flex-1 items-center justify-center rounded-[10px] bg-ink text-[16px] font-bold text-white hover:bg-black"
              >
                Add to Cart
              </button>
              <Link 
                href="/cart"
                className="inline-flex h-[54px] w-[180px] items-center justify-center rounded-[10px] border border-ink text-[16px] font-bold text-ink hover:bg-black/5"
              >
                Buy Now
              </Link>
            </div>

          <div className="text-[13px] text-[#8c8c8c]">
            Delivery T&C
          </div>
        </div>
      </div>

      <hr className="my-16 border-[#e7e7e7] border-dashed border-t-2" />

      {/* Related Products */}
      <ProductCarousel title="Related Product" products={relatedProducts} />

      {/* Reviews Section */}
      <div className="mt-16 bg-white">
        <h2 className="text-[26px] font-semibold text-ink mb-8">Product Review</h2>
        
        <div className="rounded-[15px] border-2 border-dashed border-[#e7e7e7] p-10 flex flex-col md:flex-row items-center gap-10">
          <div className="flex flex-col items-center gap-2">
            <div className="relative flex h-[100px] w-[100px] items-center justify-center">
              <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e7e7e7" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#f5a524" strokeWidth="8" strokeDasharray="282.7" strokeDashoffset="42.4" />
              </svg>
              <span className="absolute text-[24px] font-bold text-ink">4.5</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-[#f5a524]">
                <Star className="h-4 w-4" /><Star className="h-4 w-4" /><Star className="h-4 w-4" /><Star className="h-4 w-4" /><StarHalf className="h-4 w-4" />
              </div>
              <span className="text-[11px] text-[#8c8c8c] mt-1">from 1.25k reviews</span>
            </div>
          </div>

          <div className="flex-1 w-full flex flex-col gap-4">
            {[
              { stars: 5, pct: 85, count: 2123 },
              { stars: 4, pct: 70, count: 38 },
              { stars: 3, pct: 40, count: 4 },
              { stars: 2, pct: 15, count: 0 },
              { stars: 1, pct: 5, count: 0 },
            ].map(r => (
              <div key={r.stars} className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-[13px] font-medium text-[#525151] w-12">
                  {r.stars}.0 <Star className="h-3 w-3 text-[#f5a524]" />
                </span>
                <div className="flex-1 h-[6px] rounded-full bg-[#e7e7e7] overflow-hidden">
                  <div className="h-full bg-ink" style={{ width: `${r.pct}%` }} />
                </div>
                <span className="text-[12px] text-[#8c8c8c] w-10 text-right font-medium">{r.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col lg:flex-row gap-12">
          {/* Review Filter Sidebar */}
          <div className="lg:w-1/4 rounded-[15px] border-2 border-dashed border-[#e7e7e7] p-6 h-fit bg-[#fdfdfd]">
            <h3 className="text-[16px] font-bold text-ink mb-6 pb-2 border-b border-[#e7e7e7]">Reviews Filter</h3>
            
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[14px] font-bold text-ink">Rating</h4>
                <ChevronRight className="h-4 w-4 rotate-90 text-[#8c8c8c]" />
              </div>
              <div className="flex flex-col gap-3 pl-1">
                {[5, 4, 3, 2, 1].map(r => (
                  <label key={r} className="flex items-center gap-3 text-[14px] text-[#525151] cursor-pointer hover:text-ink">
                    <input type="checkbox" className="h-4 w-4 rounded border-[#cfcfcf] text-ink focus:ring-0" />
                    <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-[#f5a524]" /> {r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[14px] font-bold text-ink">Review Topics</h4>
                <ChevronRight className="h-4 w-4 rotate-90 text-[#8c8c8c]" />
              </div>
              <div className="flex flex-col gap-3 pl-1">
                {["Product Quality", "Seller Services", "Product Price", "Shipment", "Match with Description"].map(f => (
                  <label key={f} className="flex items-center gap-3 text-[14px] text-[#525151] cursor-pointer hover:text-ink">
                    <input type="checkbox" className="h-4 w-4 rounded border-[#cfcfcf] text-ink focus:ring-0" />
                    {f}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Review Lists Section */}
          <div className="lg:w-3/4">
            <h3 className="text-[16px] font-bold text-ink mb-6">Review Lists</h3>
            <div className="flex items-center gap-3 mb-8">
              <button className="h-[42px] px-6 rounded-[8px] bg-[#f0f0f0] border border-ink text-ink text-[13px] font-semibold">All Reviews</button>
              <button className="h-[42px] px-6 rounded-[8px] border border-[#e7e7e7] text-[#525151] text-[13px] hover:bg-soft-gray">With Photo & Video</button>
              <button className="h-[42px] px-6 rounded-[8px] border border-[#e7e7e7] text-[#525151] text-[13px] hover:bg-soft-gray">With Description</button>
            </div>

            <div className="flex flex-col gap-10">
              {reviews.map((r, i) => (
                <div key={i} className="flex flex-col gap-4 pb-8 border-b border-dashed border-[#e7e7e7] last:border-0">
                  <div className="flex items-center gap-1 text-[#f5a524]">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4" />)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="font-bold text-ink text-[16px]">{r.text}</h4>
                    <span className="text-[12px] text-[#8c8c8c]">July 2, 2023 03:29 PM</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#f0f0f0] overflow-hidden border border-[#e7e7e7]">
                         <img src="/figma/avatar1.png" alt="" className="h-full w-full object-cover" />
                      </div>
                      <span className="text-[14px] font-semibold text-ink">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="flex h-10 px-4 items-center gap-2 rounded-[6px] border border-[#e7e7e7] text-[13px] text-[#525151] hover:bg-soft-gray">
                        <ThumbUp className="h-4 w-4" /> {r.likes}
                      </button>
                      <button className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#e7e7e7] text-[#525151] hover:bg-soft-gray">
                        <ThumbDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center items-center gap-2 mt-12">
              <button className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-ink bg-white text-ink text-[14px] font-bold">1</button>
              <button className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#e7e7e7] text-[#8c8c8c] hover:border-ink hover:text-ink text-[14px]">2</button>
              <button className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#e7e7e7] text-[#8c8c8c] hover:border-ink hover:text-ink text-[14px]">3</button>
              <button className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#e7e7e7] text-[#8c8c8c] hover:border-ink hover:text-ink text-[14px]">10</button>
              <button className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#e7e7e7] text-[#8c8c8c] hover:border-ink hover:text-ink">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-16 border-[#e7e7e7] border-dashed border-t-2" />

      {/* Popular This Week */}
      <ProductCarousel title="Popular This Week" products={relatedProducts} />

      {/* Added to Cart Popup & Backdrop */}
      {showCartPopup && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300" />
          <div className="fixed bottom-10 left-1/2 z-[100] flex -translate-x-1/2 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-3 rounded-[12px] bg-white px-6 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#e7e7e7]">
              <CheckCircleSolid className="h-6 w-6 text-green-600" />
              <span className="text-[15px] font-medium text-ink">Product is added to cart.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProductCarousel({ title, products }: { title: string, products: any[] }) {
  return (
    <section className="mt-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[28px] font-bold text-ink">{title}</h2>
        <div className="flex items-center gap-3">
          <button className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <button className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((p, idx) => (
          <article key={idx} className="flex flex-col group cursor-pointer">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[20px] bg-[#f9f9f9] border border-[#e7e7e7]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={p.img} 
                alt={p.title} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
              />
              <button 
                type="button" 
                aria-label="Favorite" 
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-ink shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
              >
                <HeartLine className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-1">
              <h3 className="text-[15px] font-medium text-ink truncate">{p.title}</h3>
              <div className="flex items-center gap-3">
                <span className="text-[17px] font-bold text-ink">₹{p.price}</span>
                <span className="text-[14px] text-[#8c8c8c] line-through">₹{p.oldPrice}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1 text-[14px] font-bold text-ink">
                    <Star className="h-3.5 w-3.5 text-[#f5a524]" /> {p.rating}
                  </div>
                  <span className="text-[13px] text-[#8c8c8c]"> • {p.sold} Sold</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.colors.map((c: string) => (
                    <span key={c} className="h-[12px] w-[12px] rounded-full ring-1 ring-black/5" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
