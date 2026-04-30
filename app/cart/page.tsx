"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ChevronRight } from "../components/icons";
import AuthModal from "../components/AuthModal";
import ProductImage from "../components/ProductImage";
import { useCart } from "@/lib/cartContext";
import { imgUrl } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const PLACEHOLDER_IMG = "/product-placeholder.svg";

function resolveImg(path: string) {
  if (!path) return PLACEHOLDER_IMG;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

type ServiceCheck = {
  serviceable: boolean;
  reason?: string;
  pincode?: string;
  city?: string | null;
  delivery_charges?: number;
  minimum_free_delivery_order_amount?: number;
  delivery_min_days: number;
  delivery_max_days: number;
};

function formatDeliveryDate(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export default function CartPage() {
  const { items, removeFromCart, updateQty, total, count } = useCart();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const [pincode, setPincode] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [editingPin, setEditingPin] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinChecking, setPinChecking] = useState(false);
  const [serviceInfo, setServiceInfo] = useState<ServiceCheck | null>(null);

  async function checkPin(p: string) {
    setPinChecking(true);
    setPinError("");
    try {
      const res = await fetch(`${API}/api/v1/zipcodes/check?pincode=${encodeURIComponent(p)}`);
      const json = await res.json();
      const data: ServiceCheck = json?.data ?? null;
      if (!data) { setPinError("Could not check this pincode. Please try again."); return; }
      setServiceInfo(data);
      if (data.serviceable) {
        setPincode(p);
        setEditingPin(false);
        try { localStorage.setItem("suvcraft_delivery_pincode", p); } catch {}
      } else if (data.reason === "invalid") {
        setPinError("Enter a valid pincode.");
      } else {
        setPinError("Sorry, we don't deliver to this pincode yet.");
      }
    } catch {
      setPinError("Network error. Please try again.");
    } finally {
      setPinChecking(false);
    }
  }

  useEffect(() => {
    fetch(`${API}/api/v1/auth/me`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => setIsLoggedIn(!!j?.data?.user))
      .catch(() => setIsLoggedIn(false));
    try {
      const saved = localStorage.getItem("suvcraft_delivery_pincode");
      if (saved) { setPinInput(saved); checkPin(saved); }
      else setEditingPin(true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCheckout() {
    if (isLoggedIn) router.push("/checkout");
    else setAuthOpen(true);
  }

  function applyPincode() {
    const p = pinInput.replace(/\D/g, "");
    if (!/^\d{6}$/.test(p)) { setPinError("Enter a valid 6-digit pincode."); return; }
    checkPin(p);
  }

  const estimate = serviceInfo?.serviceable
    ? { from: formatDeliveryDate(serviceInfo.delivery_min_days), to: formatDeliveryDate(serviceInfo.delivery_max_days) }
    : null;

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-20 md:px-8 bg-white min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="text-[80px]">🛒</div>
        <h2 className="text-[28px] font-bold text-ink">Your cart is empty</h2>
        <p className="text-[15px] text-[#525151]">Add some products to get started.</p>
        <Link
          href="/"
          className="inline-flex h-[54px] items-center justify-center rounded-[10px] bg-ink px-10 text-[16px] font-bold text-white hover:bg-black"
        >
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-8 bg-white min-h-screen">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Main Cart Content */}
        <div className="flex-1">
          <div className="mb-6 rounded-[12px] border-2 border-dashed border-[#e7e7e7] bg-white px-6 py-4">
            {!editingPin && estimate && serviceInfo?.serviceable ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col">
                  <span className="text-[12px] uppercase tracking-wide text-[#878787] font-semibold">
                    Delivery to {pincode}{serviceInfo.city ? `, ${serviceInfo.city}` : ""}
                  </span>
                  <span className="text-[15px] font-bold text-ink mt-0.5">
                    Arrives <span className="text-green-700">{estimate.from} – {estimate.to}</span>
                  </span>
                  <span className="text-[12px] text-[#525151] mt-0.5">
                    {Number(serviceInfo.delivery_charges) > 0
                      ? <>Delivery charge: <span className="font-semibold text-ink">{fmt(Number(serviceInfo.delivery_charges))}</span>
                          {Number(serviceInfo.minimum_free_delivery_order_amount) > 0 && (
                            <> · Free above {fmt(Number(serviceInfo.minimum_free_delivery_order_amount))}</>
                          )}
                        </>
                      : <span className="text-green-700 font-semibold">FREE delivery</span>}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingPin(true); setPinInput(pincode); setPinError(""); }}
                  className="h-[42px] rounded-[10px] border border-ink px-6 text-[13px] font-bold text-ink hover:bg-black/5 transition-colors"
                >
                  CHANGE PINCODE
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="text-[15px] font-bold text-ink shrink-0">Check Delivery Date:</span>
                <div className="flex flex-1 items-stretch gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && applyPincode()}
                    placeholder="Enter 6-digit pincode"
                    className="h-[42px] flex-1 rounded-[10px] border border-[#d4d4d4] px-4 text-[14px] outline-none focus:border-ink"
                  />
                  <button
                    type="button"
                    onClick={applyPincode}
                    disabled={pinChecking}
                    className="h-[42px] rounded-[10px] bg-ink px-6 text-[13px] font-bold text-white hover:bg-black transition-colors disabled:opacity-60"
                  >
                    {pinChecking ? "CHECKING…" : "CHECK"}
                  </button>
                  {pincode && (
                    <button
                      type="button"
                      onClick={() => { setEditingPin(false); setPinInput(pincode); setPinError(""); }}
                      className="h-[42px] rounded-[10px] border border-[#d4d4d4] px-4 text-[13px] font-medium text-[#525151] hover:bg-black/5"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
            {pinError && <p className="mt-2 text-[12px] font-medium text-red-600">{pinError}</p>}
          </div>

          <div className="rounded-[20px] border-2 border-dashed border-[#e7e7e7] p-6">
            <div className="flex items-baseline gap-2">
              <h1 className="text-[20px] font-bold text-ink">Shopping Bag</h1>
              <span className="text-[12px] text-[#8c8c8c]">{count} {count === 1 ? "item" : "items"}</span>
            </div>
            <hr className="mt-4 mb-8 border-dashed border-[#e7e7e7]" />

            <div className="flex flex-col gap-10">
              {items.map((item, index) => (
                <div key={item.id} className="relative bg-white">
                  <div className="flex gap-6">
                    <Link href={`/product/${item.id}`} className="h-[130px] w-[130px] shrink-0 flex items-center justify-center rounded-[12px] border border-[#e7e7e7] bg-[#f9f9f9] overflow-hidden">
                      <ProductImage src={resolveImg(item.image)} alt={item.name} className="h-full w-full object-contain p-2" />
                    </Link>

                    <div className="flex flex-1 flex-col gap-3">
                      <Link href={`/product/${item.id}`} className="text-[15px] font-semibold text-ink hover:underline line-clamp-2">
                        {item.name}
                      </Link>

                      <div className="flex h-[40px] w-[108px] items-center justify-between rounded-[8px] border border-[#cfcfcf] px-3">
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          className="text-ink text-[20px] font-medium hover:text-brand-purple transition-colors leading-none"
                        >
                          −
                        </button>
                        <span className="text-[15px] font-bold">{String(item.qty).padStart(2, "0")}</span>
                        <button
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="text-ink text-[20px] font-medium hover:text-brand-purple transition-colors leading-none"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-[14px] text-ink font-medium">
                        Unit Price : <span className="font-bold">{fmt(item.price)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between py-1">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="bg-[#f5f5f5] p-2 rounded-[8px] text-[#9c9c9c] hover:bg-red-50 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <div className="text-[16px] text-[#525151]">
                        Total : <span className="font-bold text-ink">{fmt(item.price * item.qty)}</span>
                      </div>
                    </div>
                  </div>
                  {index < items.length - 1 && <hr className="mt-10 border-dashed border-[#e7e7e7]" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="w-full lg:w-[380px]">
          <div className="flex flex-col gap-6">
            {/* Price Summary */}
            <div className="rounded-[15px] border-2 border-dashed border-[#e7e7e7] bg-white p-6">
              <h3 className="text-[16px] font-bold text-ink mb-6">Price Summary ({count} {count === 1 ? "item" : "items"})</h3>

              <div className="flex flex-col gap-4">
                <div className="flex justify-between text-[16px]">
                  <span className="text-ink">Subtotal</span>
                  <span className="font-medium text-[#8c8c8c]">{fmt(total)}</span>
                </div>
                <div className="flex justify-between text-[16px]">
                  <span className="text-ink">Delivery Charge</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>

                <hr className="my-2 border-[#eeeeee]" />

                <div className="flex justify-between text-[18px] font-bold">
                  <span className="text-ink">Total</span>
                  <span className="text-ink">{fmt(total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                className="flex h-[58px] w-full items-center justify-center rounded-[10px] bg-[#1c1c1c] text-[16px] font-bold text-white hover:bg-black transition-all mt-8"
              >
                Check Out Now
              </button>
            </div>

            {/* Continue Shopping */}
            <Link
              href="/"
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-[#e7e7e7] text-[14px] font-medium text-[#525151] hover:text-ink hover:border-ink transition-all"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Continue Shopping
            </Link>

            {/* Disclaimer */}
            <div className="rounded-[12px] bg-[#fff8e1] p-5 border border-[#ffe082]">
              <h4 className="text-[14px] font-bold text-black mb-2">Disclaimer !</h4>
              <p className="text-[12px] leading-[1.6] text-black">
                Prices are inclusive of all taxes. Delivery charges may apply based on your location and order value.
              </p>
            </div>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => { setIsLoggedIn(true); setAuthOpen(false); router.push("/checkout"); }}
      />
    </div>
  );
}
