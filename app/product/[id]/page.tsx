import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import ProductDetailClient from "./ProductDetailClient";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let product = null;
  let fetchError = false;
  try {
    product = await api.product(id);
  } catch {
    fetchError = true;
  }

  if (!product && !fetchError) notFound();

  if (fetchError || !product) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-20 md:px-8 min-h-screen flex flex-col items-center justify-center gap-6 bg-white">
        <div className="text-[60px]">😕</div>
        <h2 className="text-[24px] font-bold text-ink">Product not found</h2>
        <p className="text-[14px] text-[#8c8c8c]">This product may have been removed or the link is incorrect.</p>
        <Link href="/" className="inline-flex h-[48px] items-center justify-center rounded-[10px] bg-ink px-8 text-[15px] font-bold text-white hover:bg-black">
          Back to Shop
        </Link>
      </div>
    );
  }

  const catId = (product as any).cat_id ?? (product as any).category_id;
  const [related, ratingsData, popularData, settings] = await Promise.all([
    api.products({
      per_page: 8,
      ...(catId ? { category_id: catId } : {}),
    }).catch(() => ({ rows: [] as any[] })),
    api.productRatings(product!.id, 10).catch(() => ({ rows: [], summary: { total: 0, avg_rating: 0, r5: 0, r4: 0, r3: 0, r2: 0, r1: 0 } })),
    api.popularProducts({ limit: 8, exclude: product!.id }).catch(() => ({ rows: [] as any[] })),
    api.settings().catch(() => ({})),
  ]);

  const relatedFiltered = ((related as any).rows ?? []).filter((p: any) => p.id !== product!.id).slice(0, 4);
  const popular = ((popularData as any).rows ?? []).filter((p: any) => p.id !== product!.id).slice(0, 4);

  return (
    <ProductDetailClient
      product={product}
      related={relatedFiltered}
      ratings={(ratingsData as any).rows ?? []}
      ratingSummary={(ratingsData as any).summary}
      popular={popular}
      settings={settings as any}
    />
  );
}
