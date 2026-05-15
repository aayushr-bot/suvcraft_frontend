"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, type FaqCategory, type FaqItem } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ─── Sidebar icons ─────────────────────────────────────────────────────────
const CartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" />
    <path d="M2 4h2l2.4 12.2a2 2 0 0 0 2 1.8h9.2a2 2 0 0 0 2-1.6L21 8H6" />
  </svg>
);
const ReturnIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);
const CardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);
const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const TagIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><circle cx="7" cy="7" r="1.4" />
  </svg>
);
const HelpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ICONS: Record<string, React.FC<{ className?: string }>> = {
  cart: CartIcon,
  return: ReturnIcon,
  card: CardIcon,
  user: UserIcon,
  tag: TagIcon,
};

function iconFor(key?: string) {
  return (key && ICONS[key]) || HelpIcon;
}

// Hash aliases — the order detail / track pages historically link to
// `#order-issues`, `#delivery-info`, and `#returns`. Map those to the
// matching category slugs so deep links keep working.
const HASH_ALIASES: Record<string, string> = {
  "order-issues": "orders-delivery",
  "delivery-info": "orders-delivery",
  "returns": "returns-refunds",
  "refunds": "returns-refunds",
  "payments": "payments-pricing",
  "account": "account-app",
  "products": "products-shopping",
};

// The admin can leave the `{N}` token inside any answer to embed the
// configured return window (so policy edits don't require copy edits).
function substitute(answer: string, ctx: { returnWindowDays: number }): string {
  return answer.replace(/\{N\}/g, String(ctx.returnWindowDays));
}

export default function FaqPage() {
  const [returnWindowDays, setReturnWindowDays] = useState(7);
  const [supportPhone, setSupportPhone] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [activeId, setActiveId] = useState<string>("");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Settings (return window + support contacts) drive the CTA card and the
  // {N}-day token substitution in answers.
  useEffect(() => {
    fetch(`${API}/api/v1/settings`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const d = j?.data || {};
        const n = Number(d.return_window_days);
        if (Number.isFinite(n) && n > 0) setReturnWindowDays(Math.floor(n));
        setSupportPhone(String(d.support_number || d.footer_phone || "").trim());
        setSupportEmail(String(d.support_email || d.footer_email || "").trim());
      })
      .catch(() => {});
  }, []);

  // FAQ content (categories + items) from the CMS.
  useEffect(() => {
    let cancelled = false;
    api.faqs()
      .then((d) => {
        if (cancelled) return;
        const cats = (d?.categories || []).filter((c) => c.items.length > 0);
        setCategories(cats);
        if (cats.length && !activeId) setActiveId(cats[0].slug);
      })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Honour deep links like /faq#order-issues → switch to the right tab.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const target = HASH_ALIASES[hash] || hash;
      setActiveId(target);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const activeCategory =
    categories.find((c) => c.slug === activeId) || categories[0];

  // When the user types in the search bar we collapse the sidebar into a
  // single "Results" view that pulls matching Q&As across every category.
  const searching = searchQuery.trim().length > 0;
  const searchResults = useMemo(() => {
    if (!searching) return [];
    const q = searchQuery.toLowerCase();
    const matches: { category: FaqCategory; item: FaqItem }[] = [];
    for (const c of categories) {
      for (const item of c.items) {
        const answerText = substitute(item.answer, { returnWindowDays }).toLowerCase();
        if (item.question.toLowerCase().includes(q) || answerText.includes(q)) {
          matches.push({ category: c, item });
        }
      }
    }
    return matches;
  }, [searchQuery, categories, searching, returnWindowDays]);

  return (
    <div className="min-h-screen bg-[#f6f6f8]">
      {/* ─── Hero band ───────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "#FFF6DE" }}>
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 py-10 sm:py-14 text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#8c8c8c]">Help centre</p>
          <h1 className="mt-2 text-[28px] sm:text-[40px] font-bold leading-tight text-ink">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-[14px] sm:text-[15px] text-[#525151] max-w-[560px] mx-auto">
            Find answers to common questions about orders, delivery, returns, and your Suvcraft account.
          </p>

          <div className="mt-7 max-w-[640px] mx-auto">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#a3a3a3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions…"
                className="w-full h-[50px] rounded-[12px] bg-white pl-11 pr-4 text-[14px] text-ink placeholder:text-[#a3a3a3] shadow-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Body — sidebar nav + content side-by-side ──────────────── */}
      <section className="mx-auto w-full max-w-[1440px] px-4 md:px-8 py-10 sm:py-12">
        {loadError && (
          <div className="mb-6 rounded-[12px] border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-[13px]">
            Couldn't load FAQs right now. Please try again in a moment.
          </div>
        )}

        {!loadError && categories.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[#e7e7e7] bg-white p-10 text-center">
            <p className="text-[14px] text-[#525151]">No FAQs published yet.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Category nav — sidebar on desktop, horizontal strip on mobile. */}
            <nav
              aria-label="FAQ categories"
              className="rounded-[14px] bg-white border border-[#ececec] p-2 overflow-x-auto lg:overflow-visible lg:w-[260px] lg:shrink-0 lg:self-start lg:sticky lg:top-6"
            >
              <div className="flex lg:flex-col items-stretch gap-2 min-w-max lg:min-w-0">
                {categories.map((c) => {
                  const active = !searching && activeCategory?.slug === c.slug;
                  const Icon = iconFor(c.icon);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveId(c.slug);
                        setSearchQuery("");
                        setOpenItem(null);
                        if (typeof window !== "undefined") {
                          history.replaceState(null, "", `#${c.slug}`);
                        }
                      }}
                      className={`flex-1 lg:flex-none lg:w-full inline-flex items-center justify-center lg:justify-start gap-2 whitespace-nowrap rounded-[10px] px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
                        active
                          ? "bg-[#fff4ec] text-[#F17A20] ring-1 ring-[#F17A20]/20"
                          : "text-ink hover:bg-[#f6f6f8]"
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${active ? "text-[#F17A20]" : "text-[#525151]"}`} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {searching ? (
                <div>
                  <header className="mb-5">
                    <h2 className="text-[20px] sm:text-[22px] font-bold text-ink">
                      {searchResults.length} {searchResults.length === 1 ? "result" : "results"} for
                      <span className="text-[#F17A20]"> “{searchQuery}”</span>
                    </h2>
                    <p className="mt-1 text-[12.5px] text-[#878787]">
                      Tap a question to expand. Clear the search to browse by category.
                    </p>
                  </header>
                  <div className="flex flex-col gap-2">
                    {searchResults.length === 0 ? (
                      <div className="rounded-[12px] border border-dashed border-[#e7e7e7] bg-white p-8 text-center">
                        <p className="text-[14px] text-[#525151]">
                          Nothing matched. Try a different keyword, or message us from the contact card below.
                        </p>
                      </div>
                    ) : (
                      searchResults.map(({ category, item }) => (
                        <FaqCard
                          key={`s-${category.slug}-${item.id}`}
                          question={item.question}
                          answer={substitute(item.answer, { returnWindowDays })}
                          keyId={`s-${category.slug}-${item.id}`}
                          openItem={openItem}
                          setOpenItem={setOpenItem}
                          eyebrow={category.label}
                        />
                      ))
                    )}
                  </div>
                </div>
              ) : activeCategory ? (
                <div className="flex flex-col gap-4">
                  {/* Section header */}
                  <header className="flex items-center gap-3 rounded-[14px] bg-white border border-[#ececec] px-4 py-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#fff4ec] text-[#F17A20] shrink-0">
                      {(() => {
                        const Icon = iconFor(activeCategory.icon);
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[18px] sm:text-[20px] font-bold text-ink truncate">{activeCategory.label}</h2>
                      {activeCategory.blurb && (
                        <p className="text-[12.5px] text-[#878787] line-clamp-1">{activeCategory.blurb}</p>
                      )}
                    </div>
                  </header>
                  <div className="flex flex-col gap-2">
                    {activeCategory.items.map((item) => (
                      <FaqCard
                        key={`${activeCategory.slug}-${item.id}`}
                        question={item.question}
                        answer={substitute(item.answer, { returnWindowDays })}
                        keyId={`${activeCategory.slug}-${item.id}`}
                        openItem={openItem}
                        setOpenItem={setOpenItem}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ─── Bottom CTA — "Still have questions?" ─────────────────── */}
        <div className="mt-10 rounded-[16px] bg-white border border-[#ececec] px-5 py-8 sm:px-8 sm:py-10 text-center shadow-sm">
          <h3 className="text-[20px] sm:text-[22px] font-bold text-ink">Still have questions?</h3>
          <p className="mt-1.5 text-[13px] text-[#878787] max-w-[520px] mx-auto">
            Our team is happy to help — reach out and we'll get back to you as soon as possible.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            {supportPhone && (
              <a
                href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[10px] bg-[#F17A20] px-5 text-[13.5px] font-bold text-white hover:bg-[#d76b1a]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {supportPhone}
              </a>
            )}
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[10px] border border-[#F17A20] bg-white px-5 text-[13.5px] font-bold text-[#F17A20] hover:bg-[#fff4ec]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {supportEmail}
              </a>
            )}
            {!supportPhone && !supportEmail && (
              <Link
                href="/orders"
                className="inline-flex h-[44px] items-center justify-center rounded-[10px] bg-[#F17A20] px-5 text-[13.5px] font-bold text-white hover:bg-[#d76b1a]"
              >
                Go to My Orders
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Accordion card ───────────────────────────────────────────────────────
function FaqCard({
  question,
  answer,
  keyId,
  openItem,
  setOpenItem,
  eyebrow,
}: {
  question: string;
  answer: string;
  keyId: string;
  openItem: string | null;
  setOpenItem: (s: string | null) => void;
  eyebrow?: string;
}) {
  const open = openItem === keyId;
  return (
    <div className={`rounded-[12px] border bg-white transition-colors ${open ? "border-[#F17A20]" : "border-[#ececec] hover:border-[#cfcfcf]"}`}>
      <button
        type="button"
        onClick={() => setOpenItem(open ? null : keyId)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left"
      >
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-0.5 text-[10.5px] uppercase tracking-[0.14em] text-[#a3a3a3]">{eyebrow}</div>
          )}
          <span className="text-[14px] font-semibold text-ink leading-snug">{question}</span>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-[#525151] transition-transform ${open ? "rotate-180 text-[#F17A20]" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-4 text-[13.5px] text-[#525151] leading-[1.75] whitespace-pre-line">
          {answer}
        </div>
      )}
    </div>
  );
}
