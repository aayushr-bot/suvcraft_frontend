"use client";

import Link from "next/link";
import { useState } from "react";

export default function PaymentPage() {
  const [paymentMethod, setPaymentMethod] = useState("card");

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8 bg-white min-h-screen">
      <div className="flex flex-col lg:flex-row gap-10">
        
        {/* Left Column: Payment Method Selection */}
        <div className="flex-1">
          <div className="rounded-[20px] border-2 border-dashed border-[#e7e7e7] p-8 md:p-12 bg-white">
            <h2 className="text-[22px] font-bold text-ink mb-10">Choose Your Payment Method</h2>
            
            <div className="mb-10">
              <span className="block text-[15px] font-bold text-ink mb-5">Pay With:</span>
              <div className="flex flex-wrap items-center gap-6">
                {[
                  { id: "card", label: "Card" },
                  { id: "bank", label: "Bank" },
                  { id: "transfer", label: "Transfer" },
                  { id: "upi", label: "UPI" }
                ].map((method) => (
                  <label key={method.id} className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="radio" 
                        name="payment" 
                        value={method.id}
                        checked={paymentMethod === method.id}
                        onChange={() => setPaymentMethod(method.id)}
                        className="sr-only"
                      />
                      <div className={`h-4 w-4 rounded-full border-2 transition-all ${paymentMethod === method.id ? "border-green-600 bg-white" : "border-[#cfcfcf] bg-white group-hover:border-ink"}`} />
                      {paymentMethod === method.id && (
                        <div className="absolute h-2 w-2 rounded-full bg-green-600" />
                      )}
                    </div>
                    <span className={`text-[14px] font-medium transition-colors ${paymentMethod === method.id ? "text-ink" : "text-[#8c8c8c] group-hover:text-ink"}`}>
                      {method.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <form className="flex flex-col gap-8">
              <div>
                <label className="block text-[15px] font-semibold text-ink mb-3">Card Number</label>
                <input 
                  type="text" 
                  placeholder="1234 5678 9101 1121" 
                  className="w-full h-[56px] px-5 rounded-[8px] border border-[#d4d4d4] text-[15px] outline-none focus:border-ink transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[15px] font-semibold text-ink mb-3">Expiration Date</label>
                  <input 
                    type="text" 
                    placeholder="MM/YY" 
                    className="w-full h-[56px] px-5 rounded-[8px] border border-[#d4d4d4] text-[15px] outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[15px] font-semibold text-ink mb-3">CVV</label>
                  <input 
                    type="text" 
                    placeholder="123" 
                    className="w-full h-[56px] px-5 rounded-[8px] border border-[#d4d4d4] text-[15px] outline-none focus:border-ink transition-colors"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                <input type="checkbox" className="h-4 w-4 rounded border-[#d4d4d4] text-ink focus:ring-ink" />
                <span className="text-[13px] font-medium text-[#8c8c8c] group-hover:text-ink">Save card details</span>
              </label>

              <Link 
                href="/payment-success"
                className="flex h-[58px] w-full items-center justify-center rounded-[10px] bg-[#1c1c1c] text-[16px] font-bold text-white hover:bg-black transition-all mt-4"
              >
                Procced to Pay
              </Link>

              <p className="text-[12px] leading-[1.6] text-[#8c8c8c]">
                Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.
              </p>
            </form>
          </div>
        </div>

        {/* Right Column: Summary */}
        <div className="w-full lg:w-[400px]">
          <div className="rounded-[20px] border-2 border-dashed border-[#e7e7e7] p-8 bg-white">
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
        </div>

      </div>
    </div>
  );
}
