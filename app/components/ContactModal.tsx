"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Modal from "./Modal";
import { X } from "./icons";
import {
  api,
  createSupportTicket,
  postTicketReply,
  type SiteSettings,
  type SupportTicket,
  type SupportTicketDetail,
  type TicketType,
} from "@/lib/api";

const TICKET_STATUS: Record<number, { label: string; cls: string }> = {
  1: { label: "Pending",  cls: "bg-slate-100 text-slate-700" },
  2: { label: "Opened",   cls: "bg-sky-100 text-sky-700" },
  3: { label: "Resolved", cls: "bg-emerald-100 text-emerald-700" },
  4: { label: "Closed",   cls: "bg-rose-100 text-rose-700" },
  5: { label: "Reopened", cls: "bg-amber-100 text-amber-700" },
};

function fmtRelativeDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ─── Icons ────────────────────────────────────────────────────────────────
function PhoneIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.95.38 1.88.74 2.77a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.31-1.31a2 2 0 0 1 2.11-.45c.89.36 1.82.61 2.77.74a2 2 0 0 1 1.72 2Z" />
    </svg>
  );
}
function MailIconLocal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
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
function ChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// Quick-action tiles — each is a deep link into the help system.
const QUICK_ACTIONS: { label: string; href: string; icon: React.ReactNode; tone: string }[] = [
  {
    label: "Track your order",
    href: "/orders",
    tone: "from-amber-50 to-amber-100 text-amber-700",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: "Returns & refunds",
    href: "/faq#returns-refunds",
    tone: "from-emerald-50 to-emerald-100 text-emerald-700",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    ),
  },
  {
    label: "Payments help",
    href: "/faq#payments-pricing",
    tone: "from-sky-50 to-sky-100 text-sky-700",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    label: "Account & app",
    href: "/faq#account-app",
    tone: "from-violet-50 to-violet-100 text-violet-700",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "Browse all FAQs",
    href: "/faq",
    tone: "from-rose-50 to-rose-100 text-rose-700",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    label: "Order issues",
    href: "/faq#order-issues",
    tone: "from-orange-50 to-orange-100 text-orange-700",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
];

type View = "home" | "new" | "list" | "detail";

export default function ContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [view, setView] = useState<View>("home");

  // Ticket form state.
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [ticketType, setTicketType] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // List + detail state.
  const [myTickets, setMyTickets] = useState<SupportTicket[] | null>(null);
  const [activeTicket, setActiveTicket] = useState<SupportTicketDetail | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [replyText, setReplyText] = useState("");
  // Ref on the thread scroll container — used to auto-scroll new admin
  // replies into view, but only when the user is already near the bottom
  // (so we don't yank them away from older messages they're reading).
  const threadRef = useRef<HTMLDivElement>(null);

  // Reset every time the modal closes so re-opening starts fresh on the home tab.
  useEffect(() => {
    if (isOpen) return;
    setView("home");
    setSubject("");
    setDescription("");
    setTicketType("");
    setErr("");
    setOkMsg("");
    setActiveTicket(null);
    setActiveTicketId(null);
    setReplyText("");
  }, [isOpen]);

  // Load settings + ticket types + the user's email, all in parallel and only
  // when the modal first opens (cheap on the cache, but no reason to fetch
  // these on every page).
  useEffect(() => {
    if (!isOpen) return;
    if (!settings) {
      api.settings().then(setSettings).catch(() => setSettings({}));
    }
    if (ticketTypes.length === 0) {
      api.ticketTypes()
        .then((d) => setTicketTypes(d.rows || []))
        .catch(() => {});
    }
    if (!email) {
      fetch(`${API}/api/v1/auth/me`, { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          const e = j?.data?.user?.email;
          if (e) setEmail(e);
        })
        .catch(() => {});
    }
    // Pre-fetch the user's tickets — quick query, lets the home view show
    // "View your N support requests" only when there's something to show.
    refreshMyTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function refreshMyTickets() {
    try {
      const d = await api.myTickets();
      setMyTickets(d.rows || []);
    } catch {
      // 401 just means the user isn't signed in — leave myTickets as null so
      // the home view hides the "View tickets" link.
      setMyTickets([]);
    }
  }

  async function openTicket(id: number) {
    setActiveTicketId(id);
    setView("detail");
    setLoadingTicket(true);
    setReplyText("");
    setErr("");
    try {
      const d = await api.ticket(id);
      setActiveTicket(d.ticket);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load ticket.");
    } finally {
      setLoadingTicket(false);
    }
  }

  // Poll the active ticket every 10s while the user is on the detail view
  // so admin replies appear without a manual refresh. The list view gets a
  // slower 30s refresh so "last update" timestamps and unread counts stay
  // honest. Both stop when the modal closes or the view changes.
  useEffect(() => {
    if (!isOpen || view !== "detail" || !activeTicketId) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const d = await api.ticket(activeTicketId);
        if (!cancelled) setActiveTicket(d.ticket);
      } catch { /* keep showing what we have */ }
    };
    const i = setInterval(tick, 10_000);
    return () => { cancelled = true; clearInterval(i); };
  }, [isOpen, view, activeTicketId]);

  useEffect(() => {
    if (!isOpen || view !== "list") return;
    const i = setInterval(() => { refreshMyTickets(); }, 30_000);
    return () => clearInterval(i);
  }, [isOpen, view]);

  // Auto-scroll the thread to the bottom when new messages arrive — but only
  // if the user was already near the bottom. If they've scrolled up to read
  // earlier messages, don't yank them down.
  useEffect(() => {
    const el = threadRef.current;
    if (!el || view !== "detail") return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [activeTicket?.messages.length, view]);

  async function submitReply() {
    if (!activeTicketId) return;
    if (!replyText.trim()) { setErr("Add a message before sending."); return; }
    setBusy(true);
    setErr("");
    try {
      await postTicketReply(activeTicketId, replyText.trim());
      setReplyText("");
      // Refetch the conversation so the new bubble appears.
      const d = await api.ticket(activeTicketId);
      setActiveTicket(d.ticket);
      // Also refresh the list so the "last updated" rank reflects the reply.
      refreshMyTickets();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send reply.");
    } finally {
      setBusy(false);
    }
  }

  const phone = (settings?.support_number || settings?.footer_phone || "").trim();
  const supportEmail = (settings?.support_email || settings?.footer_email || "").trim();
  const whatsapp = settings?.footer_whatsapp?.trim() || "";
  const instagram = (settings?.instagram_link || settings?.footer_instagram || "").trim();
  const facebook = (settings?.facebook_link || settings?.footer_facebook || "").trim();

  const channels = useMemo(() => {
    const out: { key: string; label: string; sub: string; href: string; icon: React.ReactNode; ring: string }[] = [];
    if (phone) out.push({
      key: "call",
      label: "Call us",
      sub: phone,
      href: `tel:${phone.replace(/\s+/g, "")}`,
      icon: <PhoneIcon className="h-5 w-5" />,
      ring: "hover:border-amber-300 hover:bg-amber-50",
    });
    if (supportEmail) out.push({
      key: "mail",
      label: "Email",
      sub: supportEmail,
      href: `mailto:${supportEmail}`,
      icon: <MailIconLocal className="h-5 w-5" />,
      ring: "hover:border-sky-300 hover:bg-sky-50",
    });
    if (whatsapp) out.push({
      key: "wa",
      label: "WhatsApp",
      sub: "Chat with us",
      href: whatsapp,
      icon: <WhatsappIcon className="h-6 w-6 text-[#25D366]" />,
      ring: "hover:border-emerald-300 hover:bg-emerald-50",
    });
    return out;
  }, [phone, supportEmail, whatsapp]);

  async function submitTicket() {
    setErr("");
    setOkMsg("");
    if (!subject.trim()) { setErr("Add a short subject so we know what this is about."); return; }
    if (!description.trim()) { setErr("Tell us a bit more so we can help."); return; }
    setBusy(true);
    try {
      await createSupportTicket({
        ticket_type_id: ticketType ? Number(ticketType) : null,
        subject: subject.trim(),
        description: description.trim(),
        email: email.trim() || undefined,
      });
      setOkMsg("Thanks — your ticket is in. Our team will get back to you over email.");
      setSubject("");
      setDescription("");
      setTicketType("");
      // Bring the new ticket into the user's "Your requests" list.
      refreshMyTickets();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not raise ticket.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" flush>
      {/* Custom layout — the parent Modal renders the close button and the
          rounded white container; we paint the body inside. */}
      <div className="flex flex-col">
        {/* Header band */}
        <div className="relative bg-gradient-to-br from-brand-purple to-[#5a1b6b] px-6 py-6 sm:px-8 sm:py-7 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-white/90 hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-[12px] uppercase tracking-[0.18em] text-white/70">Help &amp; support</p>
          <h2 className="mt-1 text-[22px] sm:text-[26px] font-bold leading-tight">
            {view === "home" && "How can we help you today?"}
            {view === "new" && "Tell us what happened"}
            {view === "list" && "Your support requests"}
            {view === "detail" && (activeTicket?.subject || "Ticket")}
          </h2>
          <p className="mt-1 text-[13px] text-white/80 max-w-[440px]">
            {view === "home" && "Pick a topic, message our team, or reach us on your favourite channel."}
            {view === "new" && "We'll get back to you on email. Real human, no canned reply."}
            {view === "list" && "Track replies, follow up, or read previous conversations."}
            {view === "detail" && activeTicket && `#${activeTicket.id} · raised ${fmtRelativeDate(activeTicket.date_created)}`}
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-5 sm:px-7 sm:py-6 max-h-[70vh] overflow-y-auto">
          {view === "home" ? (
            <div className="flex flex-col gap-6">
              {/* Quick-action tiles */}
              <div>
                <h3 className="text-[12.5px] font-semibold text-[#8c8c8c] uppercase tracking-wider mb-3">Quick help</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {QUICK_ACTIONS.map((a) => (
                    <Link
                      key={a.label}
                      href={a.href}
                      onClick={onClose}
                      className="group flex flex-col items-start gap-2 rounded-[12px] border border-[#ececec] bg-white p-3 transition-all hover:border-ink/30 hover:shadow-sm"
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br ${a.tone}`}>
                        {a.icon}
                      </span>
                      <span className="text-[12.5px] font-semibold text-ink leading-tight">{a.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Contact channels */}
              {channels.length > 0 && (
                <div>
                  <h3 className="text-[12.5px] font-semibold text-[#8c8c8c] uppercase tracking-wider mb-3">Reach us directly</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {channels.map((c) => (
                      <a
                        key={c.key}
                        href={c.href}
                        target={c.key === "wa" ? "_blank" : undefined}
                        rel={c.key === "wa" ? "noopener noreferrer" : undefined}
                        className={`flex items-center gap-3 rounded-[12px] border border-[#ececec] bg-white p-3 transition-all ${c.ring}`}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#f6f6f8] text-ink shrink-0">
                          {c.icon}
                        </span>
                        <div className="min-w-0 flex flex-col">
                          <span className="text-[11px] text-[#8c8c8c]">{c.label}</span>
                          <span className="text-[12.5px] font-semibold text-ink truncate">{c.sub}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Your support requests — only when the user has at least one. */}
              {myTickets && myTickets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-[#ececec] bg-[#fafafa] px-4 py-3 transition-colors hover:border-ink/40"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink border border-[#ececec] shrink-0">
                      <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </span>
                    <span className="flex flex-col items-start min-w-0">
                      <span className="text-[13.5px] font-bold text-ink leading-tight">Your support requests</span>
                      <span className="text-[12px] text-[#8c8c8c] truncate">
                        {myTickets.length} {myTickets.length === 1 ? "ticket" : "tickets"} · tap to view replies
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#8c8c8c]" />
                </button>
              )}

              {/* Raise a ticket CTA */}
              <button
                type="button"
                onClick={() => setView("new")}
                className="flex items-center justify-between gap-3 rounded-[12px] border border-ink bg-ink px-4 py-3.5 text-white transition-colors hover:bg-[#1c1c1c]/90"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </span>
                  <span className="flex flex-col items-start">
                    <span className="text-[14px] font-bold leading-tight">Raise a support ticket</span>
                    <span className="text-[12px] text-white/70">Still stuck? Send our team a message.</span>
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>

              {/* Social */}
              {(instagram || facebook) && (
                <div className="flex items-center justify-between border-t border-[#eee] pt-4">
                  <p className="text-[12px] text-[#8c8c8c]">Follow us</p>
                  <div className="flex items-center gap-2">
                    {instagram && (
                      <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e7e7e7] text-ink hover:border-brand-purple hover:text-brand-purple transition-colors">
                        <InstagramIcon className="h-4 w-4" />
                      </a>
                    )}
                    {facebook && (
                      <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e7e7e7] text-ink hover:border-[#1877F2] hover:text-[#1877F2] transition-colors">
                        <FacebookIcon className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : view === "list" ? (
            // ─── My tickets list ──────────────────────────────────────────
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => { setView("home"); setErr(""); }}
                className="-ml-1 inline-flex w-fit items-center gap-1 text-[12.5px] font-semibold text-[#525151] hover:text-ink"
              >
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                Back
              </button>
              {!myTickets || myTickets.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-[#8c8c8c]">You don&apos;t have any tickets yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {myTickets.map((t) => {
                    const status = TICKET_STATUS[Number(t.status)] || { label: "—", cls: "bg-slate-100 text-slate-700" };
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => openTicket(t.id)}
                          className="group w-full flex items-center gap-3 rounded-[12px] border border-[#ececec] bg-white p-3 text-left hover:border-ink/40 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-[#a3a3a3]">#{t.id}</span>
                              {t.ticket_type_title && (
                                <span className="text-[11px] text-[#8c8c8c]">· {t.ticket_type_title}</span>
                              )}
                              <span className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${status.cls}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[13.5px] font-semibold text-ink truncate">{t.subject}</div>
                            <div className="mt-0.5 text-[11.5px] text-[#8c8c8c]">
                              Last update: {fmtRelativeDate(t.last_updated)}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[#a3a3a3] group-hover:text-ink" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setView("new")}
                className="mt-2 h-[42px] rounded-[12px] border border-ink bg-white text-[13px] font-bold text-ink hover:bg-ink hover:text-white transition-colors"
              >
                + Raise a new ticket
              </button>
            </div>
          ) : view === "detail" ? (
            // ─── Single ticket — conversation thread + reply box ──────────
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => { setView("list"); setErr(""); setReplyText(""); }}
                className="-ml-1 inline-flex w-fit items-center gap-1 text-[12.5px] font-semibold text-[#525151] hover:text-ink"
              >
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                Back to tickets
              </button>
              {loadingTicket && !activeTicket ? (
                <p className="py-6 text-center text-[13px] text-[#8c8c8c]">Loading ticket…</p>
              ) : !activeTicket ? (
                <p className="py-6 text-center text-[13px] text-red-600">{err || "Could not load ticket."}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#fafafa] border border-[#ececec] px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-[11.5px] text-[#8c8c8c]">
                        {activeTicket.ticket_type_title || "General enquiry"} · #{activeTicket.id}
                      </div>
                      <div className="text-[13px] font-semibold text-ink truncate">{activeTicket.subject}</div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                      (TICKET_STATUS[Number(activeTicket.status)] || { cls: "bg-slate-100 text-slate-700" }).cls
                    }`}>
                      {(TICKET_STATUS[Number(activeTicket.status)] || { label: "—" }).label}
                    </span>
                  </div>

                  {/* Thread */}
                  <div
                    ref={threadRef}
                    className="flex flex-col gap-3 max-h-[280px] overflow-y-scroll pr-1"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                  >
                    {activeTicket.messages.map((m) => {
                      const fromAdmin = m.user_type === "admin";
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col gap-1 ${fromAdmin ? "items-start" : "items-end"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-[12px] px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line ${
                              fromAdmin
                                ? "bg-[#f3f3f3] text-ink rounded-tl-[2px]"
                                : "bg-brand-purple text-white rounded-tr-[2px]"
                            }`}
                          >
                            {m.message}
                          </div>
                          <span className="text-[10.5px] text-[#a3a3a3] px-1">
                            {fromAdmin ? "Support team" : "You"} · {fmtRelativeDate(m.date_created)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply composer — disabled when ticket is resolved (status 3). */}
                  {Number(activeTicket.status) === 3 ? (
                    <p className="text-[12px] text-[#8c8c8c] italic text-center pt-2 border-t border-[#eee]">
                      This ticket is marked resolved. Open a new one if the issue comes back.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 pt-3 border-t border-[#eee]">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Reply to support…"
                        className="rounded-[10px] border border-[#e7e7e7] bg-white px-3 py-2 text-[13px] text-ink placeholder:text-[#a3a3a3] focus:outline-none focus:border-ink resize-none"
                      />
                      {err && <p className="text-[12px] text-red-600">{err}</p>}
                      <button
                        type="button"
                        onClick={submitReply}
                        disabled={busy}
                        className="self-end h-[40px] px-5 rounded-[10px] bg-ink text-[13px] font-bold text-white hover:bg-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy ? "Sending…" : "Send reply"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            // ─── New ticket form ──────────────────────────────────────────
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => { setView(myTickets && myTickets.length > 0 ? "list" : "home"); setOkMsg(""); setErr(""); }}
                className="-ml-1 inline-flex w-fit items-center gap-1 text-[12.5px] font-semibold text-[#525151] hover:text-ink"
              >
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                Back
              </button>

              {okMsg ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <h3 className="text-[16px] font-bold text-ink">Ticket raised</h3>
                  <p className="text-[13px] text-[#525151] max-w-[360px]">{okMsg}</p>
                  <div className="mt-2 flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setOkMsg(""); setView("list"); }}
                      className="inline-flex h-[42px] items-center justify-center rounded-[10px] bg-ink px-5 text-[13px] font-bold text-white hover:bg-black"
                    >
                      View my tickets
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex h-[42px] items-center justify-center rounded-[10px] border border-[#e7e7e7] bg-white px-5 text-[13px] font-bold text-ink hover:border-ink"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-[#525151]">What is this about?</label>
                      <select
                        value={ticketType}
                        onChange={(e) => setTicketType(e.target.value)}
                        className="h-[42px] rounded-[10px] border border-[#e7e7e7] bg-white px-3 text-[13.5px] text-ink focus:outline-none focus:border-ink"
                      >
                        {/* Hide the hardcoded fallback when the admin has
                            already seeded a real "General enquiry" type, so
                            the dropdown never shows it twice. */}
                        {!ticketTypes.some((t) => /^general\s+enquiry$/i.test(t.name || "")) && (
                          <option value="">General enquiry</option>
                        )}
                        {ticketTypes.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-[#525151]">Your email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-[42px] rounded-[10px] border border-[#e7e7e7] bg-white px-3 text-[13.5px] text-ink placeholder:text-[#a3a3a3] focus:outline-none focus:border-ink"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-semibold text-[#525151]">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Wrong item delivered for order #1234"
                      className="h-[42px] rounded-[10px] border border-[#e7e7e7] bg-white px-3 text-[13.5px] text-ink placeholder:text-[#a3a3a3] focus:outline-none focus:border-ink"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-semibold text-[#525151]">Describe your issue</label>
                    <textarea
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Share order numbers, dates, or anything that helps us track it down."
                      className="rounded-[10px] border border-[#e7e7e7] bg-white px-3 py-2.5 text-[13.5px] text-ink placeholder:text-[#a3a3a3] focus:outline-none focus:border-ink resize-none"
                    />
                  </div>

                  {err && (
                    <p className="text-[12.5px] text-red-600 -mt-1">{err}</p>
                  )}

                  <button
                    type="button"
                    onClick={submitTicket}
                    disabled={busy}
                    className="h-[46px] rounded-[12px] bg-ink text-[14px] font-bold text-white hover:bg-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {busy ? "Sending…" : "Send ticket"}
                  </button>

                  <p className="text-[11.5px] text-[#8c8c8c] text-center">
                    Average reply time: within 24 hours on business days.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
