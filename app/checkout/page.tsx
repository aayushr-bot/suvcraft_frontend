"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cartContext";
import { imgUrl, type Address } from "@/lib/api";
import { ChevronRight } from "../components/icons";
import ProductImage from "../components/ProductImage";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const PLACEHOLDER_IMG = "/product-placeholder.svg";

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

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
  pincode: string;
  address: string;
  landmark: string;
  city: string;
  state: string;
  type: string;
};

const EMPTY_FORM: FormState = {
  name: "", mobile: "", pincode: "", address: "", landmark: "", city: "", state: "", type: "Home",
};

function fromAddress(a: Address): FormState {
  return {
    name: a.name || "",
    mobile: a.mobile || "",
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
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8 bg-white min-h-screen">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left: Address management */}
        <div className="flex-1 lg:max-w-[720px]">
          <div className="rounded-[10px] border border-[#e7e7e7] overflow-hidden">
            <div className="bg-brand-purple px-5 py-3 text-white">
              <span className="text-[13px] font-semibold tracking-wide">DELIVERY ADDRESS</span>
            </div>

            <div className="bg-white">
              {addresses.length === 0 && editingId !== "new" && (
                <div className="px-5 py-8 text-center text-[#525151]">
                  <p className="text-[14px]">You have no saved addresses yet.</p>
                </div>
              )}

              {/* Address list */}
              {addresses.map((a) => {
                const selected = selectedId === a.id;
                const editing = editingId === a.id;
                return (
                  <div key={a.id} className={`border-t border-[#e7e7e7] ${selected ? "bg-[#fdfbff]" : ""}`}>
                    {!editing ? (
                      <label className="flex items-start gap-3 p-5 cursor-pointer">
                        <input
                          type="radio"
                          checked={selected}
                          onChange={() => { setSelectedId(a.id); setError(""); }}
                          className="mt-1 h-4 w-4 accent-brand-purple"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-semibold text-ink">{a.name}</span>
                            {a.type && <span className="text-[10px] uppercase font-bold text-[#525151] bg-[#f0f0f0] rounded-sm px-2 py-0.5">{a.type}</span>}
                            <span className="text-[14px] font-semibold text-ink">{a.mobile}</span>
                            {Number(a.is_default) === 1 && (
                              <span className="text-[10px] uppercase font-bold text-brand-purple">Default</span>
                            )}
                          </div>
                          <p className="mt-1 text-[14px] text-[#525151] leading-relaxed">
                            {a.address}{a.landmark ? `, ${a.landmark}` : ""}, {a.city}{a.state ? `, ${a.state}` : ""} - <span className="font-semibold text-ink">{a.pincode}</span>
                          </p>
                          {selected && (
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <button type="button" onClick={() => startEdit(a)} className="text-[13px] font-semibold text-brand-purple hover:underline">EDIT</button>
                              <button type="button" onClick={() => removeAddress(a.id)} disabled={busy} className="text-[13px] font-semibold text-[#525151] hover:text-red-600">REMOVE</button>
                            </div>
                          )}
                        </div>
                      </label>
                    ) : (
                      <div className="p-5">
                        <AddressFormFields form={form} set={set} />
                        {error && <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>}
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button type="button" onClick={saveAddress} disabled={busy} className="inline-flex h-[44px] items-center justify-center rounded-[4px] bg-brand-purple px-8 text-[14px] font-bold text-white tracking-wide hover:brightness-110 disabled:opacity-60">
                            {busy ? "SAVING…" : "SAVE"}
                          </button>
                          <button type="button" onClick={cancelForm} className="text-[13px] font-semibold text-[#525151] hover:text-ink">CANCEL</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* New-address form */}
              {editingId === "new" && (
                <div className="border-t border-[#e7e7e7] p-5">
                  <h3 className="text-[14px] font-semibold text-brand-purple mb-4">+ ADD A NEW ADDRESS</h3>
                  <AddressFormFields form={form} set={set} />
                  {error && <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={saveAddress} disabled={busy} className="inline-flex h-[44px] items-center justify-center rounded-[4px] bg-brand-purple px-8 text-[14px] font-bold text-white tracking-wide hover:brightness-110 disabled:opacity-60">
                      {busy ? "SAVING…" : "SAVE AND DELIVER HERE"}
                    </button>
                    {addresses.length > 0 && (
                      <button type="button" onClick={cancelForm} className="text-[13px] font-semibold text-[#525151] hover:text-ink">CANCEL</button>
                    )}
                  </div>
                </div>
              )}

              {/* Add-new trigger */}
              {editingId !== "new" && addresses.length > 0 && (
                <button
                  type="button"
                  onClick={startNew}
                  className="block w-full border-t border-[#e7e7e7] px-5 py-4 text-left text-[14px] font-semibold text-brand-purple hover:bg-[#fdfbff]"
                >
                  + Add a new address
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Cart Review */}
        <div className="lg:w-[380px] shrink-0">
          <div className="flex flex-col gap-5">
            <div className="rounded-[10px] border border-[#e7e7e7] bg-white">
              <div className="px-5 py-3 border-b border-[#e7e7e7]">
                <h3 className="text-[14px] font-semibold text-ink">Order Summary</h3>
              </div>
              <div className="p-5 flex flex-col gap-4 max-h-[280px] overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="h-[60px] w-[60px] shrink-0 rounded-[8px] border border-[#e7e7e7] bg-[#f9f9f9] overflow-hidden flex items-center justify-center">
                      <ProductImage src={resolveImg(item.image)} alt={item.name} className="h-full w-full object-contain p-1" />
                    </div>
                    <div className="flex flex-1 min-w-0 flex-col">
                      <h4 className="text-[13px] font-medium text-ink truncate">{item.name}</h4>
                      <span className="text-[11px] text-[#8c8c8c]">Qty: {item.qty}</span>
                      <div className="mt-1 text-[13px] font-bold text-ink">{fmt(item.price * item.qty)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[10px] border border-[#e7e7e7] bg-white p-5">
              <h3 className="text-[13px] font-semibold uppercase text-[#878787] tracking-wide mb-4">Price Details ({count} {count === 1 ? "item" : "items"})</h3>
              <div className="flex flex-col gap-3 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-ink">Subtotal</span>
                  <span className="text-ink">{fmt(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink">Delivery Charge</span>
                  <span className={`font-medium ${deliveryCharge === 0 ? "text-green-600" : "text-[#525151]"}`}>
                    {deliveryCharge === 0 ? "FREE" : fmt(deliveryCharge)}
                  </span>
                </div>
                {coupon && couponDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-green-700 font-medium">Coupon ({coupon.code})</span>
                    <span className="text-green-700 font-semibold">−{fmt(couponDiscount)}</span>
                  </div>
                )}
                {taxTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-ink">Tax</span>
                    <span className="text-[#525151] font-medium">+{fmt(taxTotal)}</span>
                  </div>
                )}
                <hr className="my-1 border-dashed border-[#e7e7e7]" />
                <div className="flex justify-between text-[16px] font-bold">
                  <span className="text-ink">Total Amount</span>
                  <span className="text-ink">{fmt(finalTotal)}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={deliverHere}
              disabled={busy || !selectedId || editingId !== null}
              className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[10px] bg-ink-soft text-[15px] font-bold text-white tracking-wide hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? "CHECKING…" : "PROCEED TO PAYMENT"}
              {!busy && <ChevronRight className="h-5 w-5" />}
            </button>

            <p className="text-[12px] text-[#878787] leading-relaxed">
              Safe and Secure Payments. Easy returns. 100% Authentic products.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddressFormFields({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full Name *" className={inputCls} />
      <input value={form.mobile} onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="10-digit Mobile Number *" className={inputCls} />
      <input value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Pincode *" className={inputCls} />
      <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City *" className={inputCls} />
      <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Flat / House No, Building, Street *" className={`${inputCls} sm:col-span-2`} />
      <input value={form.landmark} onChange={(e) => set("landmark", e.target.value)} placeholder="Landmark (optional)" className={inputCls} />
      <input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="State *" className={inputCls} />
      <div className="sm:col-span-2 flex items-center gap-3">
        <span className="text-[13px] font-medium text-[#525151]">Address Type:</span>
        {["Home", "Work"].map((t) => (
          <label key={t} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
            <input type="radio" name="type" checked={form.type === t} onChange={() => set("type", t)} className="accent-brand-purple" />
            {t}
          </label>
        ))}
      </div>
    </div>
  );
}
