"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type FaqItem = { q: string; a: React.ReactNode };
type Category = {
  /** URL hash slug. Stable — used by Need Help links on the order pages. */
  id: string;
  label: string;
  Icon: React.FC<{ className?: string }>;
  blurb: string;
  items: FaqItem[];
};

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

// Hash aliases — the order detail / track pages historically link to
// `#order-issues`, `#delivery-info`, and `#returns`. Map those to the new
// tab ids so the deep links keep working.
const HASH_ALIASES: Record<string, string> = {
  "order-issues": "orders-delivery",
  "delivery-info": "orders-delivery",
  "returns": "returns-refunds",
  "refunds": "returns-refunds",
  "payments": "payments-pricing",
  "account": "account-app",
  "products": "products-shopping",
};

function buildCategories(returnWindowDays: number): Category[] {
  return [
    {
      id: "orders-delivery",
      label: "Orders & Delivery",
      Icon: CartIcon,
      blurb: "Placing orders, tracking shipments, delivery windows, and changes.",
      items: [
        {
          q: "How do I place an order on Suvcraft?",
          a: (
            <>
              Browse products, tap any tile to open the product page, pick size / colour,
              and tap <span className="font-semibold">Add to cart</span>. From the cart
              you can review the line, apply a coupon, choose an address, pay, and you're done.
              You don't need an account to browse, but you do need to sign in to check out.
            </>
          ),
        },
        {
          q: "How long does delivery take?",
          a: (
            <>
              Standard delivery lands in <span className="font-semibold">3–7 working days</span> from
              dispatch. The exact estimate for your pincode appears on the product page and
              again on the checkout summary.
            </>
          ),
        },
        {
          q: "How can I track my order?",
          a: (
            <>
              Open <Link href="/orders" className="font-semibold text-ink underline">My Orders</Link>{" "}
              and tap <span className="font-semibold">Track order</span> on any order. You'll
              see the live status: Confirmed → Shipped → Out for delivery → Delivered, along
              with each stage's timestamp.
            </>
          ),
        },
        {
          q: "Can I modify or cancel my order after placing it?",
          a: (
            <>
              Any order that hasn't shipped yet can be cancelled from the order detail page.
              Once it's marked <em>Shipped</em>, you'll need to wait for delivery and then
              submit a return. Address changes are accepted up to dispatch — reply on the
              order's chat thread with the new address.
            </>
          ),
        },
        {
          q: "I received the wrong item or it's missing parts.",
          a: (
            <>
              Open the affected order, tap <span className="font-semibold">Return / Exchange</span>{" "}
              on the line, and pick <em>“Wrong item delivered”</em> or{" "}
              <em>“Missing parts or accessories”</em>. Attach a photo — our team verifies and
              schedules a courier pickup within 24–48 hours.
            </>
          ),
        },
        {
          q: "Are there any delivery charges?",
          a: (
            <>
              Delivery is free above a small threshold (shown on the product page for your
              pincode). Below that, a flat shipping fee is added at checkout — you'll see
              the exact amount before paying.
            </>
          ),
        },
        {
          q: "Do you deliver outside India?",
          a: <>We ship within India only for now. International shipping is on the roadmap.</>,
        },
      ],
    },
    {
      id: "returns-refunds",
      label: "Returns & Refunds",
      Icon: ReturnIcon,
      blurb: "Return window, refund methods, exchanges, pickup, and cancellations.",
      items: [
        {
          q: "How many days do I have to return an item?",
          a: (
            <>
              You have <span className="font-semibold">{returnWindowDays} days</span> from
              delivery to request a return or exchange. After that, the option is no longer
              available on the order page.
            </>
          ),
        },
        {
          q: "How do I start a return or exchange?",
          a: (
            <>
              Open the delivered order and tap <span className="font-semibold">Return / Exchange</span>.
              Pick the item and reason, attach photos / video evidence if relevant, choose
              your refund method (original payment or wallet) for returns, and confirm the
              pickup address. We schedule the courier from there.
            </>
          ),
        },
        {
          q: "What's the difference between Return and Exchange?",
          a: (
            <>
              <span className="font-semibold">Return</span> sends the item back for a refund.{" "}
              <span className="font-semibold">Exchange</span> swaps it for a different size or
              colour of the same product — the variant picker lets you pick the replacement
              before submitting. Products marked{" "}
              <em>“No return — only exchange”</em> disable the refund path but still allow
              variant swaps.
            </>
          ),
        },
        {
          q: "When will I get my refund?",
          a: (
            <>
              For <span className="font-semibold">original payment</span> refunds, the amount
              lands on your card / UPI in 5–7 working days after pickup is verified.{" "}
              <span className="font-semibold">Wallet</span> refunds are instant — credited the
              moment we verify the return, usable on your next order.
            </>
          ),
        },
        {
          q: "Can I cancel a return request after submitting?",
          a: (
            <>
              Yes — open the return from your order page and tap{" "}
              <span className="font-semibold">Cancel request</span>. Cancellation is allowed
              up until the courier physically picks up the item. Once marked{" "}
              <em>Picked up</em>, contact support to back out.
            </>
          ),
        },
        {
          q: "Will the courier pick up my return?",
          a: (
            <>
              Yes — once admin approves, a courier is scheduled at the pickup address you
              chose. No drop-off needed. Keep the original packaging if you have it.
            </>
          ),
        },
        {
          q: "Why was my return request rejected?",
          a: (
            <>
              The most common reasons: the return window had closed, the product is flagged
              <em> not returnable </em> (refund-only block — exchange is still allowed),
              or the photo evidence didn't support the stated reason. The rejection note
              appears on the tracking modal.
            </>
          ),
        },
      ],
    },
    {
      id: "payments-pricing",
      label: "Payments & Pricing",
      Icon: CardIcon,
      blurb: "Payment methods, wallet credits, coupons, and refund timelines.",
      items: [
        {
          q: "What payment methods do you accept?",
          a: (
            <>
              Credit / debit cards, UPI, net-banking, and Cash on Delivery (COD) where
              available for the pincode. You can also pay fully or partially from your
              Suvcraft wallet, if admin has wallet payments enabled.
            </>
          ),
        },
        {
          q: "How does the wallet work?",
          a: (
            <>
              Your wallet holds store credit — refunds (when you pick the wallet refund
              method), admin-issued credits, and promotional top-ups all land here. At
              checkout, toggle <span className="font-semibold">Use wallet</span> to apply
              the balance. If the wallet covers the full order, no card payment is needed.
            </>
          ),
        },
        {
          q: "My payment was deducted but the order didn't go through.",
          a: (
            <>
              The amount is auto-reversed by your bank within 5–7 working days — no action
              needed from you. If you don't see the reversal after that window, contact us
              with the transaction reference from your bank statement.
            </>
          ),
        },
        {
          q: "How do I apply a coupon or promo code?",
          a: (
            <>
              In the cart, enter the code into the <span className="font-semibold">Promo code</span>{" "}
              field and tap apply. Eligible discounts show below the subtotal before you pay.
            </>
          ),
        },
        {
          q: "Are prices inclusive of tax?",
          a: (
            <>
              Yes — every product price you see is inclusive of GST. Tax breakdown is also
              shown on the order summary for full transparency.
            </>
          ),
        },
      ],
    },
    {
      id: "account-app",
      label: "Account & App",
      Icon: UserIcon,
      blurb: "Signing in, profile details, saved addresses, and notifications.",
      items: [
        {
          q: "How do I create an account?",
          a: (
            <>
              Tap the profile icon in the header. Enter your phone number, verify the OTP,
              and you're in. We auto-create your account on first checkout if you'd prefer
              to defer it.
            </>
          ),
        },
        {
          q: "I forgot my password — what do I do?",
          a: (
            <>
              From the sign-in screen, tap <span className="font-semibold">Forgot password</span>.
              We'll email you a reset link valid for 30 minutes.
            </>
          ),
        },
        {
          q: "How do I update my saved addresses?",
          a: (
            <>
              Open <Link href="/addresses" className="font-semibold text-ink underline">Saved addresses</Link>{" "}
              from your profile. You can add, edit, set a default, or delete any address.
              These flow into checkout and the return-pickup picker.
            </>
          ),
        },
        {
          q: "How do I change my profile details?",
          a: (
            <>
              Open <Link href="/profile" className="font-semibold text-ink underline">My profile</Link> to
              edit name, email, or phone number, and to upload a profile photo.
            </>
          ),
        },
      ],
    },
    {
      id: "products-shopping",
      label: "Products & Shopping",
      Icon: TagIcon,
      blurb: "Sizing, stock, wishlist, and product reviews.",
      items: [
        {
          q: "How do I know my correct size?",
          a: (
            <>
              Every product page has a size chart. We also surface buyer reviews that mention
              fit on the product page — handy when the chart doesn't quite tell the full
              story.
            </>
          ),
        },
        {
          q: "An item I want is out of stock — can I get notified?",
          a: (
            <>
              Add the product to your{" "}
              <Link href="/wishlist" className="font-semibold text-ink underline">wishlist</Link> — we
              ping you the moment that size / colour is back.
            </>
          ),
        },
        {
          q: "Can I leave a review for products I've bought?",
          a: (
            <>
              Yes — once an order is delivered, tap <span className="font-semibold">Rate this product</span>{" "}
              on the order detail page. You can leave stars, a written review, and attach
              up to 6 photos or short videos.
            </>
          ),
        },
        {
          q: "How do I save items for later?",
          a: (
            <>
              Tap the heart icon on any product card or product page to add it to your
              wishlist. The wishlist is synced across devices once you're signed in.
            </>
          ),
        },
      ],
    },
  ];
}

export default function FaqPage() {
  const [returnWindowDays, setReturnWindowDays] = useState(7);
  const [supportPhone, setSupportPhone] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [activeId, setActiveId] = useState<string>("orders-delivery");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const categories = useMemo(() => buildCategories(returnWindowDays), [returnWindowDays]);
  const activeCategory = categories.find((c) => c.id === activeId) || categories[0];

  // When the user types in the search bar we collapse the sidebar into a
  // single "Results" view that pulls matching Q&As across every category.
  const searching = searchQuery.trim().length > 0;
  const searchResults = useMemo(() => {
    if (!searching) return [];
    const q = searchQuery.toLowerCase();
    const matches: { category: Category; item: FaqItem }[] = [];
    for (const c of categories) {
      for (const item of c.items) {
        // Convert the React answer to a string roughly — good enough for keyword match.
        const answerText =
          typeof item.a === "string" ? item.a : extractText(item.a);
        if (
          item.q.toLowerCase().includes(q) ||
          answerText.toLowerCase().includes(q)
        ) {
          matches.push({ category: c, item });
        }
      }
    }
    return matches;
  }, [searchQuery, categories, searching]);

  return (
    <div className="min-h-screen bg-[#f6f6f8]">
      {/* ─── Hero band ───────────────────────────────────────────────── */}
      {/* Matches the cream-toned navbar (#FFF6DE) so the page reads as one
          continuous header section. Same max-width + padding as the navbar. */}
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
        {/* On lg+ the category nav sits as a vertical sidebar on the left and
            content fills the rest of the row. On mobile both stack and the
            nav becomes a horizontal scrollable strip so labels stay readable. */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Category nav — sidebar on desktop, horizontal strip on mobile. */}
          <nav
            aria-label="FAQ categories"
            className="rounded-[14px] bg-white border border-[#ececec] p-2 overflow-x-auto lg:overflow-visible lg:w-[260px] lg:shrink-0 lg:self-start lg:sticky lg:top-6"
          >
            <div className="flex lg:flex-col items-stretch gap-2 min-w-max lg:min-w-0">
              {categories.map((c) => {
                const active = !searching && activeId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveId(c.id);
                      setSearchQuery("");
                      setOpenItem(null);
                      if (typeof window !== "undefined") {
                        history.replaceState(null, "", `#${c.id}`);
                      }
                    }}
                    className={`flex-1 lg:flex-none lg:w-full inline-flex items-center justify-center lg:justify-start gap-2 whitespace-nowrap rounded-[10px] px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
                      active
                        ? "bg-[#fff4ec] text-[#F17A20] ring-1 ring-[#F17A20]/20"
                        : "text-ink hover:bg-[#f6f6f8]"
                    }`}
                  >
                    <c.Icon className={`h-4.5 w-4.5 ${active ? "text-[#F17A20]" : "text-[#525151]"}`} />
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
                    searchResults.map(({ category, item }, i) => (
                      <FaqCard
                        key={`${category.id}-${i}`}
                        item={item}
                        keyId={`s-${category.id}-${i}`}
                        openItem={openItem}
                        setOpenItem={setOpenItem}
                        eyebrow={category.label}
                      />
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Section header — wrapped in the same white card as the
                    nav above so the two strips align in width + styling. */}
                <header className="flex items-center gap-3 rounded-[14px] bg-white border border-[#ececec] px-4 py-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#fff4ec] text-[#F17A20] shrink-0">
                    <activeCategory.Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[18px] sm:text-[20px] font-bold text-ink truncate">{activeCategory.label}</h2>
                    <p className="text-[12.5px] text-[#878787] line-clamp-1">{activeCategory.blurb}</p>
                  </div>
                </header>
                <div className="flex flex-col gap-2">
                  {activeCategory.items.map((item, i) => (
                    <FaqCard
                      key={`${activeCategory.id}-${i}`}
                      item={item}
                      keyId={`${activeCategory.id}-${i}`}
                      openItem={openItem}
                      setOpenItem={setOpenItem}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

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
  item,
  keyId,
  openItem,
  setOpenItem,
  eyebrow,
}: {
  item: FaqItem;
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
          <span className="text-[14px] font-semibold text-ink leading-snug">{item.q}</span>
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
        <div className="px-4 sm:px-5 pb-4 text-[13.5px] text-[#525151] leading-[1.75]">
          {item.a}
        </div>
      )}
    </div>
  );
}

// Best-effort text extraction so the search filter can match against the
// answer copy, not just the question. ReactNode walking is intentionally
// shallow — we don't need 100% accuracy, just enough to find the row.
function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (typeof node === "object" && node && "props" in node) {
    const n = node as { props?: { children?: React.ReactNode } };
    return extractText(n.props?.children);
  }
  return "";
}
