"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  MinusIcon,
  Star,
  Trash2,
  X,
  CheckCircleSolid,
  HeartLine
} from "../components/icons";

const cartItems = [
  {
    id: 1,
    title: "Blue A line dress for women",
    rating: 4.9,
    price: 1200,
    oldPrice: 1300,
    img: "/figma/prod-dress.png",
    qty: 1,
    coupon: "YOURDRESS400"
  },
  {
    id: 2,
    title: "Blue A line dress for women",
    rating: 4.9,
    price: 1200,
    oldPrice: 1300,
    img: "/figma/prod-dress.png",
    qty: 1,
    coupon: "YOURDRESS400"
  }
];

const relatedProducts = [
  { img: "/figma/dress1.jpg", title: "Blue A line dress for women", price: 1200, oldPrice: 1300, rating: 4.9, sold: 500, colors: ["#000080", "#8b0000", "#1a1a1a", "#f4c430"] },
  { img: "/figma/dress2.jpg", title: "Blue A line dress for women", price: 1200, oldPrice: 1300, rating: 4.9, sold: 500, colors: ["#000080", "#8b0000", "#1a1a1a", "#f4c430"] },
  { img: "/figma/dress3.jpg", title: "Blue A line dress for women", price: 1200, oldPrice: 1300, rating: 4.9, sold: 500, colors: ["#000080", "#8b0000", "#1a1a1a", "#f4c430"] },
  { img: "/figma/dress4.jpg", title: "Blue A line dress for women", price: 1200, oldPrice: 1300, rating: 4.9, sold: 500, colors: ["#000080", "#8b0000", "#1a1a1a", "#f4c430"] },
];

export default function CartPage() {
  const [items, setItems] = useState(cartItems);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-8 bg-white min-h-screen">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Main Cart Content */}
        <div className="flex-1">
          {/* Check Delivery Date - Now aligned with shopping bag */}
          <div className="mb-10 flex h-[74px] items-center justify-between rounded-[12px] border-2 border-dashed border-[#e7e7e7] bg-white px-6">
            <span className="text-[15px] font-bold text-ink">Check Delivery Date</span>
            <button className="h-[46px] rounded-[10px] border border-ink px-8 text-[14px] font-bold text-ink hover:bg-black/5 transition-colors">
              CHANGE PINCODE
            </button>
          </div>

          <div className="rounded-[20px] border-2 border-dashed border-[#e7e7e7] p-6">
            <div className="flex items-baseline gap-2">
              <h1 className="text-[20px] font-bold text-ink">Shopping Bag</h1>
              <span className="text-[12px] text-[#8c8c8c]">{items.length} items</span>
            </div>
            <hr className="mt-4 mb-8 border-dashed border-[#e7e7e7]" />

            <div className="flex flex-col gap-12">
              {items.map((item, index) => (
                <div key={item.id} className="relative bg-white">
                  {/* Coupon Header - Dashed Box */}
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-[8px] border-2 border-dashed border-[#e7e7e7] px-4 py-2 bg-white">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-900 text-white">
                        <span className="text-[12px] font-bold">%</span>
                      </div>
                      <span className="text-[14px] font-bold text-purple-900">{item.coupon} <span className="font-medium text-purple-800">Coupon Applied</span></span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[14px] font-bold text-[#404040] mb-2 leading-none">Verified by</span>
                      <img src="/figma/suvcraft-logo2.png" className="h-[38px] w-auto object-contain" alt="Verified by SUVCRAFT" />
                    </div>
                  </div>

                  {/* Item Details */}
                  <div className="flex gap-8">
                    <div className="h-[140px] w-[140px] shrink-0 flex items-center justify-center p-2">
                      <img src={item.img} alt={item.title} className="h-full w-full object-contain" />
                    </div>

                    <div className="flex flex-1 flex-col gap-3">
                      <h3 className="text-[15px] font-semibold text-ink">{item.title}</h3>
                      <div className="flex items-center gap-1.5 text-[15px] font-bold text-ink">
                        <Star className="h-4 w-4 text-[#f5a524]" /> {item.rating}
                      </div>

                      <div className="flex h-[42px] w-[110px] items-center justify-between rounded-[8px] border border-[#cfcfcf] px-3">
                        <button className="text-ink text-[18px] font-medium hover:text-pink transition-colors">－</button>
                        <span className="text-[15px] font-bold">01</span>
                        <button className="text-ink text-[18px] font-medium hover:text-pink transition-colors">＋</button>
                      </div>

                      <div className="text-[15px] text-ink font-medium mt-1">
                        Unit Price : <span className="font-bold">₹{item.price}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between py-1">
                      <button className="bg-[#f5f5f5] p-2 rounded-[8px] text-[#9c9c9c] hover:bg-red-50 hover:text-red-500 transition-all">
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <div className="text-[16px] text-[#525151]">
                        Total : <span className="font-bold text-ink">₹{item.price}</span>
                      </div>
                    </div>
                  </div>
                  {index < items.length - 1 && <hr className="mt-12 border-dashed border-[#e7e7e7]" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="w-full lg:w-[400px] pt-[0px]">
          <div className="flex flex-col gap-6">
            {/* Coupon Code Section - Purple Theme */}
            <div className="rounded-[15px] border-2 border-dashed border-[#e7e7e7] p-6">
              <h3 className="text-[14px] font-semibold text-[#525151] mb-4">Coupon Code</h3>
              <div className="relative rounded-[10px] border-2 border-dashed border-[#eaddff] bg-[#f8f0ff] p-4">
                <div className="absolute right-3 top-3 text-[#cfcfcf] cursor-pointer hover:text-ink">
                  <X className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-900 text-white">
                    <span className="text-[12px] font-bold">%</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-purple-900">YOURDRESS400 <span className="font-medium text-purple-800">Coupon Applied</span></div>
                    <div className="text-[12px] font-medium text-purple-700">You've saved ₹300</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Summary - Grey numbers */}
            <div className="rounded-[15px] border-2 border-dashed border-[#e7e7e7] bg-white p-6">
              <h3 className="text-[16px] font-bold text-ink mb-6">Price Summary ( 2 items )</h3>

              <div className="flex flex-col gap-4">
                <div className="flex justify-between text-[16px]">
                  <span className="text-ink">Total MRP</span>
                  <span className="font-medium text-[#8c8c8c]">₹4500</span>
                </div>
                <div className="flex justify-between text-[16px]">
                  <span className="text-ink font-semibold">Subtotal</span>
                  <span className="font-bold text-green-600">₹4500</span>
                </div>
                <div className="flex justify-between text-[16px]">
                  <span className="text-ink">Delivery Charge</span>
                  <span className="font-medium text-[#8c8c8c]">₹100</span>
                </div>
                <div className="flex justify-between text-[16px]">
                  <span className="text-ink">Coupon Discount</span>
                  <span className="font-medium text-[#8c8c8c]">-₹300</span>
                </div>

                <hr className="my-2 border-[#eeeeee]" />

                <div className="flex justify-between text-[18px] font-bold">
                  <span className="text-ink">Total</span>
                  <span className="text-green-600">₹4500</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="flex h-[58px] w-full items-center justify-center rounded-[10px] bg-[#1c1c1c] text-[16px] font-bold text-white hover:bg-black transition-all mt-8"
              >
                Check Out Now
              </Link>
            </div>

            {/* Disclaimer - Black text */}
            <div className="rounded-[12px] bg-[#fff8e1] p-5 border border-[#ffe082]">
              <h4 className="text-[14px] font-bold text-black mb-2">Disclaimer !</h4>
              <p className="text-[12px] leading-[1.6] text-black">
                What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing and
                typesetting industry. Lorem Ipsum has been the industry's standard dummy
                text ever since the 1500s, when an unknown printer took a galley of type and
                scrambled it to make a type specimen book.
              </p>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-16 border-[#e7e7e7] border-dashed border-t-2" />

      {/* Cross-sell Section */}
      <section className="mt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[28px] font-bold text-ink">You Can Bought Together</h2>
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
          {relatedProducts.map((p, idx) => (
            <article key={idx} className="flex flex-col group cursor-pointer">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[20px] bg-[#f9f9f9] border border-[#e7e7e7]">
                <img src={p.img} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-ink shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
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
                  <div className="flex items-center gap-1 text-[14px] font-bold text-ink">
                    <Star className="h-3.5 w-3.5 text-[#f5a524]" /> {p.rating}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.colors.map(c => (
                      <span key={c} className="h-[12px] w-[12px] rounded-full ring-1 ring-black/5" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
