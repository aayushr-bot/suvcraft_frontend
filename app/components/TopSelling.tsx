import Link from "next/link";
import { Star } from "./icons";

const cards = [
  { img: "/figma/top1.png", name: "Summer Girl Dress", price: "$45", rating: "(4.2)", height: 240 },
  { img: "/figma/top2.png", name: "Summer Cloth", price: "$45", rating: "(4.2)", height: 290 },
  { img: "/figma/top3.png", name: "Water Bottle", price: "$45", rating: "(4.2)", height: 200 },
  { img: "/figma/top4.png", name: "Cap", price: "$45", rating: "(4.2)", height: 160 },
];

const outlinedPill =
  "inline-flex h-[40px] items-center justify-center rounded-full border-[1.5px] border-ink text-[13px] font-semibold text-ink hover:bg-black/5";

export default function TopSelling() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8">
      <div className="flex items-center">
        <button type="button" className={`${outlinedPill} px-5`}>
          See More Products
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-10">
        <h2 className="font-sans text-[22px] font-semibold leading-[1.15] text-ink md:text-[30px]">
          Top-Selling Products
          <br />
          Of the year Collection
        </h2>

        <div className="md:max-w-[320px] md:pt-1 md:text-right">
          <p className="text-[13px] leading-[1.55] text-[#525151]">
            What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the
            printing and typesetting industry.
          </p>
          <button type="button" className={`${outlinedPill} mt-3 px-5`}>
            Shop Now
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 items-end gap-4 md:grid-cols-4">
        {cards.map((p) => (
          <Link key={p.name} href="/product" className="flex flex-col group">
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
