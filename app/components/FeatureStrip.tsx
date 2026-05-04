import type { SiteSettings } from "@/lib/api";

type Item = {
  key: string;
  emoji: string;
  title?: string;
  desc?: string;
  enabled: boolean;
};

export default function FeatureStrip({ settings }: { settings: SiteSettings }) {
  const items: Item[] = [
    {
      key: "shipping",
      emoji: "🚚",
      title: settings.shipping_title || "",
      desc: settings.shipping_description || "",
      enabled: Number(settings.shipping_mode ?? 0) === 1,
    },
    {
      key: "return",
      emoji: "↩️",
      title: settings.return_title || "",
      desc: settings.return_description || "",
      enabled: Number(settings.return_mode ?? 0) === 1,
    },
    {
      key: "support",
      emoji: "💬",
      title: settings.support_title || "",
      desc: settings.support_description || "",
      enabled: Number(settings.support_mode ?? 0) === 1,
    },
    {
      key: "safety",
      emoji: "🔒",
      title: settings.safety_security_title || "",
      desc: settings.safety_security_description || "",
      enabled: Number(settings.safety_security_mode ?? 0) === 1,
    },
  ];

  const visible = items.filter((i) => i.enabled && i.title);
  if (!visible.length) return null;

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((item) => (
          <div
            key={item.key}
            className="flex items-start gap-4 rounded-[16px] border border-[#e7e7e7] bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="text-[32px] leading-none">{item.emoji}</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-bold text-ink">{item.title}</h3>
              {item.desc && (
                <p className="mt-1 text-[13px] text-[#525151] leading-[1.45]">{item.desc}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
