import { ArrowRight } from "./icons";

export default function BagCollection() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-4 md:px-8">
      <div className="relative flex items-center gap-2 md:gap-4">
        <button
          type="button"
          aria-label="Previous"
          className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#e5e5e5] text-ink hover:bg-[#dcdcdc] md:h-[56px] md:w-[56px]"
        >
          <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={1.5} />
        </button>

        <div className="relative flex-1 overflow-hidden rounded-[16px] bg-[#efefef] px-5 py-4 md:rounded-[20px] md:px-10 md:py-2">
          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_1fr] md:gap-6">
            <div>
              <h2 className="font-sans text-[20px] font-semibold leading-[1.15] text-ink md:text-[26px]">
                Best Lather Bag
                <br />
                Collection
                <br />
                For You
              </h2>
              <p className="mt-3 max-w-[300px] text-[13px] leading-[1.55] text-ink">
                What is Lorem Ipsum? Lorem Ipsum is simply
                dummy text of the printing and typesetting
                industry.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex h-[40px] items-center justify-center rounded-full border-[1.5px] border-ink px-7 text-[13px] font-medium text-ink hover:bg-black/5"
              >
                Shop Now
              </button>
            </div>

            <div className="relative mx-auto h-[200px] w-full md:h-[290px] md:w-[440px]">
              <div className="absolute top-4 left-6 h-[150px] w-[150px] rounded-full bg-[#f8dccf] md:top-8 md:left-10 md:h-[220px] md:w-[220px]" />
              <div className="absolute right-2 bottom-0 h-[100px] w-[100px] rounded-full bg-[#d4e4f0] md:right-3 md:h-[150px] md:w-[150px]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/figma/bag-collection.png"
                alt="Leather bag"
                className="absolute right-0 top-1/2 z-10 h-[220px] w-[220px] -translate-y-1/2 object-contain md:right-2 md:h-[320px] md:w-[340px]"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Next"
          className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#e5e5e5] text-ink hover:bg-[#dcdcdc] md:h-[56px] md:w-[56px]"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}
