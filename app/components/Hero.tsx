import { ArrowRight, ChevronRight, HeartFill, HeartLine, Plus } from "./icons";

const heroCards = [
  { img: "/figma/hero1.png", alt: "Yellow raincoat model", liked: true, wide: true },
  { img: "/figma/hero2.png", alt: "Model portrait", liked: false, wide: false },
  { img: "/figma/hero3.png", alt: "White sneakers", liked: false, wide: false },
];

const avatars = ["/figma/avatar1.png", "/figma/avatar2.png", "/figma/avatar3.png"];

export default function Hero() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pt-0 pb-10 md:px-8">
      <div className="flex items-end justify-between gap-4 md:gap-10">
        <div className="flex-1">
          <h1 className="font-sans text-[32px] font-normal leading-[1.2] tracking-normal text-[#2a2a2a] md:text-[64px]">
            <span className="block">Access to high - Quality,</span>
            <span className="block">
              <span className="font-medium text-black">Eco-Friendly</span>{" "}
              <span>products</span>
            </span>
            <span className="flex flex-wrap items-center gap-4">
              <span>and services</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/figma/solar_arrow-up-linear.png"
                alt=""
                className="h-12 w-12 object-contain"
              />
              <button
                type="button"
                className="inline-flex h-[46px] items-center justify-center rounded-[41px] bg-ink-soft px-6 text-[14px] font-medium text-white hover:bg-black"
              >
                View All Products
              </button>
            </span>
          </h1>
        </div>

        <div className="flex w-[170px] flex-col items-center gap-2 pb-2">
          <div className="flex items-center">
            {avatars.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
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
            <p className="text-[20px] font-semibold leading-none text-ink">500+</p>
            <p className="text-[13px] text-[#525151]">Happy Customers</p>
          </div>
        </div>
      </div>

      <div className="relative mt-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-[1.68fr_1fr_1fr] md:pr-28">
          {heroCards.map((c) => (
            <article
              key={c.img}
              className="relative overflow-hidden rounded-[16px] bg-[#d9d9d9] ring-1 ring-black/5"
              style={{ height: 290 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.img}
                alt={c.alt}
                className="absolute inset-0 h-full w-full object-cover"
              />

              <button
                type="button"
                aria-label="Favorite"
                className="absolute left-3 top-3 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-paper text-ink shadow-sm"
              >
                {c.liked ? (
                  <HeartFill className="h-4 w-4 text-pink" />
                ) : (
                  <HeartLine className="h-4 w-4 text-ink" />
                )}
              </button>

              <button
                type="button"
                className="absolute right-3 top-3 inline-flex h-[32px] items-center justify-center rounded-[20px] bg-paper px-4 text-[13px] font-medium text-[#707070] shadow-sm"
              >
                Buy Now
              </button>

              <div className="absolute bottom-3 left-3 h-[52px] w-[150px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/figma/Rectangle 3463565.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain object-left-bottom"
                />
                <div className="relative z-10 flex h-full w-[130px] items-center justify-start pl-3 text-left text-[14px] font-medium leading-[1.2] text-[#292929]">
                  Get up to 50% off<br />discounts
                </div>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          aria-label="Next"
          className="absolute right-0 top-1/2 flex h-[64px] w-[64px] -translate-y-1/2 items-center justify-center rounded-full bg-[#d9d9d9] text-ink"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.4} />
        </button>
      </div>

      <div className="mt-10 flex items-center gap-4">
        <div className="flex flex-1 items-center">
          <span className="h-[2px] w-1/4 rounded-full bg-ink-soft" />
          <span className="h-px flex-1 bg-[#cfcfcf]" />
        </div>
        <button
          type="button"
          className="inline-flex h-[40px] items-center justify-center rounded-full border border-[#cfcfcf] px-7 text-[13px] font-medium text-ink hover:bg-black/5"
        >
          Feature Work
        </button>
        <button
          type="button"
          aria-label="Next"
          className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#cfcfcf] text-ink hover:bg-black/5"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
