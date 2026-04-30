"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  CartIcon,
  SearchIcon,
  UserIcon,
  OrderIcon,
  BanIcon,
  HeadsetIcon,
  LogOutIcon,
  ChevronRight
} from "./icons";
import Modal from "./Modal";
import AuthModal from "./AuthModal";
import ContactModal from "./ContactModal";
import { type Category } from "@/lib/api";
import { useCart } from "@/lib/cartContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const SHOP_LINK = { id: 0, label: "Shop", href: "/", slug: "shop" };

type User = { name: string; email: string; mobile?: string; image?: string };

function pickDisplayName(user: User): { label: string; isMobile: boolean } {
  const raw = (user.name || "").trim();
  // If "name" is just digits (came from a mobile-OTP signup with no name set), mask it.
  if (raw && /^\+?\d{6,}$/.test(raw)) {
    const last4 = raw.slice(-4);
    return { label: `••${last4}`, isMobile: true };
  }
  if (raw) return { label: raw.split(" ")[0], isMobile: false };
  if (user.email) return { label: user.email.split("@")[0], isMobile: false };
  if (user.mobile) return { label: `••${String(user.mobile).slice(-4)}`, isMobile: true };
  return { label: "Account", isMobile: false };
}

export default function Navbar(props: { categories?: Category[] }) {
  return (
    <Suspense fallback={<NavbarInner {...props} activeCategoryId={-1} />}>
      <NavbarWithSearchParams {...props} />
    </Suspense>
  );
}

function NavbarWithSearchParams({ categories = [] }: { categories?: Category[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHome = pathname === "/";
  const cid = isHome ? Number(searchParams.get("category_id") || 0) : -1;
  return <NavbarInner categories={categories} activeCategoryId={cid} />;
}

function NavbarInner({ categories = [], activeCategoryId }: { categories?: Category[]; activeCategoryId: number }) {
  const navLinks = [
    SHOP_LINK,
    ...categories.map((c) => ({ id: c.id, label: c.name, href: `/?category_id=${c.id}`, slug: c.slug })),
  ];
  const pathname = usePathname();
  const router = useRouter();
  const isSimplifiedHeader = pathname === "/cart" || pathname === "/checkout" || pathname === "/payment" || pathname === "/payment-success";
  const isProductPage = pathname.startsWith("/product");

  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { count: cartCount } = useCart();

  function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  useEffect(() => {
    fetch(`${API}/api/v1/auth/me`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        const u = j?.data?.user;
        if (u) setUser({ name: u.name || u.username || "", email: u.email || "", mobile: u.mobile || "", image: u.image || "" });
      })
      .catch(() => {});
  }, []);

  function handleLogout() {
    fetch(`${API}/api/v1/auth/logout`, { method: "POST", credentials: "include" })
      .finally(() => { setUser(null); setIsProfileOpen(false); });
  }

  function openAccount() {
    if (user) setIsProfileOpen(true);
    else setIsSignInOpen(true);
  }

  if (isSimplifiedHeader) {
    return (
      <header className="w-full bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src="/figma/suvcraft-logo.png" alt="SUVCRAFT" className="h-[42px] w-auto md:h-[52px]" />
              <span className="font-bruno text-[18px] font-bold leading-none text-brand-purple md:text-[24px]" style={{ letterSpacing: "0.08em" }}>
                SUVCRAFT
              </span>
            </Link>
            <button
              onClick={() => setIsContactOpen(true)}
              className="inline-flex h-[50px] w-[160px] items-center justify-center rounded-[41px] border border-[#d4d4d4] text-[15px] font-medium text-ink-soft hover:bg-black/5"
            >
              Contact
            </button>
          </div>
        </div>
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onLogout={handleLogout} onUpdate={(u) => setUser(u)} />
        <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
      </header>
    );
  }

  return (
    <header className={`w-full ${isProductPage ? "bg-white" : ""}`}>
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-3 md:px-8 md:pt-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/figma/suvcraft-logo.png" alt="SUVCRAFT" className="h-[42px] w-auto md:h-[52px]" />
            <span className="font-bruno text-[18px] font-bold leading-none text-brand-purple md:text-[24px]" style={{ letterSpacing: "0.08em" }}>
              SUVCRAFT
            </span>
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            {user ? (
              (() => {
                const dn = pickDisplayName(user);
                return (
                  <button
                    onClick={() => setIsProfileOpen(true)}
                    className="group inline-flex h-[38px] items-center gap-2 rounded-[41px] border border-[#d4d4d4] bg-white pl-1.5 pr-3 text-[13px] font-medium text-ink-soft transition-all hover:border-ink-soft hover:bg-ink-soft hover:text-white md:h-[50px] md:pl-1.5 md:pr-4 md:text-[14px]"
                    aria-label="Open account menu"
                  >
                    <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-brand-purple text-white md:h-[40px] md:w-[40px]">
                      <UserIcon className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.6} />
                    </span>
                    <span className="max-w-[100px] truncate md:max-w-[120px]">
                      {dn.isMobile ? dn.label : `Hi, ${dn.label}`}
                    </span>
                  </button>
                );
              })()
            ) : (
              <button
                onClick={() => setIsSignInOpen(true)}
                className="inline-flex h-[38px] w-[110px] items-center justify-center rounded-[41px] bg-ink-soft text-[13px] font-medium text-white hover:bg-black md:h-[50px] md:w-[160px] md:text-[15px]"
              >
                Sign Up / In
              </button>
            )}
            <button
              onClick={() => setIsContactOpen(true)}
              className="hidden items-center justify-center rounded-[41px] border border-ink-soft text-[15px] font-medium text-ink-soft hover:bg-black/5 md:inline-flex md:h-[50px] md:w-[160px]"
            >
              Contact
            </button>
          </div>
        </div>

        {/* Popups */}
        <AuthModal isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} onSuccess={(u) => { setUser(u); setIsSignInOpen(false); }} />
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} onLogout={handleLogout} onUpdate={(u) => setUser(u)} />
        <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />

        {/* Desktop + tablet category rail */}
        <div className="mt-4 hidden h-auto min-h-[56px] flex-wrap items-center gap-3 rounded-[15px] border-y border-[#d4d4d4] px-4 py-2 md:flex md:h-[64px] md:flex-nowrap md:gap-5 md:px-6 md:py-0">
          <nav className="flex flex-wrap items-center gap-4 text-[13px] md:gap-7 md:text-[15px]">
            {navLinks.map((c) => {
              const isActive = c.id === activeCategoryId;
              return (
                <Link
                  key={c.slug}
                  href={c.href}
                  className={isActive
                    ? "font-semibold text-ink"
                    : "font-normal text-[#6b6b6b] hover:text-ink"
                  }
                >
                  {c.label}
                </Link>
              );
            })}
          </nav>

          <label className="ml-0 flex h-[38px] flex-1 items-center gap-2 rounded-[45px] bg-paper px-4 shadow-sm md:ml-3 md:h-[44px] md:px-5">
            <input
              type="search"
              placeholder="Search Product"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-[#8c8c8c] focus:outline-none md:text-[14px]"
            />
            <button type="button" onClick={handleSearch} aria-label="Search">
              <SearchIcon className="h-4 w-4 text-ink-soft" />
            </button>
          </label>

          <button
            onClick={openAccount}
            type="button"
            aria-label={user ? "Account" : "Sign in"}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5 md:h-[44px] md:w-[44px]"
          >
            <UserIcon className="h-5 w-5" strokeWidth={1.3} />
          </button>
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5 md:h-[44px] md:w-[44px]"
          >
            <CartIcon className="h-5 w-5" strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-purple px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile search bar */}
        <div className="mt-3 flex md:hidden">
          <label className="flex h-[40px] flex-1 items-center gap-2 rounded-[45px] bg-paper px-4 shadow-sm">
            <input
              type="search"
              placeholder="Search Product"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-[#8c8c8c] focus:outline-none"
            />
            <button type="button" onClick={handleSearch} aria-label="Search">
              <SearchIcon className="h-4 w-4 text-ink-soft" />
            </button>
          </label>
          <Link href="/cart" aria-label="Cart" className="relative ml-2 flex h-[40px] w-[40px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5">
            <CartIcon className="h-5 w-5" strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-purple px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile category scroll */}
        <div className="mt-3 flex gap-4 overflow-x-auto pb-1 text-[13px] md:hidden" style={{ scrollbarWidth: "none" }}>
          {navLinks.map((c) => {
            const isActive = c.id === activeCategoryId;
            return (
              <Link
                key={c.slug}
                href={c.href}
                className={`shrink-0 ${isActive ? "font-semibold text-ink" : "font-normal text-[#6b6b6b]"}`}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

function resolveAvatar(image?: string): string | null {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/")) return image;
  const base = process.env.NEXT_PUBLIC_UPLOADS_URL ?? `${API}/uploads`;
  return `${base}/${image}`;
}

function ProfileModal({ isOpen, onClose, user, onLogout, onUpdate }: { isOpen: boolean; onClose: () => void; user: User | null; onLogout: () => void; onUpdate?: (u: User) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(user?.name || "");
      setEmail(user?.email || "");
      setEditing(false);
      setErr("");
      setBusy(false);
      setPwOpen(false);
      setCurPw("");
      setNewPw("");
      setConfirmPw("");
      setPwBusy(false);
      setPwErr("");
      setPwSuccess("");
      setAvatarBusy(false);
      setAvatarErr("");
    }
  }, [isOpen, user]);

  async function save() {
    setErr("");
    if (!name.trim()) { setErr("Name cannot be empty."); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr("Enter a valid email address."); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const json = await res.json();
      if (json.error) { setErr(json.message || "Could not update profile."); return; }
      const u = json.data?.user || {};
      onUpdate?.({ name: u.name || u.username || name.trim(), email: u.email || email.trim(), mobile: u.mobile || user?.mobile || "", image: u.image || user?.image || "" });
      setEditing(false);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setPwErr("");
    setPwSuccess("");
    if (newPw.length < 6) { setPwErr("New password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwErr("Passwords do not match."); return; }
    setPwBusy(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ current_password: curPw, new_password: newPw }),
      });
      const json = await res.json();
      if (json.error) { setPwErr(json.message || "Could not update password."); return; }
      setPwSuccess("Password updated.");
      setCurPw(""); setNewPw(""); setConfirmPw("");
    } catch {
      setPwErr("Network error. Please try again.");
    } finally {
      setPwBusy(false);
    }
  }

  async function uploadAvatar(file: File) {
    setAvatarErr("");
    if (!/^image\//.test(file.type)) { setAvatarErr("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setAvatarErr("Image must be under 5MB."); return; }
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/api/v1/me/avatar`, { method: "POST", credentials: "include", body: fd });
      const json = await res.json();
      if (json.error) { setAvatarErr(json.message || "Upload failed."); return; }
      const newImg = json.data?.path || "";
      onUpdate?.({
        name: user?.name || "",
        email: user?.email || "",
        mobile: user?.mobile || "",
        image: newImg,
      });
    } catch {
      setAvatarErr("Network error. Please try again.");
    } finally {
      setAvatarBusy(false);
    }
  }

  const avatarUrl = resolveAvatar(user?.image);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-4 mb-10">
          <img src="/figma/suvcraft-logo.png" alt="" className="h-[48px] w-auto" />
          <span className="font-bruno text-[26px] font-bold text-brand-purple uppercase tracking-[0.08em]">SUVCRAFT</span>
        </div>

        <div className="w-full">
          <div className="flex items-start gap-6 mb-8 w-full">
            <label className="relative h-[120px] w-[120px] rounded-full bg-[#d9d9d9] flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-12 w-12 text-[#a0a0a0]" strokeWidth={1.2} />
              )}
              <span className={`absolute inset-0 flex items-center justify-center bg-black/45 text-white text-[12px] font-semibold transition-opacity ${avatarBusy ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                {avatarBusy ? "Uploading…" : "Change photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={avatarBusy || !user}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </label>
            {!editing ? (
              <div className="flex flex-col gap-1 flex-1">
                <h3 className="text-[24px] font-medium text-ink">{user ? `Hello, ${(user.name || user.email || "User").split(" ")[0]}` : "Hello Guest"}</h3>
                {user && <span className="text-[15px] text-[#525151]">{user.email}</span>}
                {user && user.mobile && <span className="text-[13px] text-[#8c8c8c]">+91 {user.mobile}</span>}
                {avatarErr && <p className="text-[12px] text-red-500 mt-1">{avatarErr}</p>}
                {user && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex h-[36px] items-center justify-center rounded-[18px] border border-[#d4d4d4] px-4 text-[13px] font-semibold text-ink hover:bg-black/5"
                    >
                      Edit details
                    </button>
                    <button
                      type="button"
                      onClick={() => setPwOpen((o) => !o)}
                      className="inline-flex h-[36px] items-center justify-center rounded-[18px] border border-[#d4d4d4] px-4 text-[13px] font-semibold text-ink hover:bg-black/5"
                    >
                      {pwOpen ? "Close password" : "Change password"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 flex-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-semibold text-[#525151]">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-[44px] rounded-[10px] bg-[#f8f8fb] px-4 text-[14px] outline-none border border-transparent focus:border-brand-purple"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-semibold text-[#525151]">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-[44px] rounded-[10px] bg-[#f8f8fb] px-4 text-[14px] outline-none border border-transparent focus:border-brand-purple"
                  />
                </div>
                {err && <p className="text-[13px] text-red-500">{err}</p>}
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={save}
                    disabled={busy}
                    className="h-[40px] rounded-[20px] bg-brand-purple px-5 text-[13px] font-bold text-white disabled:opacity-60"
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setErr(""); setName(user?.name || ""); setEmail(user?.email || ""); }}
                    disabled={busy}
                    className="h-[40px] rounded-[20px] border border-[#d4d4d4] px-5 text-[13px] font-medium text-[#525151]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {pwOpen && user && (
            <div className="mb-8 rounded-[14px] border border-[#e7e7e7] bg-[#fafafa] p-5 flex flex-col gap-3">
              <h4 className="text-[15px] font-bold text-ink">Change password</h4>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-[#525151]">Current password</label>
                <input
                  type="password"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  placeholder="Leave empty if you have not set one"
                  className="h-[44px] rounded-[10px] bg-white px-4 text-[14px] outline-none border border-[#e7e7e7] focus:border-brand-purple"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-[#525151]">New password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="h-[44px] rounded-[10px] bg-white px-4 text-[14px] outline-none border border-[#e7e7e7] focus:border-brand-purple"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-semibold text-[#525151]">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="h-[44px] rounded-[10px] bg-white px-4 text-[14px] outline-none border border-[#e7e7e7] focus:border-brand-purple"
                />
              </div>
              {pwErr && <p className="text-[13px] text-red-500">{pwErr}</p>}
              {pwSuccess && <p className="text-[13px] text-green-600">{pwSuccess}</p>}
              <button
                type="button"
                onClick={changePassword}
                disabled={pwBusy}
                className="self-start h-[40px] rounded-[20px] bg-brand-purple px-5 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {pwBusy ? "Updating…" : "Update password"}
              </button>
            </div>
          )}

          <hr className="mb-8 border-dashed border-[#d4d4d4]" />

          <div className="flex flex-col gap-6">
            <Link href="/orders" onClick={onClose} className="flex items-center justify-between group">
              <div className="flex items-center gap-5 text-[#525151] group-hover:text-ink transition-colors">
                <OrderIcon className="h-8 w-8" />
                <span className="text-[22px] font-medium">My Orders</span>
              </div>
              <ChevronRight className="h-7 w-7 text-[#525151]" />
            </Link>

            <button className="flex items-center gap-5 text-[#525151] hover:text-ink transition-colors text-left">
              <BanIcon className="h-8 w-8" />
              <span className="text-[22px] font-medium">Delete Account</span>
            </button>

            <button className="flex items-center gap-5 text-[#525151] hover:text-ink transition-colors text-left">
              <HeadsetIcon className="h-8 w-8" />
              <span className="text-[22px] font-medium">Help</span>
            </button>

            <button onClick={onLogout} className="flex items-center gap-5 text-[#ff0000] hover:brightness-90 transition-all mt-2 text-left">
              <LogOutIcon className="h-8 w-8" strokeWidth={2.5} />
              <span className="text-[22px] font-bold">Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
