"use client";

import { usePathname } from "next/navigation";
import type { SiteSettings } from "@/lib/api";

type IconKey = "shipping" | "return" | "support" | "safety";

type Item = {
  key: IconKey;
  title?: string;
  desc?: string;
  enabled: boolean;
};

// Lucide-style line icons rendered inline so the visual weight matches the
// rest of the site (currentColor lets us recolour from CSS).
function Icon({ name, className }: { name: IconKey; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  switch (name) {
    case "shipping":
      return (
        <svg {...common}>
          <path d="M3 7h11v9H3z" />
          <path d="M14 10h4l3 3v3h-7z" />
          <circle cx="7" cy="18" r="1.8" />
          <circle cx="17" cy="18" r="1.8" />
        </svg>
      );
    case "return":
      return (
        <svg {...common}>
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 6 6v0a6 6 0 0 1-6 6H8" />
        </svg>
      );
    case "support":
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 1 1 16 0v4a3 3 0 0 1-3 3h-1v-7h4" />
          <path d="M4 16a3 3 0 0 0 3 3h1v-7H4z" />
        </svg>
      );
    case "safety":
      return (
        <svg {...common}>
          <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
  }
}

export default function FeatureStrip({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  // Only show on the home page.
  if (pathname !== "/") return null;

  const items: Item[] = [
    {
      key: "shipping",
      title: settings.shipping_title || "",
      desc: settings.shipping_description || "",
      enabled: Number(settings.shipping_mode ?? 0) === 1,
    },
    {
      key: "return",
      title: settings.return_title || "",
      desc: settings.return_description || "",
      enabled: Number(settings.return_mode ?? 0) === 1,
    },
    {
      key: "support",
      title: settings.support_title || "",
      desc: settings.support_description || "",
      enabled: Number(settings.support_mode ?? 0) === 1,
    },
    {
      key: "safety",
      title: settings.safety_security_title || "",
      desc: settings.safety_security_description || "",
      enabled: Number(settings.safety_security_mode ?? 0) === 1,
    },
  ];

  const visible = items.filter((i) => i.enabled && i.title);
  if (!visible.length) return null;

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pt-10 pb-16 md:px-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((item) => (
          <div
            key={item.key}
            className="group flex flex-col items-center gap-3 rounded-[18px] border border-[#e7e7e7] bg-paper p-6 text-center transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(62,1,73,0.25)] hover:border-brand-purple/40"
          >
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#fff2d1] text-brand-purple ring-1 ring-brand-purple/10 transition-colors group-hover:bg-brand-purple group-hover:text-white">
              <Icon name={item.key} className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-ink leading-[1.5]">{item.title}</h3>
              {item.desc && (
                <p className="mt-1 text-[12.5px] text-[#605e5e] leading-[1.8]">{item.desc}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
