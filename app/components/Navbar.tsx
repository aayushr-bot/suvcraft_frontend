import Link from "next/link";
import { CartIcon, SearchIcon, UserIcon } from "./icons";

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
  return (
    <header className="w-full">
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-3 md:px-8 md:pt-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-[24px] font-bold leading-none text-pink md:text-[34px]"
            style={{ letterSpacing: "2.72px" }}
          >
            SUVCRAFT
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/signup"
              className="inline-flex h-[38px] w-[110px] items-center justify-center rounded-[41px] bg-ink-soft text-[13px] font-medium text-white hover:bg-black md:h-[50px] md:w-[160px] md:text-[15px]"
            >
              Sign Up / In
            </Link>
            <Link
              href="/contact"
              className="hidden items-center justify-center rounded-[41px] border border-ink-soft text-[15px] font-medium text-ink-soft hover:bg-black/5 md:inline-flex md:h-[50px] md:w-[160px]"
            >
              Contact
            </Link>
          </div>
        </div>

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
            type="button"
            aria-label="Account"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5 md:h-[44px] md:w-[44px]"
          >
            <UserIcon className="h-5 w-5" strokeWidth={1.3} />
          </button>
          <button
            type="button"
            aria-label="Cart"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5 md:h-[44px] md:w-[44px]"
          >
            <CartIcon className="h-5 w-5" strokeWidth={1.5} />
          </button>
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
          <button type="button" aria-label="Cart" className="ml-2 flex h-[40px] w-[40px] items-center justify-center rounded-full text-ink-soft hover:bg-black/5">
            <CartIcon className="h-5 w-5" strokeWidth={1.5} />
          </button>
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
