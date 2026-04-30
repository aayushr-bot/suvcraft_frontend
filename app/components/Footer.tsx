import { api } from "@/lib/api";
import { ChevronRight } from "./icons";

type FooterSettings = {
  footer_phone?: string;
  footer_email?: string;
  footer_menu_1_title?: string;
  footer_menu_1_links?: string;
  footer_menu_2_title?: string;
  footer_menu_2_links?: string;
  footer_instagram?: string;
  footer_facebook?: string;
  footer_whatsapp?: string;
  footer_playstore?: string;
  footer_appstore?: string;
  footer_copyright?: string;
};

type MenuLink = { label: string; href: string };

function parseLinks(raw?: string): MenuLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((l) => l.label);
  } catch {}
  return raw.split("\n").filter(Boolean).map((l) => ({ label: l.trim(), href: "#" }));
}

export default async function Footer() {
  let settings: FooterSettings = {};
  try {
    settings = (await api.settings()) as FooterSettings;
  } catch {}

  const phone = settings.footer_phone || "983-456-7892";
  const email = settings.footer_email || "support@suvcraft.com";
  const copyright = settings.footer_copyright || "© Suvcraft 2024-2026";

  const menu1Title = settings.footer_menu_1_title || "What we offer";
  const menu1Links = parseLinks(settings.footer_menu_1_links) || [
    { label: "Home", href: "/" },
    { label: "About Us", href: "#" },
    { label: "Events", href: "#" },
    { label: "What we do", href: "#" },
    { label: "Contact", href: "#" },
  ];

  const menu2Title = settings.footer_menu_2_title || "What we offer";
  const menu2Links = parseLinks(settings.footer_menu_2_links) || menu1Links;

  const socials = [
    { img: "/figma/instagram.png", alt: "Instagram", href: settings.footer_instagram || "#" },
    { img: "/figma/Facebook.jpg", alt: "Facebook", href: settings.footer_facebook || "#" },
    { img: "/figma/whatsapp.jpg", alt: "WhatsApp", href: settings.footer_whatsapp || "#" },
    { img: "/figma/messages.jpg", alt: "Messages", href: "#" },
  ];

  const playstoreUrl = settings.footer_playstore || "#";
  const appstoreUrl = settings.footer_appstore || "#";

  return (
    <footer className="bg-[#F2F2F2] text-ink py-16 px-4 md:px-8 border-t border-[#e0e0e0]">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">

          {/* Logo & Newsletter */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/figma/suvcraft-logo.png" alt="SUVCRAFT" className="h-[52px] w-auto md:h-[64px]" />
              <span className="font-bruno text-[24px] md:text-[32px] font-bold text-brand-purple uppercase tracking-[0.08em]">SUVCRAFT</span>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex h-[52px] max-w-[420px] bg-[#F2F2F2] rounded-[4px] border border-[#d4d4d4] overflow-hidden shadow-sm">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 text-[14px] outline-none text-[#525151] bg-transparent"
                />
                <button className="h-full px-8 bg-white border-l border-[#d4d4d4] font-bold text-[14px] hover:bg-soft-gray transition-colors">
                  SIGN IN
                </button>
              </div>

              <div className="flex items-center gap-3 max-w-[320px] border-b border-[#d4d4d4] pb-2">
                <span className="text-[14px] text-[#525151] flex-1">Get latest offers to your inbox</span>
                <button className="bg-ink text-white p-1 rounded-[4px]">
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                {socials.map((s) => (
                  <a key={s.alt} href={s.href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full overflow-hidden shadow-sm flex items-center justify-center hover:scale-110 transition-transform bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.img} alt={s.alt} className="w-6 h-6 object-contain" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Menus */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-8">
            {[
              { title: menu1Title, links: menu1Links },
              { title: menu2Title, links: menu2Links },
            ].map((m, idx) => (
              <div key={idx}>
                <h4 className="font-bold text-[18px] mb-6 text-ink">{m.title}</h4>
                <ul className="flex flex-col gap-4">
                  {m.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-[14px] text-[#525151] hover:text-ink hover:underline">{l.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact & App */}
          <div className="lg:col-span-4 flex flex-row gap-8 lg:gap-12">
            <div className="flex-1">
              <h4 className="font-bold text-[18px] mb-6 text-ink">Contact Us</h4>
              <ul className="flex flex-col gap-3 text-[14px] text-[#525151]">
                {phone && <li className="font-medium whitespace-nowrap">{phone}</li>}
                {email && <li className="font-medium whitespace-nowrap">{email}</li>}
              </ul>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              <span className="text-[14px] font-medium text-[#525151] leading-tight">Experience the SUVCRAFT Mobile App</span>
              <div className="flex flex-col gap-4">
                <a href={playstoreUrl} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/figma/Google-play.png" alt="Google Play" className="h-[54px] w-auto object-contain" />
                </a>
                <a href={appstoreUrl} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/figma/App-store.png" alt="App Store" className="h-[54px] w-auto object-contain" />
                </a>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-dashed border-[#d1d1d1] pt-8">
          <p className="text-[15px] font-bold text-ink">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
