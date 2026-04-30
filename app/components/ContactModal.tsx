"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { MailIcon, HeadsetIcon } from "./icons";
import { api, type SiteSettings } from "@/lib/api";

function PhoneIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.95.38 1.88.74 2.77a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.31-1.31a2 2 0 0 1 2.11-.45c.89.36 1.82.61 2.77.74a2 2 0 0 1 1.72 2Z" />
    </svg>
  );
}

function WhatsappIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.967-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 2C6.477 2 2 6.477 2 12c0 1.85.51 3.586 1.395 5.073L2 22l5.072-1.318A9.962 9.962 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 0 1-4.071-1.115l-.292-.174-3.018.785.806-2.939-.19-.302A7.96 7.96 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
    </svg>
  );
}

function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.563V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

export default function ContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || settings) return;
    setLoading(true);
    api.settings()
      .then(setSettings)
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }, [isOpen, settings]);

  const phone = settings?.footer_phone?.trim();
  const email = settings?.footer_email?.trim();
  const whatsapp = settings?.footer_whatsapp?.trim();
  const instagram = settings?.footer_instagram?.trim();
  const facebook = settings?.footer_facebook?.trim();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-brand-purple text-white">
            <HeadsetIcon className="h-7 w-7" />
          </span>
          <div>
            <span className="text-[13px] text-[#8c8c8c] font-medium">We're here to help</span>
            <h2 className="text-[28px] font-bold text-ink leading-tight">Contact Us</h2>
          </div>
        </div>

        {loading && !settings && (
          <p className="text-[14px] text-[#8c8c8c] py-4">Loading contact details…</p>
        )}

        {!loading && settings && (
          <div className="flex flex-col gap-3">
            {phone && (
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-4 rounded-[12px] border border-[#e7e7e7] p-4 transition-all hover:border-brand-purple hover:bg-[#fdf7ff]">
                <span className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#f0f0f0] text-ink">
                  <PhoneIcon className="h-5 w-5" />
                </span>
                <div className="flex flex-col">
                  <span className="text-[12px] text-[#8c8c8c]">Call us</span>
                  <span className="text-[15px] font-semibold text-ink">{phone}</span>
                </div>
              </a>
            )}

            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-4 rounded-[12px] border border-[#e7e7e7] p-4 transition-all hover:border-brand-purple hover:bg-[#fdf7ff]">
                <span className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#f0f0f0] text-ink">
                  <MailIcon className="h-5 w-5" />
                </span>
                <div className="flex flex-col">
                  <span className="text-[12px] text-[#8c8c8c]">Email us</span>
                  <span className="text-[15px] font-semibold text-ink break-all">{email}</span>
                </div>
              </a>
            )}

            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-[12px] border border-[#e7e7e7] p-4 transition-all hover:border-[#25D366] hover:bg-[#f4fff8]">
                <span className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#e7f9ee] text-[#25D366]">
                  <WhatsappIcon className="h-6 w-6" />
                </span>
                <div className="flex flex-col">
                  <span className="text-[12px] text-[#8c8c8c]">WhatsApp</span>
                  <span className="text-[15px] font-semibold text-ink">Chat with us on WhatsApp</span>
                </div>
              </a>
            )}

            {(instagram || facebook) && (
              <div className="mt-3">
                <p className="text-[13px] font-semibold text-[#8c8c8c] mb-3">Follow us on social</p>
                <div className="flex items-center gap-3">
                  {instagram && (
                    <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[#e7e7e7] text-ink transition-all hover:border-brand-purple hover:bg-[#fdf7ff] hover:text-brand-purple">
                      <InstagramIcon className="h-5 w-5" />
                    </a>
                  )}
                  {facebook && (
                    <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[#e7e7e7] text-ink transition-all hover:border-[#1877F2] hover:bg-[#f0f7ff] hover:text-[#1877F2]">
                      <FacebookIcon className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {!phone && !email && !whatsapp && !instagram && !facebook && (
              <p className="text-[14px] text-[#8c8c8c] py-4">No contact details have been configured yet.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
