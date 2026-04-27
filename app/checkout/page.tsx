"use client";

import Link from "next/link";
import { useState } from "react";
import { Star } from "../components/icons";

const cartItems = [
  {
    id: 1,
    title: "Blue A line dress for women",
    rating: 4.9,
    price: 1200,
    img: "/figma/prod-dress.png",
    qty: "1x",
  },
  {
    id: 2,
    title: "Blue A line dress for women",
    rating: 4.9,
    price: 1200,
    img: "/figma/prod-dress.png",
    qty: "1x",
  }
];

export default function CheckoutPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8 bg-white min-h-screen">
      <div className="flex flex-col lg:flex-row gap-16 lg:gap-20">
        
        {/* Left Column: Address Form (Half Screen) */}
        <div className="lg:w-1/2">
          <form className="flex flex-col gap-8 w-full">
            <div>
              <label className="block text-[15px] font-semibold text-ink mb-3">Full Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                placeholder="test1@gmail.com" 
                className="w-full h-[56px] px-5 rounded-[8px] border border-[#d4d4d4] text-[15px] outline-none focus:border-ink transition-colors"
              />
            </div>

            <div>
              <label className="block text-[15px] font-semibold text-ink mb-3">Email Address <span className="text-red-500">*</span></label>
              <input 
                type="email" 
                placeholder="test1@gmail.com" 
                className="w-full h-[56px] px-5 rounded-[8px] border border-[#d4d4d4] text-[15px] outline-none focus:border-ink transition-colors"
              />
            </div>

            <div>
              <label className="block text-[15px] font-semibold text-ink mb-3">Phone Number <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3 border-r border-[#d4d4d4] pr-4">
                  <img src="/figma/twemoji_flag-india.png" alt="India" className="w-[28px] h-[28px] object-contain" />
                  <span className="text-[15px] font-medium text-ink">+91</span>
                </div>
                <input 
                  type="tel" 
                  className="w-full h-[56px] pl-[120px] pr-5 rounded-[8px] border border-[#d4d4d4] text-[15px] outline-none focus:border-ink transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[15px] font-semibold text-ink mb-3">Country <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value="India" 
                readOnly
                className="w-full h-[56px] px-5 rounded-[8px] border border-[#d4d4d4] text-[15px] bg-[#fcfcfc] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[15px] font-semibold text-ink mb-3">City <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="India" 
                  className="w-full h-[56px] px-5 rounded-[8px] border border-[#d4d4d4] text-[15px] outline-none focus:border-ink transition-colors"
                />
              </div>
              <div>
                <label className="block text-[15px] font-semibold text-ink mb-3">State <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="India" 
                  className="w-full h-[56px] px-5 rounded-[8px] border border-[#d4d4d4] text-[15px] outline-none focus:border-ink transition-colors"
                />
              </div>
              <div>
                <label className="block text-[15px] font-semibold text-ink mb-3">ZIP Code <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="India" 
                  className="w-full h-[56px] px-5 rounded-[8px] border border-[#d4d4d4] text-[15px] outline-none focus:border-ink transition-colors"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Review & Summary (Rest half Screen) */}
        <div className="lg:w-1/2">
          <div className="flex flex-col gap-6">
            <div className="rounded-[20px] border-2 border-dashed border-[#e7e7e7] p-6 bg-white">
              <h3 className="text-[16px] font-semibold text-ink mb-6">Review your Cart</h3>
              
              <div className="flex flex-col gap-8">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="flex gap-4">
                      <div className="h-[80px] w-[80px] shrink-0 flex items-center justify-center">
                        <img src={item.img} alt={item.title} className="h-full w-full object-contain" />
                      </div>
                      <div className="flex flex-1 flex-col justify-between py-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-[15px] font-medium text-ink pr-4 leading-tight">{item.title}</h4>
                        </div>
                        <span className="text-[12px] text-[#8c8c8c]">{item.qty}</span>
                        <div className="flex items-center justify-between">
                           <div className="text-[14px] font-bold text-ink">
                             Unit Price : <span className="font-medium">₹{item.price}</span>
                           </div>
                           <div className="flex items-center gap-1 text-[13px] font-bold text-ink">
                             <Star className="h-3 w-3 text-[#f5a524]" /> {item.rating}
                           </div>
                        </div>
                      </div>
                    </div>
                    {idx === 0 && <hr className="mt-8 border-dashed border-[#e7e7e7]" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Price Summary */}
            <div className="rounded-[20px] border-2 border-dashed border-[#e7e7e7] p-6">
              <h3 className="text-[16px] font-bold text-ink mb-6">Price Summary ( 2 items )</h3>
              
              <div className="flex flex-col gap-5">
                <div className="flex justify-between text-[16px]">
                  <span className="text-[#525151]">Total MRP</span>
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
            </div>

            <Link 
              href="/payment"
              className="flex h-[58px] w-full items-center justify-center rounded-[10px] bg-[#1c1c1c] text-[16px] font-bold text-white hover:bg-black transition-all"
            >
              Proceed to Pay
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
