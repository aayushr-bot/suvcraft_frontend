"use client";

import { useState, useEffect, useRef } from "react";
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
  ChevronRight,
  HeartLine,
  SettingsIcon,
  MapPinIcon,
  CreditCardIcon,
  BellIcon,
} from "./icons";
import Modal from "./Modal";
import AuthModal from "./AuthModal";
import ContactModal from "./ContactModal";
import { api, type Category, type CategoryTab, imgUrl } from "@/lib/api";

// Resolve an admin-uploaded logo. Returns "" when admin hasn't uploaded one
// (caller should hide the <img> rather than render a broken placeholder).
function resolveLogo(path?: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}
import { useCart } from "@/lib/cartContext";
import { useWishlist } from "@/lib/wishlistContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const SHOP_LINK = { id: 0, label: "Shop", href: "/", slug: "shop" };

type User = { name: string; email: string; mobile?: string; image?: string; has_password?: boolean };

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

type NavbarProps = { categories?: Category[]; logo?: string; siteTitle?: string };

export default function Navbar(props: NavbarProps) {
  return (
    <Suspense fallback={<NavbarInner {...props} activeCategoryId={-1} />}>
      <NavbarWithSearchParams {...props} />
    </Suspense>
  );
}

function NavbarWithSearchParams(props: NavbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHome = pathname === "/";
  const cid = isHome ? Number(searchParams.get("category_id") || 0) : -1;
  return <NavbarInner {...props} activeCategoryId={cid} />;
}

function NavbarInner({ categories = [], activeCategoryId, logo, siteTitle }: NavbarProps & { activeCategoryId: number }) {
  const headerLogo = resolveLogo(logo);
  const brand = siteTitle || "SUVCRAFT";
  const navLinks = [
    SHOP_LINK,
    ...categories.map((c) => ({ id: c.id, label: c.name, href: `/?category_id=${c.id}`, slug: c.slug })),
  ];
  const pathname = usePathname();
  const router = useRouter();
  const isOrdersRoute = pathname === "/orders" || pathname.startsWith("/orders/");
  const isSimplifiedHeader = pathname === "/cart" || pathname === "/checkout" || pathname === "/payment" || pathname === "/payment-success";
  // Only the singular detail route (/product/[id]) gets the white-nav treatment.
  // The trailing slash matters — without it this also matched /products (the
  // catalog page), giving the listing a mismatched white nav over a cream body.
  const isProductPage = pathname.startsWith("/product/");

  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [hoveredCatId, setHoveredCatId] = useState<number | null>(null);
  const [tabsByCat, setTabsByCat] = useState<Record<number, CategoryTab[]>>({});
  const catCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openCategory(id: number) {
    if (catCloseTimerRef.current) {
      clearTimeout(catCloseTimerRef.current);
      catCloseTimerRef.current = null;
    }
    if (id <= 0) { setHoveredCatId(null); return; }
    setHoveredCatId(id);
    // Lazy-fetch tabs the first time a category is hovered, then cache.
    if (tabsByCat[id] === undefined) {
      api.categoryTabs({ category_id: id })
        .then((r) => setTabsByCat((prev) => ({ ...prev, [id]: r.rows ?? [] })))
        .catch(() => setTabsByCat((prev) => ({ ...prev, [id]: [] })));
    }
  }

  function scheduleCloseCategory() {
    if (catCloseTimerRef.current) clearTimeout(catCloseTimerRef.current);
    catCloseTimerRef.current = setTimeout(() => setHoveredCatId(null), 1000);
  }

  // Settings dropdown — mirror the same delayed-close behavior.
  const settingsCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function openSettings() {
    if (settingsCloseTimerRef.current) {
      clearTimeout(settingsCloseTimerRef.current);
      settingsCloseTimerRef.current = null;
    }
    setIsSettingsOpen(true);
  }
  function scheduleCloseSettings() {
    if (settingsCloseTimerRef.current) clearTimeout(settingsCloseTimerRef.current);
    settingsCloseTimerRef.current = setTimeout(() => setIsSettingsOpen(false), 1000);
  }

  // Close the settings dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!isSettingsOpen) return;
    function onClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isSettingsOpen]);

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
        if (u) setUser({ name: u.name || u.username || "", email: u.email || "", mobile: u.mobile || "", image: u.image || "", has_password: !!u.has_password });
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

  if (isOrdersRoute) return null;

  if (isSimplifiedHeader) {
    return (
      <header className="w-full bg-white">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              {headerLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={headerLogo} alt={brand} className="h-[42px] w-auto md:h-[52px]" />
              ) : (
                <span className="font-bruno text-[18px] font-bold leading-none text-brand-purple md:text-[24px]" style={{ letterSpacing: "0.08em" }}>
                  {brand}
                </span>
              )}
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
            {headerLogo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={headerLogo} alt={brand} className="h-[42px] w-auto md:h-[52px]" />
            ) : (
              <span className="font-bruno text-[18px] font-bold leading-none text-brand-purple md:text-[24px]" style={{ letterSpacing: "0.08em" }}>
                {brand}
              </span>
            )}
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
        <div className="relative mt-4 hidden h-[64px] items-center gap-4 rounded-[15px] border-y border-[#d4d4d4] px-6 md:flex">
          <nav className="flex flex-1 min-w-0 items-center justify-between gap-5 whitespace-nowrap text-[14px] lg:gap-7 lg:text-[15px]">
            {navLinks.map((c) => {
              const isActive = c.id === activeCategoryId;
              const tabs = tabsByCat[c.id];
              const isOpen = hoveredCatId === c.id && c.id > 0 && tabs && tabs.length > 0;
              return (
                <div
                  key={c.slug}
                  className="relative flex h-full items-center"
                  onMouseEnter={() => openCategory(c.id)}
                  onMouseLeave={scheduleCloseCategory}
                >
                  <Link
                    href={c.href}
                    className={`shrink-0 ${isActive
                      ? "font-semibold text-ink"
                      : "font-normal text-[#6b6b6b] hover:text-ink"
                    }`}
                  >
                    {c.label}
                  </Link>
                  {isOpen && (
                    <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] rounded-[10px] border border-[#e7e7e7] bg-white py-1 shadow-lg">
                      <Link
                        href={`/?category_id=${c.id}`}
                        onClick={() => setHoveredCatId(null)}
                        className="block px-4 py-2 text-[13px] font-semibold text-ink hover:bg-[#f6f6f6]"
                      >
                        All
                      </Link>
                      {tabs.map((t) => (
                        <Link
                          key={t.id}
                          href={`/?category_id=${c.id}&type=${t.slug}`}
                          onClick={() => setHoveredCatId(null)}
                          className="block px-4 py-2 text-[13px] text-[#525151] hover:bg-[#f6f6f6] hover:text-ink"
                        >
                          {t.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <label className="ml-4 flex h-[40px] w-[280px] shrink-0 items-center gap-2 rounded-[45px] bg-paper px-4 shadow-sm lg:ml-8 lg:w-[380px] lg:h-[44px] lg:px-5">
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

          <div
            ref={settingsRef}
            className="relative"
            onMouseEnter={openSettings}
            onMouseLeave={scheduleCloseSettings}
          >
            <button
              type="button"
              aria-label="Settings"
              aria-expanded={isSettingsOpen}
              onClick={() => setIsSettingsOpen((v) => !v)}
              className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5 md:h-[44px] md:w-[44px]"
            >
              <SettingsIcon className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-purple px-1 text-[10px] font-bold text-white">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </button>
            {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-[220px] rounded-[10px] border border-[#e7e7e7] bg-white py-1 shadow-lg">
                <Link
                  href="/wishlist"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <HeartLine className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Wishlist</span>
                  {wishlistCount > 0 && (
                    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-purple px-1 text-[10px] font-bold text-white">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <OrderIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">My Orders</span>
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <UserIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Edit Profile</span>
                </Link>
                <Link
                  href="/addresses"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <MapPinIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Saved Address</span>
                </Link>
                <Link
                  href="/saved-cards"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <CreditCardIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Saved Cards</span>
                </Link>
                <Link
                  href="/notifications"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-[#f6f6f6]"
                >
                  <BellIcon className="h-4 w-4 text-ink-soft" />
                  <span className="flex-1">Notifications</span>
                </Link>
              </div>
            )}
          </div>
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
          <button
            type="button"
            aria-label="Settings"
            onClick={() => setIsSettingsOpen((v) => !v)}
            className="relative ml-2 flex h-[40px] w-[40px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5"
          >
            <SettingsIcon className="h-5 w-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-purple px-1 text-[10px] font-bold text-white">
                {wishlistCount > 99 ? "99+" : wishlistCount}
              </span>
            )}
          </button>
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
      setPwSuccess(user?.has_password ? "Password updated." : "Password set.");
      setCurPw(""); setNewPw(""); setConfirmPw("");
      onUpdate?.({
        name: user?.name || "",
        email: user?.email || "",
        mobile: user?.mobile || "",
        image: user?.image || "",
        has_password: true,
      });
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
  const displayName = user ? (user.name || user.email || "User").split(" ")[0] : "Guest";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-stretch -m-2">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <img src="/figma/suvcraft-logo.png" alt="" className="h-[24px] w-auto" />
          <span className="font-bruno text-[14px] font-bold text-brand-purple uppercase tracking-[0.08em]">SUVCRAFT</span>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center">
          <label className="relative h-[68px] w-[68px] rounded-full bg-gradient-to-br from-[#f3eaf7] to-[#e8dff0] ring-2 ring-white shadow-[0_2px_8px_rgba(62,1,73,0.15)] flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[26px] font-bold text-brand-purple">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className={`absolute inset-0 flex items-center justify-center bg-black/55 text-white text-[10px] font-semibold transition-opacity ${avatarBusy ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
              {avatarBusy ? "…" : "Edit"}
            </span>
            <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand-purple text-white shadow-sm ring-2 ring-white">
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
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
            <div className="mt-2.5 flex flex-col items-center gap-0">
              <h3 className="text-[16px] font-bold text-ink leading-tight">{user ? `Hello, ${displayName}` : "Hello Guest"}</h3>
              {user && <span className="text-[12px] text-[#525151] mt-0.5">{user.email}</span>}
              {user && user.mobile && <span className="text-[11px] text-[#8c8c8c]">+91 {user.mobile}</span>}
              {avatarErr && <p className="text-[11px] text-red-500 mt-1">{avatarErr}</p>}
              {user && (
                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex h-[28px] items-center justify-center rounded-full border border-[#d4d4d4] px-3 text-[11px] font-semibold text-ink hover:border-ink hover:bg-black/5 transition-all"
                  >
                    Edit profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setPwOpen((o) => !o)}
                    className={`inline-flex h-[28px] items-center justify-center rounded-full px-3 text-[11px] font-semibold transition-all ${pwOpen ? "bg-brand-purple text-white" : "border border-[#d4d4d4] text-ink hover:border-ink hover:bg-black/5"}`}
                  >
                    {pwOpen ? "Hide" : (user.has_password ? "Change password" : "Set password")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 w-full flex flex-col gap-2 text-left">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wide font-semibold text-[#8c8c8c]">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-[36px] rounded-[8px] bg-[#f6f6f8] px-3 text-[13px] outline-none border border-[#f6f6f8] focus:border-brand-purple focus:bg-white transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wide font-semibold text-[#8c8c8c]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-[36px] rounded-[8px] bg-[#f6f6f8] px-3 text-[13px] outline-none border border-[#f6f6f8] focus:border-brand-purple focus:bg-white transition-all"
                />
              </div>
              {err && <p className="text-[11px] text-red-500">{err}</p>}
              <div className="flex gap-1.5 mt-0.5 justify-end">
                <button
                  type="button"
                  onClick={() => { setEditing(false); setErr(""); setName(user?.name || ""); setEmail(user?.email || ""); }}
                  disabled={busy}
                  className="h-[32px] rounded-full border border-[#d4d4d4] px-4 text-[12px] font-medium text-[#525151] hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="h-[32px] rounded-full bg-brand-purple px-4 text-[12px] font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-60 transition-all"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Password panel */}
        {pwOpen && user && (
          <div className="mt-3 rounded-[12px] border border-[#ececec] bg-[#fafafa] p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[12px] font-bold text-ink">{user.has_password ? "Change password" : "Set password"}</h4>
              <span className="text-[10px] text-[#8c8c8c]">Min. 6 chars</span>
            </div>
            {!user.has_password && (
              <p className="text-[11px] text-[#8c8c8c] -mt-1">
                You signed in with OTP. Set a password to enable email/password login.
              </p>
            )}
            {user.has_password && (
              <input
                type="password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                placeholder="Current password"
                className="h-[34px] rounded-[8px] bg-white px-3 text-[12px] outline-none border border-[#e7e7e7] focus:border-brand-purple"
              />
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password"
                className="h-[34px] rounded-[8px] bg-white px-3 text-[12px] outline-none border border-[#e7e7e7] focus:border-brand-purple"
              />
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm new"
                className="h-[34px] rounded-[8px] bg-white px-3 text-[12px] outline-none border border-[#e7e7e7] focus:border-brand-purple"
              />
            </div>
            {pwErr && <p className="text-[11px] text-red-500">{pwErr}</p>}
            {pwSuccess && <p className="text-[11px] text-green-600 font-medium">✓ {pwSuccess}</p>}
            <button
              type="button"
              onClick={changePassword}
              disabled={pwBusy}
              className="self-end h-[30px] rounded-full bg-brand-purple px-4 text-[11px] font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-60 transition-all"
            >
              {pwBusy ? (user.has_password ? "Updating…" : "Saving…") : (user.has_password ? "Update" : "Set password")}
            </button>
          </div>
        )}

        {/* Menu */}
        <div className="mt-3 pt-2 border-t border-dashed border-[#e7e7e7] flex flex-col gap-0.5">
          <Link href="/orders" onClick={onClose} className="flex items-center justify-between rounded-[8px] px-2 py-1.5 hover:bg-[#fafafa] transition-colors group">
            <div className="flex items-center gap-2.5 text-[#525151] group-hover:text-ink">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f3eaf7] text-brand-purple">
                <OrderIcon className="h-3.5 w-3.5" />
              </span>
              <span className="text-[13px] font-semibold">My Orders</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-[#8c8c8c]" />
          </Link>

          <button className="flex items-center justify-between rounded-[8px] px-2 py-1.5 hover:bg-[#fafafa] transition-colors group text-left">
            <div className="flex items-center gap-2.5 text-[#525151] group-hover:text-ink">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fdecec] text-red-500">
                <BanIcon className="h-3.5 w-3.5" />
              </span>
              <span className="text-[13px] font-semibold">Delete Account</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-[#8c8c8c]" />
          </button>

          <button className="flex items-center justify-between rounded-[8px] px-2 py-1.5 hover:bg-[#fafafa] transition-colors group text-left">
            <div className="flex items-center gap-2.5 text-[#525151] group-hover:text-ink">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eef6ff] text-blue-500">
                <HeadsetIcon className="h-3.5 w-3.5" />
              </span>
              <span className="text-[13px] font-semibold">Help</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-[#8c8c8c]" />
          </button>

          <button
            onClick={onLogout}
            className="mt-1.5 flex items-center justify-center gap-1.5 h-[36px] rounded-full bg-[#fdecec] text-red-600 font-bold text-[12px] hover:bg-red-100 transition-colors"
          >
            <LogOutIcon className="h-4 w-4" strokeWidth={2.5} />
            Log Out
          </button>
        </div>
      </div>
    </Modal>
  );
}
