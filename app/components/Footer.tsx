import { Facebook, Instagram, Twitter, Youtube, ChevronRight } from "./icons";

const menus = [
  {
    title: "What we offer",
    links: ["Home", "About Us", "Events", "What we do", "Contact"],
  },
  {
    title: "What we offer",
    links: ["Home", "About Us", "Events", "What we do", "Contact"],
  },
];

function WhatsApp(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className}>
      <path d="M20.5 3.5A10 10 0 0 0 4 16l-1.5 5.5L8 20a10 10 0 0 0 12.5-16.5Zm-8.5 15a8 8 0 0 1-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 18.5Zm4.5-5.9c-.3-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.9-.8 1-.3.2-.5.1a6.6 6.6 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2 0-.2 0-.3 0-.5l-.9-2.1c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.3 5.4 5.4 0 0 0 1 2.8 11.6 11.6 0 0 0 4.5 4 5 5 0 0 0 3 .7 2.5 2.5 0 0 0 1.7-1.2 2 2 0 0 0 .1-1.2c-.1-.2-.3-.3-.6-.4Z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#F2F2F2] text-ink py-16 px-4 md:px-8 border-t border-[#e0e0e0]">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
          {/* Logo & Newsletter (5 columns) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <img src="/figma/suvcraft-logo.png" alt="SUVCRAFT" className="h-[52px] w-auto md:h-[64px]" />
              <span className="font-bruno text-[24px] md:text-[32px] font-bold text-brand-purple uppercase tracking-[0.08em]">SUVCRAFT</span>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex h-[52px] max-w-[420px] bg-[#F2F2F2] rounded-[4px] border border-[#d4d4d4] overflow-hidden shadow-sm">
                <input 
                  type="email" 
                  placeholder="www.suvcraft@gmail.com" 
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
                {[
                  { img: "/figma/instagram.png", alt: "Instagram" },
                  { img: "/figma/Facebook.jpg", alt: "Facebook" },
                  { img: "/figma/whatsapp.jpg", alt: "WhatsApp" },
                  { img: "/figma/messages.jpg", alt: "Messages" }
                ].map((s, i) => (
                  <div key={i} className="w-10 h-10 rounded-full overflow-hidden shadow-sm flex items-center justify-center cursor-pointer hover:scale-110 transition-transform bg-white">
                    <img src={s.img} alt={s.alt} className="w-6 h-6 object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Menus (3 columns) */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-8">
            {menus.map((m, idx) => (
              <div key={idx}>
                <h4 className="font-bold text-[18px] mb-6 text-ink">{m.title}</h4>
                <ul className="flex flex-col gap-4">
                  {m.links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-[14px] text-[#525151] hover:text-ink hover:underline">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact & App (4 columns - Beside each other) */}
          <div className="lg:col-span-4 flex flex-row gap-8 lg:gap-12">
            <div className="flex-1">
              <h4 className="font-bold text-[18px] mb-6 text-ink">Contact Us</h4>
              <ul className="flex flex-col gap-3 text-[14px] text-[#525151]">
                <li className="font-medium whitespace-nowrap">983-456-7892</li>
                <li className="font-medium whitespace-nowrap">support@deendari.com</li>
              </ul>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              <span className="text-[14px] font-medium text-[#525151] leading-tight">Expreience the SUVCRAFT Mobile App</span>
              <div className="flex flex-col gap-4">
                <a href="#" className="block hover:opacity-80 transition-opacity">
                  <img src="/figma/Google-play.png" alt="Google Play" className="h-[54px] w-auto object-contain" />
                </a>
                <a href="#" className="block hover:opacity-80 transition-opacity">
                  <img src="/figma/App-store.png" alt="App Store" className="h-[54px] w-auto object-contain" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-[#d1d1d1] pt-8">
          <p className="text-[15px] font-bold text-ink">© Suvcraft 2024-2026</p>
        </div>
      </div>
    </footer>
  );
}
