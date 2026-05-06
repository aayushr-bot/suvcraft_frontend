import Link from "next/link";
import { ArrowRight, Plus } from "./icons";
import { type SiteSettings, type Slider, imgUrl } from "@/lib/api";
import HeroSlider from "./HeroSlider";

function avatarSrc(path: string | undefined, fallback: string) {
  if (!path) return fallback;
  if (path.startsWith("http") || path.startsWith("/figma/")) return path;
  const clean = path.startsWith("/uploads/") ? path.slice("/uploads/".length) : path.replace(/^\//, "");
  return imgUrl(clean);
}

// Splits the trailing <p>…</p> off the heading so the last line can render in
// a flex row with the arrow + button (matching the design where the CTA sits
// to the right of the final word, e.g. "…and services → View All Products").
function splitHeading(html: string): { lead: string; tail: string } {
  const m = html.match(/^([\s\S]*?)(<p[^>]*>[\s\S]*?<\/p>)\s*$/i);
  if (!m) return { lead: "", tail: html };
  return { lead: m[1], tail: m[2] };
}

export default function Hero({
  settings = {},
  sliders = [],
}: {
  settings?: SiteSettings;
  sliders?: Slider[];
}) {
  const heading   = settings.hero_heading ?? "<p>Access to high - Quality,</p><p><strong>Eco-Friendly</strong> products</p><p>and services</p>";
  const custCount = settings.hero_customer_count ?? "500+";
  const custLabel = settings.hero_customer_label ?? "Happy Customers";
  const btnText   = settings.hero_btn_text ?? "View All Products";
  const btnLink   = settings.hero_btn_link ?? "/#all-products";

  const { lead, tail } = splitHeading(heading);
  const headingCls = "font-sans text-[32px] font-normal leading-[1.2] tracking-normal text-[#2a2a2a] md:text-[64px] [&_p]:block [&_strong]:font-medium [&_strong]:text-black";

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pt-0 pb-10 md:px-8">
      <div className="flex items-end justify-between gap-4 md:gap-10">
        <div className="flex-1">
          {lead && (
            <h1 className={headingCls} dangerouslySetInnerHTML={{ __html: lead }} />
          )}
          <div className="flex flex-wrap items-center gap-3 md:gap-5">
            <h1 className={headingCls} dangerouslySetInnerHTML={{ __html: tail }} />
            <ArrowRight className="h-5 w-5 text-ink md:h-6 md:w-6" strokeWidth={1.6} />
            <Link
              href={btnLink}
              className="inline-flex h-[46px] items-center justify-center rounded-[41px] bg-ink-soft px-6 text-[14px] font-medium text-white hover:bg-black whitespace-nowrap"
            >
              {btnText}
            </Link>
          </div>
        </div>

        <div className="flex w-[170px] flex-col items-center gap-2 pb-2">
          <div className="flex items-center">
            {[1, 2, 3]
              .map((n) => settings[`hero_avatar_${n}` as keyof SiteSettings] as string)
              .filter(Boolean)
              .map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={avatarSrc(src, "")}
                  alt=""
                  className="h-[44px] w-[44px] rounded-full border-[3px] border-cream object-cover"
                  style={{ marginLeft: i === 0 ? 0 : -14 }}
                />
              ))}
            <span
              className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-ink text-paper"
              style={{ marginLeft: -14 }}
            >
              <Plus className="h-4 w-4" />
            </span>
          </div>
          <div className="text-center">
            <p className="text-[20px] font-semibold leading-none text-ink">{custCount}</p>
            <p className="text-[13px] text-[#525151]">{custLabel}</p>
          </div>
        </div>
      </div>

      {/* The footer row (progress bar + View All + prev/next) lives inside
          HeroSlider so it has direct access to the carousel offset state. */}
      <HeroSlider sliders={sliders} />
    </section>
  );
}
