"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircleSolid } from "../components/icons";
import type { Address } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

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

async function lookupPincode(pin: string): Promise<{ city?: string; state?: string } | null> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    const post = data?.[0]?.PostOffice?.[0];
    if (!post) return null;
    return {
      city: String(post.District || "").trim() || undefined,
      state: String(post.State || "").trim() || undefined,
    };
  } catch {
    return null;
  }
}

export default function AddressesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  // Either editing a saved row (id), or filling out the always-visible "new" form on the right.
  const [editingId, setEditingId] = useState<number | "new">("new");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // Defaults pulled from the logged-in user, used to seed the new-address form.
  const [userDefaults, setUserDefaults] = useState<Partial<FormState>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }

  // Force white body background like the cart/checkout/profile pages.
  useEffect(() => {
    const prevBg = document.body.style.background;
    document.body.style.background = "#ffffff";
    return () => { document.body.style.background = prevBg; };
  }, []);

  async function loadAddresses() {
    try {
      const res = await fetch(`${API}/api/v1/addresses`, { credentials: "include" });
      if (res.status === 401) { router.replace("/"); return; }
      const json = await res.json();
      const list: Address[] = json?.data?.rows ?? [];
      setAddresses(list);
    } catch {
      setError("Failed to load addresses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
    // Pre-fill the new-address form with the signed-in user's name/mobile/email
    // so they don't have to retype it. They can still edit any field if they
    // want this address shipped to someone else.
    fetch(`${API}/api/v1/auth/me`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const u = j?.data?.user;
        if (!u) return;
        const defaults = {
          name: u.name || "",
          mobile: u.mobile ? String(u.mobile).replace(/\D/g, "").slice(-10) : "",
          email: u.email || "",
        };
        setUserDefaults(defaults);
        setForm((f) => ({
          ...f,
          name: f.name || defaults.name,
          mobile: f.mobile || defaults.mobile,
          email: f.email || defaults.email,
        }));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onPincodeChange(raw: string) {
    const cleaned = raw.replace(/\D/g, "").slice(0, 6);
    set("pincode", cleaned);
    if (cleaned.length === 6) {
      const info = await lookupPincode(cleaned);
      if (info?.city) set("city", info.city);
      if (info?.state) set("state", info.state);
    }
  }

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

  // Cancel just resets the right-side new-address form; if the user was editing
  // an existing row, snap back to the empty-new form on the right.
  function cancelForm() {
    setEditingId("new");
    setForm({ ...EMPTY_FORM, ...userDefaults });
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
      await loadAddresses();
      cancelForm();
      flashToast(isNew ? "Address added." : "Address updated.");
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
      await loadAddresses();
      flashToast("Address removed.");
    } finally {
      setBusy(false);
    }
  }

  async function setAsDefault(id: number) {
    setBusy(true);
    try {
      await fetch(`${API}/api/v1/addresses/${id}/default`, { method: "PUT", credentials: "include" });
      await loadAddresses();
      flashToast("Default address set.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-1 pb-10 md:px-8 bg-white min-h-screen">
        <p className="py-20 text-center text-[14px] text-[#8c8c8c]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-1 pb-10 md:px-8 bg-white min-h-screen">
      {/* Breadcrumb */}
      <nav className="text-[13px] text-[#8c8c8c] mb-4">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="mx-1.5">›</span>
        <span className="text-ink">Saved Addresses</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-ink md:text-[30px]">Saved Addresses</h1>
        <p className="mt-0.5 text-[13px] text-[#525151]">Add or update the addresses your orders ship to.</p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
        {/* Left: address list */}
        <div className="flex-1 flex flex-col gap-3">
          {addresses.length === 0 && (
            <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white p-10 text-center">
              <div className="text-[44px] mb-2">📦</div>
              <p className="text-[15px] font-semibold text-ink">No saved addresses yet</p>
              <p className="mt-1 text-[12.5px] text-[#878787]">Use the form on the right to add your first one.</p>
            </div>
          )}

          {addresses.map((a) => {
            const isDefault = Number(a.is_default) === 1;
            const editing = editingId === a.id;
            return (
              <div
                key={a.id}
                className={`rounded-[5px] border-2 border-dashed p-5 transition-all ${editing ? "border-ink-soft bg-[#fafafa]" : "border-[#e7e7e7] bg-white"}`}
              >
                {!editing ? (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[15px] font-bold text-ink">{a.name}</span>
                        <span className="inline-flex h-[20px] items-center rounded-[4px] bg-[#f0f0f0] px-1.5 text-[10px] font-semibold uppercase text-[#525151]">
                          {a.type || "Home"}
                        </span>
                        {isDefault && (
                          <span className="inline-flex h-[20px] items-center rounded-[4px] bg-emerald-50 px-1.5 text-[10px] font-semibold uppercase text-emerald-700">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-[#525151] leading-[1.6]">
                        {[a.address, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                      </p>
                      <p className="mt-1 text-[13px] text-[#525151]">{a.mobile}{a.email ? ` · ${a.email}` : ""}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => setAsDefault(a.id)}
                          disabled={busy}
                          className="text-[12px] font-semibold text-[#525151] hover:text-ink hover:underline whitespace-nowrap"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(a)}
                        className="text-[12px] font-semibold text-[#525151] hover:text-ink hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAddress(a.id)}
                        disabled={busy}
                        className="text-[12px] font-semibold text-red-600 hover:text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-[13px] font-bold text-ink mb-3 uppercase tracking-wide">Edit Address</h3>
                    <AddressFormFields form={form} set={set} onPincodeChange={onPincodeChange} />
                    {error && <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={saveAddress}
                        disabled={busy}
                        className="inline-flex h-[44px] items-center justify-center rounded-[8px] bg-ink-soft px-7 text-[13px] font-bold text-white tracking-[0.1em] hover:bg-black disabled:opacity-60"
                      >
                        {busy ? "Saving…" : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelForm}
                        className="text-[13px] font-semibold text-[#525151] hover:text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: always-visible new-address form (sticky) */}
        <div className="w-full lg:w-[500px] lg:shrink-0">
          <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white p-6 lg:sticky lg:top-1">
            <h2 className="text-[16px] font-bold text-ink mb-1">Add a new address</h2>
            <p className="text-[12.5px] text-[#878787] mb-5">Pincode auto-fills city and state.</p>
            {editingId === "new" ? (
              <>
                <AddressFormFields form={form} set={set} onPincodeChange={onPincodeChange} />
                {error && <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={saveAddress}
                    disabled={busy}
                    className="inline-flex h-[44px] items-center justify-center rounded-[8px] bg-ink-soft px-7 text-[13px] font-bold text-white tracking-[0.1em] hover:bg-black disabled:opacity-60"
                  >
                    {busy ? "Saving…" : "Save Address"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="text-[13px] font-semibold text-[#525151] hover:text-ink"
                  >
                    Reset
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[13px] text-[#878787]">Editing an address on the left — finish or cancel that first to add a new one here.</p>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]" />
          <div className="fixed bottom-10 left-1/2 z-[100] flex -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-[12px] bg-white px-6 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#e7e7e7]">
              <CheckCircleSolid className="h-6 w-6 text-green-600" />
              <span className="text-[15px] font-medium text-ink">{toast}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AddressFormFields({
  form,
  set,
  onPincodeChange,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onPincodeChange: (v: string) => void;
}) {
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
