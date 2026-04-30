import Link from "next/link";
import { Star } from "./icons";
import { type Product, type SiteSettings, imgUrl } from "@/lib/api";

const HEIGHTS = [240, 290, 200, 160];

const outlinedPill =
  "inline-flex h-[40px] items-center justify-center rounded-full border-[1.5px] border-ink text-[13px] font-semibold text-ink hover:bg-black/5";

export default function TopSelling({ products, settings = {} }: { products: Product[]; settings?: SiteSettings }) {
  const heading = settings.topselling_heading ?? "Top-Selling Products";
  const subheading = settings.topselling_subheading ?? "Of the year Collection";
  const description = settings.topselling_description ?? "What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing and typesetting industry.";
  const btnText = settings.topselling_btn_text ?? "Shop Now";
  const btnLink = settings.topselling_btn_link ?? "/#all-products";
  const moreText = settings.topselling_more_text ?? "See More Products";
  const moreLink = settings.topselling_more_link ?? "/#all-products";

  if (products.length === 0) return null;

  const cards = products.slice(0, 4).map((p, i) => {
    const sp = Number((p as Product).special_price ?? 0);
    const rg = Number((p as Product).price ?? 0);
    const pr = sp && rg && sp < rg ? sp : rg;
    const img = !p.image
      ? "/product-placeholder.svg"
      : p.image.startsWith("/figma/") || p.image.startsWith("http")
      ? p.image
      : imgUrl(p.image.startsWith("/uploads/") ? p.image.slice("/uploads/".length) : p.image.replace(/^\//, ""));
    return {
      img,
      name: p.name,
      price: pr ? `₹${pr.toLocaleString("en-IN")}` : "—",
      rating: `(${Number(p.rating ?? 0).toFixed(1)})`,
      height: HEIGHTS[i],
      id: p.id,
    };
  });

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8">
      <div className="flex items-center">
        <Link href={moreLink} className={`${outlinedPill} px-5`}>
          {moreText}
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-10">
        <h2 className="font-sans text-[22px] font-semibold leading-[1.15] text-ink md:text-[30px]">
          {heading}
          {subheading && (<><br />{subheading}</>)}
        </h2>

        <div className="md:max-w-[320px] md:pt-1 md:text-right">
          {description && (
            <div
              className="text-[13px] leading-[1.55] text-[#525151] prose prose-sm max-w-none [&_a]:text-brand-purple [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}
          <Link href={btnLink} className={`${outlinedPill} mt-3 px-5`}>
            {btnText}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 items-end gap-4 md:grid-cols-4">
        {cards.map((p) => (
          <Link key={p.id} href={`/product/${p.id}`} className="flex flex-col group">
            <div
              className="relative overflow-hidden rounded-[16px] group-hover:brightness-95 transition-all"
              style={{ height: p.height }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.img}
                alt={p.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-medium text-ink group-hover:underline">{p.name}</h3>
                <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-[#605e5e]">
                  <Star className="h-3 w-3 text-[#f5a524]" />
                  {p.rating}
                </span>
              </div>
              <span className="text-[18px] font-semibold text-ink">
                {p.price}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
