"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

const categories = [
  { label: "Shop", href: "/shop", active: true },
  { label: "Men", href: "/men" },
  { label: "Women", href: "/women" },
  { label: "Beauty & Health", href: "/beauty-health" },
  { label: "Seasonal", href: "/seasonal" },
  { label: "Accessories", href: "/accessories" },
  { label: "Kids", href: "/kids" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isSimplifiedHeader = pathname === "/cart" || pathname === "/checkout" || pathname === "/payment";
  const isProductPage = pathname.startsWith("/product");

  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
              onClick={() => setIsProfileOpen(true)}
              className="inline-flex h-[50px] w-[160px] items-center justify-center rounded-[41px] border border-[#d4d4d4] text-[15px] font-medium text-ink-soft hover:bg-black/5"
            >
              Contact
            </button>
          </div>
        </div>
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
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
            <button
              onClick={() => setIsSignInOpen(true)}
              className="inline-flex h-[38px] w-[110px] items-center justify-center rounded-[41px] bg-ink-soft text-[13px] font-medium text-white hover:bg-black md:h-[50px] md:w-[160px] md:text-[15px]"
            >
              Sign Up / In
            </button>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="hidden items-center justify-center rounded-[41px] border border-ink-soft text-[15px] font-medium text-ink-soft hover:bg-black/5 md:inline-flex md:h-[50px] md:w-[160px]"
            >
              Contact
            </button>
          </div>
        </div>

        {/* Popups */}
        <AuthModal isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} />
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

        {/* Desktop + tablet category rail */}
        <div className="mt-4 hidden h-auto min-h-[56px] flex-wrap items-center gap-3 rounded-[15px] border-y border-[#d4d4d4] px-4 py-2 md:flex md:h-[64px] md:flex-nowrap md:gap-5 md:px-6 md:py-0">
          <nav className="flex flex-wrap items-center gap-4 text-[13px] md:gap-7 md:text-[15px]">
            {categories.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className={
                  c.active
                    ? "font-semibold text-ink"
                    : "font-normal text-[#6b6b6b] hover:text-ink"
                }
              >
                {c.label}
              </Link>
            ))}
          </nav>

          <label className="ml-0 flex h-[38px] flex-1 items-center gap-2 rounded-[45px] bg-paper px-4 shadow-sm md:ml-3 md:h-[44px] md:px-5">
            <input
              type="search"
              placeholder="Search Product"
              className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-[#8c8c8c] focus:outline-none md:text-[14px]"
            />
            <SearchIcon className="h-4 w-4 text-ink-soft" />
          </label>

          <button
            onClick={() => setIsProfileOpen(true)}
            type="button"
            aria-label="Account"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5 md:h-[44px] md:w-[44px]"
          >
            <UserIcon className="h-5 w-5" strokeWidth={1.3} />
          </button>
          <Link
            href="/cart"
            aria-label="Cart"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5 md:h-[44px] md:w-[44px]"
          >
            <CartIcon className="h-5 w-5" strokeWidth={1.5} />
          </Link>
        </div>

        {/* Mobile search bar */}
        <div className="mt-3 flex md:hidden">
          <label className="flex h-[40px] flex-1 items-center gap-2 rounded-[45px] bg-paper px-4 shadow-sm">
            <input
              type="search"
              placeholder="Search Product"
              className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-[#8c8c8c] focus:outline-none"
            />
            <SearchIcon className="h-4 w-4 text-ink-soft" />
          </label>
          <Link href="/cart" aria-label="Cart" className="ml-2 flex h-[40px] w-[40px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5">
            <CartIcon className="h-5 w-5" strokeWidth={1.5} />
          </Link>
        </div>

        {/* Mobile category scroll */}
        <div className="mt-3 flex gap-4 overflow-x-auto pb-1 text-[13px] md:hidden" style={{ scrollbarWidth: "none" }}>
          {categories.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className={`shrink-0 ${c.active ? "font-semibold text-ink" : "font-normal text-[#6b6b6b]"}`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-start w-full">
        <div className="flex items-center gap-4 mb-8">
          <img src="/figma/suvcraft-logo.png" alt="" className="h-[42px] w-auto" />
          <span className="font-bruno text-[22px] font-bold text-brand-purple uppercase tracking-[0.08em]">SUVCRAFT</span>
        </div>

        <div className="w-full flex flex-col gap-6">
          <div>
            <span className="text-[13px] text-[#8c8c8c] font-medium">
              {mode === "signin" ? "Welcome back !!!" : "Join us today !!!"}
            </span>
            <h2 className="text-[42px] font-bold text-ink leading-tight">
              {mode === "signin" ? "Sign in" : "Sign up"}
            </h2>
          </div>

          <div className="flex flex-col gap-5">
            {mode === "signup" && (
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-semibold text-ink">Full Name</label>
                <input 
                  type="text" 
                  placeholder="John Doe"
                  className="h-[54px] w-full rounded-[10px] bg-[#f8f8fb] px-5 text-[14px] outline-none border border-transparent focus:border-brand-purple placeholder:text-[#8c8c8c] transition-all shadow-sm"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-ink">Email</label>
              <input 
                type="email" 
                placeholder="test1@gmail.com"
                className="h-[54px] w-full rounded-[10px] bg-[#f8f8fb] px-5 text-[14px] outline-none border border-transparent focus:border-brand-purple placeholder:text-[#8c8c8c] transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[14px] font-semibold text-ink">Password</label>
                {mode === "signin" && (
                  <button className="text-[12px] font-medium text-[#8c8c8c] hover:text-ink">Forgot Password ?</button>
                )}
              </div>
              <input 
                type="password" 
                placeholder="*************"
                className="h-[54px] w-full rounded-[10px] bg-[#f8f8fb] px-5 text-[14px] outline-none border border-transparent focus:border-brand-purple placeholder:text-[#8c8c8c] transition-all shadow-sm"
              />
            </div>

            {mode === "signup" && (
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-semibold text-ink">Confirm Password</label>
                <input 
                  type="password" 
                  placeholder="*************"
                  className="h-[54px] w-full rounded-[10px] bg-[#f8f8fb] px-5 text-[14px] outline-none border border-transparent focus:border-brand-purple placeholder:text-[#8c8c8c] transition-all shadow-sm"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-5 mt-2">
            <button className="h-[54px] w-[180px] rounded-[32px] bg-[#3E0149] flex items-center justify-center gap-4 text-white font-bold text-[15px] hover:brightness-110 transition-all shadow-lg uppercase">
              {mode === "signin" ? "LOG IN" : "SIGN UP"}
              <svg width="20" height="12" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.5303 6.53033C19.8232 6.23744 19.8232 5.76256 19.5303 5.46967L14.7574 0.696699C14.4645 0.403806 13.9896 0.403806 13.6967 0.696699C13.4038 0.989593 13.4038 1.46447 13.6967 1.75736L17.9393 6L13.6967 10.2426C13.4038 10.5355 13.4038 11.0104 13.6967 11.3033C13.9896 11.5962 14.4645 11.5962 14.7574 11.3033L19.5303 6.53033ZM0 6.75H19V5.25H0V6.75Z" fill="white"/>
              </svg>
            </button>

            <p className="text-[14px] text-[#8c8c8c]">
              {mode === "signin" ? "I don't have an account ?" : "Already have an account ?"}
              {" "}
              <button 
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-bold text-brand-purple hover:underline"
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-4 mb-10">
          <img src="/figma/suvcraft-logo.png" alt="" className="h-[48px] w-auto" />
          <span className="font-bruno text-[26px] font-bold text-brand-purple uppercase tracking-[0.08em]">SUVCRAFT</span>
        </div>

        <div className="w-full">
          <div className="flex items-center gap-6 mb-8">
            <div className="h-[120px] w-[120px] rounded-full bg-[#d9d9d9] flex-shrink-0" />
            <div className="flex flex-col gap-1">
              <h3 className="text-[24px] font-medium text-ink">Hello User</h3>
              <span className="text-[20px] text-[#525151]">+ 90123-980-90</span>
            </div>
          </div>

          <hr className="mb-8 border-dashed border-[#d4d4d4]" />

          <div className="flex flex-col gap-6">
            <button className="flex items-center justify-between group">
              <div className="flex items-center gap-5 text-[#525151] group-hover:text-ink transition-colors">
                <OrderIcon className="h-8 w-8" />
                <span className="text-[22px] font-medium">My Orders</span>
              </div>
              <ChevronRight className="h-7 w-7 text-[#525151]" />
            </button>

            <button className="flex items-center gap-5 text-[#525151] hover:text-ink transition-colors text-left">
              <BanIcon className="h-8 w-8" />
              <span className="text-[22px] font-medium">Delete Account</span>
            </button>

            <button className="flex items-center gap-5 text-[#525151] hover:text-ink transition-colors text-left">
              <HeadsetIcon className="h-8 w-8" />
              <span className="text-[22px] font-medium">Help</span>
            </button>

            <button className="flex items-center gap-5 text-[#ff0000] hover:brightness-90 transition-all mt-2 text-left">
              <LogOutIcon className="h-8 w-8" strokeWidth={2.5} />
              <span className="text-[22px] font-bold">Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
