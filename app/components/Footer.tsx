import { Facebook, Instagram, Twitter, Youtube } from "./icons";

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

const socials = [
  { icon: Facebook, color: "#1877f2", label: "Facebook" },
  { icon: Instagram, color: "#e1306c", label: "Instagram" },
  { icon: Twitter, color: "#000000", label: "X" },
  { icon: Youtube, color: "#ff0000", label: "YouTube" },
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
    <footer className="mt-20 bg-[#1c1c1c] text-paper">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8 md:py-14">
        {/* Top row */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.1fr_1.2fr_1fr] md:items-start md:gap-10">
          <div>
            <h3 className="font-display text-[28px] font-bold tracking-[2.56px] text-pink md:text-[32px]">
              SUVCRAFT
            </h3>
            <div className="mt-5 flex h-[42px] max-w-[360px] items-center rounded-[6px] border border-[#3a3a3a] bg-[#1c1c1c] pl-1 pr-1">
              <input
                type="email"
                placeholder="www.suvcraft@gmail.com"
                className="h-full flex-1 bg-transparent px-3 text-[13px] text-paper placeholder:text-[#8b8b8b] focus:outline-none"
              />
              <button
                type="button"
                className="inline-flex h-[34px] items-center justify-center rounded-[4px] bg-white px-6 text-[13px] font-medium text-ink"
              >
                SIGN IN
              </button>
            </div>
            <p className="mt-5 max-w-[320px] text-[12px] leading-[1.6] text-[#9a9a9a]">
              Lorem ipsum is nonsensical, pseudo-Latin
              <br />
              placeholder text used in design
              <br />
              publishing to visual layout, typography,
            </p>
          </div>

          <div className="flex flex-col items-start md:items-center">
            <p className="text-[14px] font-semibold text-paper">
              Expreience the SUVCRAFT Mobile App
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href="#"
                className="flex h-[52px] w-[168px] items-center gap-2 rounded-[10px] bg-black px-3 text-white"
              >
                <svg viewBox="0 0 30 30" className="h-7 w-7 shrink-0">
                  <defs>
                    <linearGradient id="gpB" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#00c3ff" />
                      <stop offset="1" stopColor="#0066ff" />
                    </linearGradient>
                    <linearGradient id="gpG" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0" stopColor="#00a000" />
                      <stop offset="1" stopColor="#a0ff00" />
                    </linearGradient>
                    <linearGradient id="gpY" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#ffbd00" />
                      <stop offset="1" stopColor="#ff8500" />
                    </linearGradient>
                    <linearGradient id="gpR" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#ff3a44" />
                      <stop offset="1" stopColor="#c31162" />
                    </linearGradient>
                  </defs>
                  <path d="M4 3.2v23.6c0 .5.2.8.5 1l12-11.8L4.5 2.2c-.3.2-.5.5-.5 1Z" fill="url(#gpB)" />
                  <path d="M21 11.3 17.7 9.2 16.5 16l1.2 1.2Z" fill="url(#gpY)" />
                  <path d="M4.5 27.8c.3.1.7.1 1-.1l13.2-7.5-3-3Z" fill="url(#gpR)" />
                  <path d="M5.5 2.3c-.3-.2-.7-.2-1-.1l13.2 13 3-3Z" fill="url(#gpG)" />
                </svg>
                <span className="flex flex-col leading-tight">
                  <span className="text-[9px] uppercase tracking-wide">Get it on</span>
                  <span className="text-[16px] font-semibold">Google Play</span>
                </span>
              </a>

              <a
                href="#"
                className="flex h-[52px] w-[168px] items-center gap-2 rounded-[10px] bg-black px-3 text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 shrink-0">
                  <path d="M17.6 12.5c0-2 1.6-3 1.7-3-.9-1.3-2.4-1.5-2.9-1.5-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.7-.7-1.4 0-2.6.8-3.3 2-1.4 2.5-.4 6.1 1 8.1.7 1 1.5 2 2.6 2 1 0 1.4-.6 2.7-.6s1.6.6 2.7.6c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.2ZM15.7 6.5c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.1-.5.6-1 1.5-.9 2.4 1 .1 1.9-.4 2.4-1Z" />
                </svg>
                <span className="flex flex-col leading-tight">
                  <span className="text-[9px]">Download on the</span>
                  <span className="text-[16px] font-semibold">App Store</span>
                </span>
              </a>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end">
            <p className="text-[14px] font-medium text-paper">Follow Us On</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {socials.map(({ icon: Icon, color, label }) => (
                <span
                  key={label}
                  aria-label={label}
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#d9d9d9]"
                  style={{ color }}
                >
                  <Icon className="h-5 w-5" />
                </span>
              ))}
              <span
                aria-label="WhatsApp"
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#d9d9d9]"
                style={{ color: "#25d366" }}
              >
                <WhatsApp className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>

        {/* Bottom menu row */}
        <div className="mt-8 grid grid-cols-1 gap-8 md:mt-4 md:grid-cols-[1.1fr_1.2fr_1fr] md:items-start md:gap-10">
          <div className="hidden md:block" />

          <div className="grid grid-cols-2 gap-6 md:gap-10">
            {menus.map((m, i) => (
              <div key={i}>
                <h4 className="text-[16px] font-semibold text-paper">{m.title}</h4>
                <ul className="mt-4 space-y-2.5 text-[13px] text-[#b5b5b5]">
                  {m.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="hover:text-paper">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-[16px] font-semibold text-paper">Contact Us</h4>
            <ul className="mt-4 space-y-3 text-[13px] text-[#b5b5b5]">
              <li>983-456-7892</li>
              <li>support@deendari.com</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
