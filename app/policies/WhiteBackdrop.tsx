"use client";

import { useEffect } from "react";

// Forces the body gradient to solid white while a /policies/* page is on
// screen. Same mechanism the Hero slider uses to tint --page-top to match
// each banner — just resets to white here, and unsets on unmount so other
// pages get their default cream-to-grey gradient back.
export default function WhiteBackdrop() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--page-top", "#ffffff");
    root.style.setProperty("--page-bot", "#ffffff");
    return () => {
      root.style.removeProperty("--page-top");
      root.style.removeProperty("--page-bot");
    };
  }, []);
  return null;
}
