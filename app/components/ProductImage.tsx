"use client";

import { useEffect, useRef, useState } from "react";

const PLACEHOLDER_IMG = "/product-placeholder.svg";

export default function ProductImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [img, setImg] = useState(src || PLACEHOLDER_IMG);
  const ref = useRef<HTMLImageElement>(null);

  // Sync internal state when the parent swaps the src (e.g. carousel navigation).
  useEffect(() => {
    setImg(src || PLACEHOLDER_IMG);
  }, [src]);

  // Catch images that failed to load BEFORE hydration (so onError never fires)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.complete && el.naturalHeight === 0 && img !== PLACEHOLDER_IMG) {
      setImg(PLACEHOLDER_IMG);
    }
  }, [img]);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      ref={ref}
      src={img}
      alt={alt}
      onError={() => { if (img !== PLACEHOLDER_IMG) setImg(PLACEHOLDER_IMG); }}
      className={className}
    />
  );
}
