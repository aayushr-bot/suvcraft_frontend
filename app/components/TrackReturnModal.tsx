"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type MediaAttachment = { url: string; type: "image" | "video" };

type ReturnRow = {
  id: number;
  order_item_id: number;
  request_type: "return" | "exchange";
  return_reason: string;
  remarks?: string;
  status: number;
  date_created?: string;
  refund_amount?: number | string;
  refund_method?: string | null;
  pickup_address_id?: number | null;
  pickup_name?: string | null;
  pickup_mobile?: string | null;
  pickup_address?: string | null;
  pickup_city?: string | null;
  pickup_state?: string | null;
  pickup_pincode?: string | null;
  media?: MediaAttachment[];
  requested_variant_id?: number | null;
  requested_variant?: string | null;
};

function fmtAmt(n: number | string | undefined) {
  if (n == null || n === "") return "—";
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

type StepDef = {
  key: number;
  label: string;
  done: string;
  Icon: React.FC<{ className?: string }>;
};

const InboxIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PackageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const RefundIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const STEPS: StepDef[] = [
  { key: 0, label: "Submitted",  done: "Request received. Our team is reviewing it.", Icon: InboxIcon },
  { key: 1, label: "Approved",   done: "Your request was approved — pickup scheduled.", Icon: CheckIcon },
  { key: 3, label: "Picked up",  done: "The courier has collected the item.",          Icon: PackageIcon },
  { key: 4, label: "Refunded",   done: "Refund issued. It should reflect within 5–7 days.", Icon: RefundIcon },
];

function formatDate(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function pickupSummary(r: ReturnRow) {
  return [r.pickup_address, r.pickup_city, r.pickup_state, r.pickup_pincode]
    .filter(Boolean)
    .join(", ");
}

export default function TrackReturnModal({
  open,
  orderId,
  request,
  itemName,
  onClose,
  onCancelled,
}: {
  open: boolean;
  orderId: number | null;
  request: ReturnRow | null;
  itemName?: string;
  onClose: () => void;
  onCancelled?: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  if (!open || !request) return null;

  const isExchange = String(request.request_type).toLowerCase() === "exchange";
  const isRejected = request.status === 2;
  // Cancellable up through Approved — once Picked up (3) the item is in
  // transit and the buyer must contact support instead. Mirrors Flipkart.
  const canCancel = request.status === 0 || request.status === 1;
  const reachedKeys = new Set<number>();
  if (request.status >= 0) reachedKeys.add(0);
  if (request.status >= 1 && request.status !== 2) reachedKeys.add(1);
  if (request.status >= 3) reachedKeys.add(3);
  if (request.status >= 4) reachedKeys.add(4);

  const media = Array.isArray(request.media) ? request.media : [];
  const refundLabel =
    String(request.refund_method || "").toLowerCase() === "wallet"
      ? "Wallet (instant)"
      : request.refund_method
      ? "Original payment"
      : null;

  async function doCancel() {
    if (!orderId || !request) return;
    const msg = request.status === 1
      ? "Cancel this approved request? Your scheduled pickup will be called off."
      : "Cancel this request? This can't be undone.";
    if (!confirm(msg)) return;
    setCancelling(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/orders/${orderId}/returns/${request.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) {
        setError(j?.message || "Could not cancel the request.");
        setCancelling(false);
        return;
      }
      onCancelled?.();
      onClose();
    } catch {
      setError("Network error. Please try again.");
      setCancelling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4" onClick={() => !cancelling && onClose()}>
      <div
        className="w-full max-w-[560px] rounded-[14px] bg-white shadow-2xl border border-[#e7e7e7] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#eee] flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#8c8c8c]">
              Tracking your {isExchange ? "exchange" : "return"} request
            </div>
            <h2 className="text-[16px] font-bold text-ink mt-0.5">
              Request #{request.id}
            </h2>
            {itemName && (
              <p className="text-[12.5px] text-[#878787] mt-0.5 line-clamp-1">{itemName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => !cancelling && onClose()}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#525151] hover:bg-[#f5f5f5]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {!isExchange && request.refund_amount != null && (
            <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-700 font-semibold">
                  Refund amount
                </div>
                <p className="mt-0.5 text-[11.5px] text-emerald-800/80">
                  {refundLabel === "Wallet (instant)"
                    ? "Credited to your wallet the moment we verify the return."
                    : "Credited once the item is picked up and verified."}
                </p>
              </div>
              <span className="text-[22px] font-bold text-emerald-900 tabular-nums">
                {fmtAmt(request.refund_amount)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#8c8c8c]">Type</div>
              <div className="mt-1 font-semibold text-ink">{isExchange ? "Exchange" : "Return for refund"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#8c8c8c]">Submitted</div>
              <div className="mt-1 font-semibold text-ink">{formatDate(request.date_created)}</div>
            </div>
            {isExchange && (
              <div className="sm:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#8c8c8c]">Replacement size &amp; colour</div>
                {request.requested_variant ? (
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[12.5px] font-semibold text-violet-800">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    {request.requested_variant}
                  </div>
                ) : (
                  <div className="mt-1 text-[#a3a3a3] italic">
                    Not specified — our team will reach out to confirm size/colour.
                  </div>
                )}
              </div>
            )}
            {!isExchange && refundLabel && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#8c8c8c]">Refund method</div>
                <div className="mt-1 font-semibold text-ink">{refundLabel}</div>
              </div>
            )}
            {(request.pickup_name || request.pickup_address) && (
              <div className="sm:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#8c8c8c]">Pickup address</div>
                <div className="mt-1 text-ink leading-snug">
                  {request.pickup_name && (
                    <span className="font-semibold">{request.pickup_name}</span>
                  )}
                  {request.pickup_mobile && (
                    <span className="text-[#525151]"> · {request.pickup_mobile}</span>
                  )}
                  <div className="text-[12.5px] text-[#525151] mt-0.5">{pickupSummary(request)}</div>
                </div>
              </div>
            )}
            <div className="sm:col-span-2">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#8c8c8c]">Reason</div>
              <div className="mt-1 text-ink">{request.return_reason || "—"}</div>
            </div>
            {request.remarks && (
              <div className="sm:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#8c8c8c]">Description</div>
                <div className="mt-1 text-[#525151] whitespace-pre-wrap">{request.remarks}</div>
              </div>
            )}
            {media.length > 0 && (
              <div className="sm:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#8c8c8c]">Attachments</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {media.map((m) => (
                    <a
                      key={m.url}
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="relative h-[72px] w-[72px] rounded-[8px] overflow-hidden border border-[#e7e7e7] bg-[#f6f6f8] block"
                    >
                      {m.type === "image" ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="relative h-full w-full">
                          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                          <video src={m.url} className="h-full w-full object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center text-white">
                            <svg className="h-7 w-7 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isRejected ? (
            <div className="rounded-[12px] border border-red-200 bg-red-50 p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-red-800">Request rejected</h3>
                <p className="text-[12px] text-red-700 mt-0.5">
                  Our team couldn&apos;t approve this {isExchange ? "exchange" : "return"}.
                  Contact support if you have questions.
                </p>
              </div>
            </div>
          ) : (
            <div className="border-t border-[#eee] pt-5">
              <ol className="relative pl-[34px]">
                <span
                  aria-hidden
                  className="absolute left-[15px] top-2 bottom-2 w-[2px] rounded-full bg-[#ECECEC]"
                />
                {(() => {
                  const reachedCount = STEPS.filter((s) => reachedKeys.has(s.key)).length;
                  const pct = reachedCount === 0
                    ? 0
                    : ((reachedCount - 1) / (STEPS.length - 1)) * 100;
                  return (
                    <span
                      aria-hidden
                      className="absolute left-[15px] top-2 w-[2px] rounded-full bg-[#F17A20] transition-[height] duration-500"
                      style={{ height: `calc(${pct}% + 0px)` }}
                    />
                  );
                })()}

                {STEPS.map((step, idx) => {
                  const reached = reachedKeys.has(step.key);
                  const currentIdx = STEPS.reduce(
                    (best, s, i) => (reachedKeys.has(s.key) ? i : best),
                    -1,
                  );
                  const isCurrent = idx === currentIdx;
                  const isFuture = !reached;
                  const Icon = step.Icon;
                  const labelText =
                    step.key === 4 && isExchange ? "Exchanged" : step.label;
                  const doneText =
                    step.key === 4 && isExchange
                      ? "Exchange completed. Your replacement is on the way."
                      : step.done;
                  return (
                    <li key={step.key} className="relative pb-6 last:pb-0">
                      <span
                        className={`absolute -left-[34px] top-0 flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                          reached
                            ? "bg-[#F17A20] text-white shadow-[0_0_0_4px_rgba(241,122,32,0.15)]"
                            : "bg-white text-[#a3a3a3] ring-2 ring-[#ECECEC]"
                        }`}
                      >
                        {reached ? (
                          <Icon className="h-4 w-4" />
                        ) : (
                          <span className="text-[12px] font-bold">{idx + 1}</span>
                        )}
                      </span>

                      <div className="pl-1">
                        <div
                          className={`text-[13.5px] font-bold leading-tight ${
                            isFuture ? "text-[#a3a3a3]" : "text-ink"
                          }`}
                        >
                          {labelText}
                          {isCurrent && (
                            <span className="ml-2 inline-flex items-center gap-1 align-middle rounded-full bg-[#F17A20] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-white">
                              <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
                              Now
                            </span>
                          )}
                        </div>
                        {reached ? (
                          <p className="mt-0.5 text-[11.5px] text-[#525151] leading-snug">
                            {doneText}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-[11.5px] text-[#a3a3a3] leading-snug">
                            Pending
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {error && (
            <p className="text-[12.5px] font-medium text-red-600">{error}</p>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[#eee] flex items-center justify-between gap-2">
          {canCancel ? (
            <button
              type="button"
              onClick={doCancel}
              disabled={cancelling}
              className="h-[42px] rounded-[10px] border border-red-300 bg-white px-5 text-[13px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
              title={request.status === 1 ? "You can still cancel until the courier picks up the item." : undefined}
            >
              {cancelling ? "Cancelling…" : "Cancel request"}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-[42px] rounded-[10px] bg-ink px-6 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-black"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
