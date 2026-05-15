"use client";

import { useEffect, useRef } from "react";
import { X } from "./icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Max-width preset. Defaults to "md" (540px). */
  size?: "sm" | "md" | "lg";
  /** Skip the default 32–48px inner padding when the modal renders its own layout. */
  flush?: boolean;
}

const SIZE_CLASS: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-[420px]",
  md: "max-w-[540px]",
  lg: "max-w-[680px]",
};

export default function Modal({ isOpen, onClose, children, size = "md", flush = false }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#000000]/40 backdrop-blur-[2px] animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div
        ref={modalRef}
        className={`relative w-full ${SIZE_CLASS[size]} animate-in fade-in zoom-in-95 duration-300`}
      >
        <div className={`relative overflow-hidden rounded-[24px] bg-white ${flush ? "" : "p-8 md:p-12"} shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)]`}>
          {/* Default close button — skipped when `flush` is set so the
              consumer can render its own chrome (e.g. a banded header). */}
          {!flush && (
            <button
              onClick={onClose}
              className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full text-[#525151] hover:bg-black/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
