"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "../components/icons";

export default function ProductsSearchForm({
  initialQuery = "",
  categoryId,
  typeSlug,
}: {
  initialQuery?: string;
  categoryId?: string;
  typeSlug?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    const trimmed = q.trim();
    if (trimmed) params.set("q", trimmed);
    if (categoryId) params.set("category_id", categoryId);
    if (typeSlug) params.set("type", typeSlug);
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products");
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <label className="flex h-[44px] flex-1 items-center gap-2 rounded-[45px] bg-paper px-5 shadow-sm">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products by name, SKU, or ID…"
          className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-[#8c8c8c] focus:outline-none"
        />
        <button type="submit" aria-label="Search">
          <SearchIcon className="h-4 w-4 text-ink-soft" />
        </button>
      </label>
    </form>
  );
}
