import { api, imgUrl, type SiteSettings, type Category } from "@/lib/api";

// Resolve a stored upload path (or external URL) into something an <img src> can use.
// Returns "" if nothing usable — caller can hide the element.
function resolveUpload(path?: string): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}


export default async function Footer() {
  let settings: SiteSettings = {};
  let categories: Category[] = [];
  try { settings = (await api.settings()) as SiteSettings; } catch {}
  try { categories = (await api.categories()).rows; } catch {}

  // ── Branding ────────────────────────────────────────────────────────────
  // Prefer footer_logo, fall back to header logo, only render <img> if we have one.
  const footerLogo = resolveUpload(settings.footer_logo) || resolveUpload(settings.logo);
  const siteTitle = settings.site_title || "";
  const shortDesc = settings.app_short_description || "";

  // ── Contact ─────────────────────────────────────────────────────────────
  const phone = settings.support_number || settings.footer_phone || "";
  const email = settings.support_email || settings.footer_email || "";
  const address = settings.address || "";
  const hasContact = !!(phone || email || address);

  // ── Quick Links: derive from categories so this section is always populated ─
  const quickLinks = [
    { label: "Home", href: "/" },
    ...categories.slice(0, 4).map((c) => ({ label: c.name, href: `/?category_id=${c.id}` })),
    { label: "My Orders", href: "/orders" },
    { label: "Cart", href: "/cart" },
  ];

  // ── Social links — admin uploads icons + URLs in Settings → Social Media Links ──
  type SocialEntry = { image?: string; url?: string; label?: string };
  const rawSocials: SocialEntry[] = Array.isArray(settings.social_links)
    ? (settings.social_links as SocialEntry[])
    : [];
  const socials = rawSocials
    .map((s) => ({
      img: resolveUpload(s.image),
      href: (s.url || "").trim(),
      label: (s.label || "").trim() || "Social link",
    }))
    .filter((s) => s.href && s.img);

  // ── App download promo (only if enabled and at least one URL is set) ────
  // The toggle may arrive as boolean true (JSON), number 1, or string "1" depending
  // on how it was saved — Number() normalizes all three.
  const appSectionEnabled = Number(settings.app_download_section ?? 0) === 1;
  const playstoreUrl = settings.app_download_section_playstore_url || settings.footer_playstore || "";
  const appstoreUrl  = settings.app_download_section_appstore_url  || settings.footer_appstore  || "";
  const showApp = appSectionEnabled && (playstoreUrl || appstoreUrl);
  const appTitle    = settings.app_download_section_title || (siteTitle ? `${siteTitle} Mobile App` : "Mobile App");
  const appTagline  = settings.app_download_section_tagline || "";
  const appShortDesc = settings.app_download_section_short_description || "";

  // ── Legal & Policies — admin manages content at /admin/policies, each row
  // here links to the public /policies/[slug] page that renders the HTML. ─
  const policyLinks = [
    { label: "About Us", href: "/policies/about-us" },
    { label: "Privacy Policy", href: "/policies/privacy-policy" },
    { label: "Shipping Policy", href: "/policies/shipping-policy" },
    { label: "Return Policy", href: "/policies/return-policy" },
  ];

  // ── Copyright (always last; falls back gracefully) ──────────────────────
  const copyright = settings.copyright_details
    || settings.footer_copyright
    || (siteTitle ? `© ${new Date().getFullYear()} ${siteTitle}. All rights reserved.` : "");

  return (
    <footer className="bg-[#F2F2F2] text-ink py-14 px-4 md:px-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-6 lg:items-start mb-6">

          {/* Branding — extra right padding keeps the description from
              crowding the Policies column on wide screens. */}
          <div className="lg:col-span-4 lg:pr-12 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              {footerLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={footerLogo} alt={siteTitle || "logo"} className="h-[48px] w-auto md:h-[56px]" />
              ) : siteTitle ? (
                <span className="font-bruno text-[22px] md:text-[28px] font-bold text-brand-purple uppercase tracking-[0.08em]">
                  {siteTitle}
                </span>
              ) : null}
            </div>
            {shortDesc && (
              <p className="text-[13px] text-[#525151] leading-[1.6] max-w-[420px]">{shortDesc}</p>
            )}
            {socials.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                {socials.map((s, i) => (
                  <a
                    key={i}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:scale-110 transition-transform overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.img} alt={s.label} className="h-6 w-6 object-contain" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Policies (admin-managed legal pages) — sits before Quick Links
              so legal docs are the first thing users see in the link area. */}
          <div className="lg:col-span-2">
            <h4 className="font-bold text-[16px] mb-3 text-ink">Policies</h4>
            <ul className="flex flex-col gap-1.5">
              {policyLinks.map((p) => (
                <li key={p.href}>
                  <a href={p.href} className="text-[14px] text-[#525151] hover:text-ink hover:underline">
                    {p.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links (auto-derived from categories) */}
          <div className="lg:col-span-2">
            <h4 className="font-bold text-[16px] mb-3 text-ink">Quick Links</h4>
            <ul className="flex flex-col gap-1.5">
              {quickLinks.map((l) => (
                <li key={l.label + l.href}>
                  <a href={l.href} className="text-[14px] text-[#525151] hover:text-ink hover:underline">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact — hidden entirely if admin hasn't filled anything in */}
          {hasContact && (
            <div className="lg:col-span-2">
              <h4 className="font-bold text-[16px] mb-3 text-ink">Contact Us</h4>
              <ul className="flex flex-col gap-2.5 text-[14px] text-[#525151]">
                {phone && <li className="font-medium">{phone}</li>}
                {email && <li className="font-medium break-all">{email}</li>}
                {address && <li className="leading-[1.5]">{address}</li>}
              </ul>
            </div>
          )}

          {/* App download — hidden unless admin enables it AND set at least one URL */}
          {showApp && (
            <div className="lg:col-span-2 flex flex-col items-center text-center">
              <h4 className="font-bold text-[16px] mb-3 text-ink">{appTitle}</h4>
              {appTagline && <p className="text-[12px] text-[#878787] mb-1">{appTagline}</p>}
              {appShortDesc && <p className="text-[12px] text-[#878787] leading-[1.5] mb-4">{appShortDesc}</p>}
              <div className="flex flex-col items-center gap-3">
                {playstoreUrl && (
                  <a href={playstoreUrl} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/figma/Google-play.png" alt="Google Play" className="h-[52px] w-auto object-contain" />
                  </a>
                )}
                {appstoreUrl && (
                  <a href={appstoreUrl} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/figma/App-store.png" alt="App Store" className="h-[52px] w-auto object-contain" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dotted separator + copyright. Policy links now live in their own
            footer column (above) so this row is only the copyright line. */}
        {copyright && (
          <div
            className="pt-6 mt-8"
            style={{
              backgroundImage:
                "linear-gradient(to right, #7E7E7E 50%, transparent 50%)",
              backgroundSize: "10px 1px",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "top",
            }}
          >
            <p className="text-[14px] font-medium text-ink lg:pl-20">{copyright}</p>
          </div>
        )}
      </div>
    </footer>
  );
}
