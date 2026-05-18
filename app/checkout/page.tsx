"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart, lineKey } from "@/lib/cartContext";
import { imgUrl, type Address } from "@/lib/api";
import { Star } from "../components/icons";
import ProductImage from "../components/ProductImage";
import { formatMoney as fmt } from "@/lib/format";
import { lookupPincode } from "@/lib/pincode";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const PLACEHOLDER_IMG = "/product-placeholder.svg";

function resolveImg(path: string) {
  if (!path) return PLACEHOLDER_IMG;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

const inputCls =
  "w-full h-[48px] px-4 rounded-[8px] border border-[#d4d4d4] text-[14px] outline-none focus:border-ink transition-colors bg-white";

type FormState = {
  name: string;
  mobile: string;
  email: string;
  pincode: string;
  address: string;
  landmark: string;
  city: string;
  state: string;
  type: string;
};

const EMPTY_FORM: FormState = {
  name: "", mobile: "", email: "", pincode: "", address: "", landmark: "", city: "", state: "", type: "Home",
};

function fromAddress(a: Address): FormState {
  return {
    name: a.name || "",
    mobile: a.mobile || "",
    email: a.email || "",
    pincode: a.pincode || "",
    address: a.address || "",
    landmark: a.landmark || "",
    city: a.city || "",
    state: a.state || "",
    type: a.type || "Home",
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, count, taxTotal, deliveryCharge, coupon, couponDiscount, finalTotal } = useCart();

  const [authChecked, setAuthChecked] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [productInfo, setProductInfo] = useState<Record<number, { rating?: number; mrp?: number }>>({});

  // Pull rating + MRP per cart item — CartItem only carries the selling price,
  // and we need the original (pre-discount) price to populate "Total MRP".
  // Batch the fetch with ?ids= so a 10-item cart hits the API once, not 10×.
  const checkoutLineKey = items.map((i) => i.id).join(",");
  useEffect(() => {
    let cancelled = false;
    const missing = Array.from(
      new Set(items.map((i) => Number(i.id)).filter((id) => id && !productInfo[id])),
    );
    if (!missing.length) return;
    fetch(`${API}/api/v1/products?ids=${missing.join(",")}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.data?.rows) return;
        const next: Record<number, { rating?: number; mrp?: number }> = {};
        for (const p of j.data.rows as any[]) {
          const price = Number(p.price ?? 0);
          const special = Number(p.special_price ?? 0);
          const mrp = special && price && special < price ? price : price || special;
          next[Number(p.id)] = {
            rating: Number(p.rating) || undefined,
            mrp: mrp || undefined,
          };
        }
        setProductInfo((prev) => ({ ...prev, ...next }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutLineKey]);

  const totalMrp = items.reduce((sum, it) => sum + (productInfo[it.id]?.mrp ?? it.price) * it.qty, 0);

  // The site-wide body has a cream → grey gradient. On checkout we want a
  // clean white canvas, so override at mount and restore on unmount.
  useEffect(() => {
    const prevBg = document.body.style.background;
    document.body.style.background = "#ffffff";
    return () => { document.body.style.background = prevBg; };
  }, []);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function loadAddresses() {
    try {
      const res = await fetch(`${API}/api/v1/addresses`, { credentials: "include" });
      if (res.status === 401) {
        router.push(`/?next=/checkout`);
        return;
      }
      const json = await res.json();
      const list: Address[] = json?.data?.rows ?? [];
      setAddresses(list);
      const def = list.find((a) => Number(a.is_default) === 1);
      setSelectedId((cur) => cur ?? (def ? def.id : list[0]?.id ?? null));
      if (list.length === 0) setEditingId("new");
    } catch {
      setError("Failed to load addresses.");
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  }

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNew() {
    setForm(EMPTY_FORM);
    setEditingId("new");
    setError("");
  }

  function startEdit(a: Address) {
    setForm(fromAddress(a));
    setEditingId(a.id);
    setError("");
  }

  function cancelForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function validate(): string {
    if (!form.name.trim()) return "Full name is required.";
    if (!/^\d{10}$/.test(form.mobile.replace(/\D/g, ""))) return "Enter a valid 10-digit mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Enter a valid email address.";
    if (!/^\d{6}$/.test(form.pincode.trim())) return "Enter a valid 6-digit pincode.";
    if (!form.address.trim()) return "Address is required.";
    if (!form.city.trim()) return "City is required.";
    if (!form.state.trim()) return "State is required.";
    return "";
  }

  async function saveAddress() {
    const err = validate();
    if (err) { setError(err); return; }
    setBusy(true); setError("");
    try {
      const isNew = editingId === "new";
      const url = isNew ? `${API}/api/v1/addresses` : `${API}/api/v1/addresses/${editingId}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, area: form.city }),
      });
      const json = await res.json();
      if (json.error) { setError(json.message || "Save failed."); return; }
      const newId = json.data?.id;
      await loadAddresses();
      if (newId) setSelectedId(newId);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAddress(id: number) {
    if (!confirm("Delete this address?")) return;
    setBusy(true);
    try {
      await fetch(`${API}/api/v1/addresses/${id}`, { method: "DELETE", credentials: "include" });
      if (selectedId === id) setSelectedId(null);
      await loadAddresses();
    } finally {
      setBusy(false);
    }
  }

  async function deliverHere() {
    if (!selectedId) { setError("Please select a delivery address."); return; }
    if (!items.length) { setError("Your cart is empty."); return; }
    const chosen = addresses.find((a) => a.id === selectedId);
    if (!chosen) { setError("Selected address not found."); return; }

    setError(""); setBusy(true);
    try {
      const res = await fetch(`${API}/api/v1/zipcodes/check?pincode=${encodeURIComponent(chosen.pincode || "")}`);
      const json = await res.json();
      const data = json?.data;
      if (!data?.serviceable) {
        const msg = data?.reason === "invalid"
          ? "This address has an invalid pincode. Please edit it and try again."
          : `Sorry, we don't deliver to pincode ${chosen.pincode} yet. Please select another address.`;
        setError(msg);
        return;
      }
      try { sessionStorage.setItem("suvcraft_address", JSON.stringify(chosen)); } catch {}
      router.push("/payment");
    } catch {
      setError("Network error checking deliverability. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!items.length) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-20 md:px-8 bg-white min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="text-[80px]">🛒</div>
        <h2 className="text-[28px] font-bold text-ink">Your cart is empty</h2>
        <Link href="/" className="inline-flex h-[54px] items-center justify-center rounded-[10px] bg-ink px-10 text-[16px] font-bold text-white hover:bg-black">
          Shop Now
        </Link>
      </div>
    );
  }

  if (loading || !authChecked) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-20 md:px-8 bg-white min-h-screen flex items-center justify-center">
        <p className="text-[14px] text-[#8c8c8c]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-1 md:px-8 bg-white min-h-screen">

      <div className="flex flex-col lg:flex-row lg:items-start gap-8">
        {/* Left: Address management — fills remaining space (no max-width cap) */}
        <div className="flex-1 min-w-0">
          <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white overflow-hidden">
            {/* Card header — softer than the heavy bar */}
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-dashed border-[#e7e7e7]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6efff] text-brand-purple">
                {/* location pin */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </span>
              <div>
                <h2 className="text-[15px] font-bold text-ink leading-tight">Delivery address</h2>
                <p className="text-[12px] text-[#878787] leading-tight">Where should we send your order?</p>
              </div>
            </div>

            <div className="bg-white">
              {addresses.length === 0 && editingId !== "new" && (
                <div className="px-5 py-10 text-center">
                  <div className="text-[28px] mb-1">📦</div>
                  <p className="text-[14px] font-medium text-ink">No saved addresses yet</p>
                  <p className="text-[12.5px] text-[#878787] mt-1">Add one below to continue.</p>
                </div>
              )}

              {/* Address list */}
              <div className="px-5 pt-3 pb-1 flex flex-col gap-3">
                {addresses.map((a) => {
                  const selected = selectedId === a.id;
                  const editing = editingId === a.id;
                  return (
                    <div
                      key={a.id}
                      className={`rounded-[5px] border-2 border-dashed transition-all ${selected ? "border-ink-soft bg-[#fafafa]" : "border-[#e7e7e7] hover:border-[#cfcfcf] bg-white"}`}
                    >
                      {!editing ? (
                        <label className="flex items-start gap-3 p-4 cursor-pointer">
                          <input
                            type="radio"
                            checked={selected}
                            onChange={() => { setSelectedId(a.id); setError(""); }}
                            className="mt-1 h-4 w-4 accent-ink-soft"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[14px] font-semibold text-ink">{a.name}</span>
                              {a.type && (
                                <span className="text-[10px] uppercase font-bold text-[#525151] bg-[#f0f0f0] rounded px-2 py-0.5">
                                  {a.type}
                                </span>
                              )}
                              {Number(a.is_default) === 1 && (
                                <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 rounded px-2 py-0.5">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[13.5px] text-[#525151] leading-relaxed">
                              {a.address}{a.landmark ? `, ${a.landmark}` : ""}, {a.city}{a.state ? `, ${a.state}` : ""} – <span className="font-semibold text-ink">{a.pincode}</span>
                            </p>
                            <p className="mt-1 text-[12.5px] text-[#878787]">{a.mobile}</p>
                            {selected && (
                              <div className="mt-3 flex flex-wrap items-center gap-4 pt-3 border-t border-dashed border-[#e7e7e7]">
                                <button type="button" onClick={() => startEdit(a)} className="text-[12.5px] font-semibold text-ink hover:underline">
                                  Edit
                                </button>
                                <button type="button" onClick={() => removeAddress(a.id)} disabled={busy} className="text-[12.5px] font-semibold text-[#878787] hover:text-red-600">
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </label>
                      ) : (
                        <div className="p-4">
                          <AddressFormFields form={form} set={set} />
                          {error && <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>}
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button type="button" onClick={saveAddress} disabled={busy} className="inline-flex h-[44px] items-center justify-center rounded-[8px] bg-ink-soft px-8 text-[13px] font-bold text-white tracking-wide hover:bg-black disabled:opacity-60">
                              {busy ? "SAVING…" : "SAVE"}
                            </button>
                            <button type="button" onClick={cancelForm} className="text-[13px] font-semibold text-[#525151] hover:text-ink">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* New-address form */}
              {editingId === "new" && (
                <div className="mx-5 my-3 rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white p-4">
                  <h3 className="text-[13px] font-bold text-ink mb-3 uppercase tracking-wide">Add a new address</h3>
                  <AddressFormFields form={form} set={set} />
                  {error && <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={saveAddress} disabled={busy} className="inline-flex h-[44px] items-center justify-center rounded-[8px] bg-ink-soft px-8 text-[13px] font-bold text-white tracking-wide hover:bg-black disabled:opacity-60">
                      {busy ? "SAVING…" : "SAVE AND DELIVER HERE"}
                    </button>
                    {addresses.length > 0 && (
                      <button type="button" onClick={cancelForm} className="text-[13px] font-semibold text-[#525151] hover:text-ink">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Dashed "+ Add a new address" tile */}
              {editingId !== "new" && (
                <div className="px-5 pb-5 pt-2">
                  <button
                    type="button"
                    onClick={startNew}
                    className="flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-[#cfcfcf] py-4 text-[13.5px] font-semibold text-ink hover:border-ink-soft hover:bg-[#fafafa] transition-colors"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink-soft text-white text-[14px] leading-none">+</span>
                    Add a new address
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Cart Review (sticky on desktop so it stays visible while scrolling) */}
        <div className="w-full lg:w-[500px] shrink-0 lg:sticky lg:top-1 self-start">
          <div className="flex flex-col gap-5">
            <h3 className="text-[14px] font-bold text-ink mb-[-12px]">Review your Cart</h3>

            {/* Cart items list */}
            <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white px-5 py-4 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#cfcfcf transparent" }}>
              {items.map((item, idx) => {
                const info = productInfo[item.id];
                // The buyer's Unit Price is what they're actually being
                // charged per unit (`item.price`), not the MRP. Surface the
                // MRP only as a strike-through comparison when it's higher,
                // so the line agrees with the subtotal calculation below.
                const sellingPrice = item.price;
                const mrp = info?.mrp && info.mrp > sellingPrice ? info.mrp : 0;
                return (
                  <div key={lineKey(item)} className={`flex items-center gap-3 ${idx > 0 ? "mt-4 pt-4 border-t border-dashed border-[#e7e7e7]" : ""}`}>
                    <div className="h-[60px] w-[60px] shrink-0 rounded-[6px] bg-[#f9f9f9] overflow-hidden flex items-center justify-center">
                      <ProductImage src={resolveImg(item.image)} alt={item.name} className="h-full w-full object-contain p-1" />
                    </div>
                    <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                      <h4 className="text-[13px] font-medium text-ink line-clamp-1 leading-tight">{item.name}</h4>
                      <span className="text-[12px] text-[#878787]">{item.qty}x</span>
                      {(item.size || item.color) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {item.size && (
                            <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#f5f5f5] px-2 py-0.5 text-[11px] font-medium text-ink">
                              <span className="text-[#878787]">Size :</span> {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#f5f5f5] px-2 py-0.5 text-[11px] font-medium text-ink">
                              <span className="text-[#878787]">Color :</span>
                              <span className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: item.color.swatch || "#e7e7e7" }} />
                              <span>{item.color.name}</span>
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-[12px] text-[#525151]">
                        Unit Price : <span className="font-semibold text-ink">{fmt(sellingPrice)}</span>
                        {mrp > 0 && (
                          <span className="ml-1.5 text-[11px] text-[#9c9c9c] line-through">{fmt(mrp)}</span>
                        )}
                      </div>
                    </div>
                    {info?.rating ? (
                      <div className="flex items-center gap-1 text-[13px] font-semibold text-ink shrink-0">
                        <Star className="h-3.5 w-3.5 text-yellow-500" />
                        {info.rating.toFixed(1)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <h3 className="text-[14px] font-bold text-ink mb-[-12px]">
              Price Summary <span className="font-normal text-[#525151]">( {count} {count === 1 ? "item" : "items"} )</span>
            </h3>

            {/* Price Summary card */}
            <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white p-5">
              <div className="flex flex-col gap-3 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-[#525151]">Total MRP</span>
                  <span className="text-ink font-medium">{fmt(totalMrp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525151]">Subtotal</span>
                  <span className="text-emerald-600 font-semibold">{fmt(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525151]">Delivery Charge</span>
                  <span className={`font-medium ${deliveryCharge === 0 ? "text-emerald-600" : "text-ink"}`}>
                    {deliveryCharge === 0 ? "FREE" : fmt(deliveryCharge)}
                  </span>
                </div>
                {coupon && couponDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#525151]">Coupon Discount</span>
                    <span className="text-ink font-medium">-{fmt(couponDiscount)}</span>
                  </div>
                )}
                {taxTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#525151]">Tax</span>
                    <span className="text-ink font-medium">+{fmt(taxTotal)}</span>
                  </div>
                )}
                <div className="my-1 border-t border-dashed border-[#e7e7e7]" />
                <div className="flex justify-between items-baseline">
                  <span className="text-[14px] font-medium text-ink">Total</span>
                  <span className="text-[14px] font-bold text-emerald-600">{fmt(finalTotal)}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={deliverHere}
              disabled={busy || !selectedId || editingId !== null}
              className="inline-flex h-[54px] w-full items-center justify-center rounded-[8px] bg-ink-soft text-[15px] font-medium text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? "Checking…" : "Proceed to Pay"}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#878787]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
              </svg>
              Safe and Secure Payments. Easy returns.
            </div>

            {/* Legal disclaimer — covers the agreement that placing an order
                implies acceptance of the published policies. Links open in
                a new tab so the checkout flow isn't interrupted. */}
            <p className="text-center text-[11px] text-[#a3a3a3] leading-relaxed">
              By placing this order, you agree to our{" "}
              <a href="/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">Privacy Policy</a>,{" "}
              <a href="/policies/shipping-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">Shipping Policy</a>, and{" "}
              <a href="/policies/return-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">Return Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddressFormFields({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  async function onPincodeChange(raw: string) {
    const cleaned = raw.replace(/\D/g, "").slice(0, 6);
    set("pincode", cleaned);
    if (cleaned.length === 6) {
      const info = await lookupPincode(cleaned);
      if (info?.city) set("city", info.city);
      if (info?.state) set("state", info.state);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full Name *" className={inputCls} />
      <input value={form.mobile} onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="10-digit Mobile Number *" className={inputCls} />
      <input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="Email Address *" className={`${inputCls} sm:col-span-2`} />
      <input value={form.pincode} onChange={(e) => onPincodeChange(e.target.value)} inputMode="numeric" placeholder="Pincode *" className={inputCls} />
      <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City *" className={inputCls} />
      <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Flat / House No, Building, Street *" className={`${inputCls} sm:col-span-2`} />
      <input value={form.landmark} onChange={(e) => set("landmark", e.target.value)} placeholder="Landmark (optional)" className={inputCls} />
      <input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="State *" className={inputCls} />
      <div className="sm:col-span-2 flex items-center gap-3">
        <span className="text-[13px] font-medium text-[#525151]">Address Type:</span>
        {["Home", "Work", "Other"].map((t) => (
          <label key={t} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
            <input type="radio" name="type" checked={form.type === t} onChange={() => set("type", t)} className="accent-brand-purple" />
            {t}
          </label>
        ))}
      </div>
    </div>
  );
}
