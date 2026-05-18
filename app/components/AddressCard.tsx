"use client";

import type { ReactNode } from "react";
import type { Address } from "@/lib/api";

// Shared address-row presentation for the two surfaces that list saved
// addresses (/addresses and /checkout). Both pages used to maintain their
// own near-identical card markup with diverging tweaks — this component
// keeps the heading + tags + address line + contact line in one place,
// while the consumer decides:
//   • selectable + selected + onSelect → render as a clickable radio row
//     (checkout flow). Without these the card is a plain block.
//   • actions → side-rendered when not selectable, bottom-rendered when
//     selectable & selected. Lets each page pass its own action set
//     (Set Default / Edit / Delete vs Edit / Remove) without coupling.

type AddressCardProps = {
  address: Address;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  actions?: ReactNode;
};

function Body({ address: a }: { address: Address }) {
  const isDefault = Number(a.is_default) === 1;
  // Single canonical address line so the two pages agree on punctuation.
  const lines = [a.address, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(", ");
  return (
    <div className="flex-1 min-w-0">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="text-[15px] font-bold text-ink">{a.name}</span>
        <span className="inline-flex h-[20px] items-center rounded-[4px] bg-[#f0f0f0] px-1.5 text-[10px] font-semibold uppercase text-[#525151]">
          {a.type || "Home"}
        </span>
        {isDefault && (
          <span className="inline-flex h-[20px] items-center rounded-[4px] bg-emerald-50 px-1.5 text-[10px] font-semibold uppercase text-emerald-700">
            Default
          </span>
        )}
      </div>
      <p className="text-[13px] text-[#525151] leading-[1.6]">{lines}</p>
      <p className="mt-1 text-[13px] text-[#525151]">
        {a.mobile}
        {a.email ? ` · ${a.email}` : ""}
      </p>
    </div>
  );
}

export default function AddressCard({
  address,
  selectable = false,
  selected = false,
  onSelect,
  actions,
}: AddressCardProps) {
  // Checkout variant — radio + bottom-rendered actions (only when selected
  // per the original UX; the consumer decides whether to pass `actions`).
  if (selectable) {
    return (
      <div
        className={`rounded-[5px] border-2 border-dashed transition-all ${
          selected
            ? "border-ink-soft bg-[#fafafa]"
            : "border-[#e7e7e7] hover:border-[#cfcfcf] bg-white"
        }`}
      >
        <label className="flex items-start gap-3 p-4 cursor-pointer">
          <input
            type="radio"
            checked={selected}
            onChange={() => onSelect?.()}
            className="mt-1 h-4 w-4 accent-ink-soft"
          />
          <div className="flex-1 min-w-0">
            <Body address={address} />
            {selected && actions && (
              <div className="mt-3 flex flex-wrap items-center gap-4 pt-3 border-t border-dashed border-[#e7e7e7]">
                {actions}
              </div>
            )}
          </div>
        </label>
      </div>
    );
  }

  // Plain variant — side-rendered actions. The original /addresses layout.
  return (
    <div className="rounded-[5px] border-2 border-dashed border-[#e7e7e7] bg-white p-5 transition-all">
      <div className="flex items-start justify-between gap-4">
        <Body address={address} />
        {actions && <div className="flex flex-col gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
