"use client";

import { createContext, useContext, useEffect, useReducer, useRef, useState } from "react";

export type CartItem = {
  id: number;
  name: string;
  image: string;
  price: number;
  qty: number;
  minQty?: number;
  maxQty?: number;
  step?: number;
  stock?: number;
  tax_percentage?: number;
  is_prices_inclusive_tax?: number;
  // 0 = product is not returnable (cart shows "No Returns · Only Exchange").
  // 1 = returnable. Undefined when the cart hasn't refreshed yet — treated as returnable.
  is_returnable?: number;
  size?: string;
  color?: { name: string; swatch?: string };
  variant_id?: number;
  // Backend-derived availability flags — driven by the live variant stock at
  // each cart refresh. Used to render OOS / "Only N left" banners and to
  // block checkout when any row is unavailable.
  availability?: 'in_stock' | 'low_stock' | 'insufficient_stock' | 'out_of_stock' | 'unavailable';
  out_of_stock?: boolean;
  insufficient_stock?: boolean;
  low_stock?: boolean;
  /** Resolved available units (null when stock is unlimited). */
  available_stock?: number | null;
};

type State = { items: CartItem[]; saved: CartItem[] };
// UPDATE_LIMITS used to be just the quantity-related caps, but the server's
// cart PUT/GET also hands back per-row availability flags (out_of_stock,
// insufficient_stock, available_stock, availability). Widening to a generic
// Partial<CartItem> lets the action carry both kinds of refresh without a
// second action type.
type Action =
  | { type: "INIT"; items: CartItem[]; saved: CartItem[] }
  | { type: "ADD"; item: Omit<CartItem, "qty">; qty: number }
  | { type: "REMOVE"; id: number }
  | { type: "SET_QTY"; id: number; qty: number }
  | { type: "UPDATE_LIMITS"; id: number; limits: Partial<CartItem> }
  | { type: "MOVE_TO_SAVED"; id: number }
  | { type: "MOVE_TO_CART"; id: number }
  | { type: "REMOVE_SAVED"; id: number }
  | { type: "CLEAR" };

// Lines are keyed by variant_id when present so different color/size combos of
// the same product remain distinct rows. Falls back to product id for legacy
// items that never picked a variant.
export function lineKey(it: { id: number; variant_id?: number }): number {
  return it.variant_id ?? it.id;
}

// Collapse rows that share the same line key, keeping the highest qty. The
// server can occasionally return two rows for one line (e.g. an active row +
// an orphaned saved-for-later row), and React then warns about duplicate keys.
function dedupeByLine(items: CartItem[]): CartItem[] {
  const map = new Map<number, CartItem>();
  for (const it of items) {
    const k = lineKey(it);
    const cur = map.get(k);
    map.set(k, cur ? { ...cur, qty: Math.max(cur.qty, it.qty) } : it);
  }
  return [...map.values()];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT":
      return { items: dedupeByLine(action.items), saved: dedupeByLine(action.saved) };
    case "ADD": {
      const k = lineKey(action.item);
      const existing = state.items.find((i) => lineKey(i) === k);
      // Belt-and-suspenders: cap qty at the line's known maxQty (stock or
      // per-order limit) when the caller supplied one. The PDP already
      // pre-checks, but this stops a buggy caller from pushing the line
      // past available stock.
      const cap = action.item.maxQty ?? existing?.maxQty;
      if (existing) {
        const next = existing.qty + action.qty;
        const clamped = cap != null ? Math.min(next, cap) : next;
        return {
          ...state,
          items: state.items.map((i) =>
            lineKey(i) === k ? { ...i, ...action.item, qty: clamped } : i
          ),
        };
      }
      const startQty = cap != null ? Math.min(action.qty, cap) : action.qty;
      return { ...state, items: [...state.items, { ...action.item, qty: startQty }] };
    }
    case "REMOVE":
      return { ...state, items: state.items.filter((i) => lineKey(i) !== action.id) };
    case "SET_QTY":
      if (action.qty < 1) return { ...state, items: state.items.filter((i) => lineKey(i) !== action.id) };
      return {
        ...state,
        items: state.items.map((i) => (lineKey(i) === action.id ? { ...i, qty: action.qty } : i)),
      };
    case "UPDATE_LIMITS":
      return {
        ...state,
        items: state.items.map((i) => (lineKey(i) === action.id ? { ...i, ...action.limits } : i)),
      };
    case "MOVE_TO_SAVED": {
      const item = state.items.find((i) => lineKey(i) === action.id);
      if (!item) return state;
      return {
        items: state.items.filter((i) => lineKey(i) !== action.id),
        saved: state.saved.find((s) => lineKey(s) === action.id) ? state.saved : [...state.saved, item],
      };
    }
    case "MOVE_TO_CART": {
      const item = state.saved.find((s) => lineKey(s) === action.id);
      if (!item) return state;
      return {
        items: state.items.find((i) => lineKey(i) === action.id) ? state.items : [...state.items, item],
        saved: state.saved.filter((s) => lineKey(s) !== action.id),
      };
    }
    case "REMOVE_SAVED":
      return { ...state, saved: state.saved.filter((s) => lineKey(s) !== action.id) };
    case "CLEAR":
      return { items: [], saved: state.saved };
    default:
      return state;
  }
}

export type AppliedCoupon = {
  code: string;
  discount: number;
  message?: string;
};

type CartContextType = {
  items: CartItem[];
  saved: CartItem[];
  addToCart: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeFromCart: (id: number) => void;
  updateQty: (id: number, qty: number) => void;
  updateLimits: (id: number, limits: Partial<CartItem>) => void;
  moveToSaved: (id: number) => void;
  moveToCart: (id: number) => void;
  removeFromSaved: (id: number) => void;
  clearCart: () => void;
  count: number;
  total: number;
  // Tax
  taxTotal: number;
  // Delivery
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  // Coupon
  coupon: AppliedCoupon | null;
  couponDiscount: number;
  finalTotal: number;
  applyCoupon: (code: string) => Promise<{ ok: boolean; error?: string }>;
  removeCoupon: () => void;
  // True when one or more cart rows are out-of-stock, insufficient, or
  // pointing at a now-inactive product/variant. Drives the "Place Order"
  // button's disabled state on the cart page.
  hasBlockingIssue: boolean;
  blockingItems: CartItem[];
};

const CartContext = createContext<CartContextType>({
  items: [],
  saved: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQty: () => {},
  updateLimits: () => {},
  moveToSaved: () => {},
  moveToCart: () => {},
  removeFromSaved: () => {},
  clearCart: () => {},
  count: 0,
  total: 0,
  taxTotal: 0,
  deliveryCharge: 0,
  freeDeliveryThreshold: 0,
  coupon: null,
  couponDiscount: 0,
  finalTotal: 0,
  applyCoupon: async () => ({ ok: false }),
  removeCoupon: () => {},
  hasBlockingIssue: false,
  blockingItems: [],
});

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const STORAGE_KEY = "suvcraft_cart";
const COUPON_KEY = "suvcraft_coupon";

function readLocal(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function writeLocal(items: CartItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}
function clearLocal() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function mergeItems(local: CartItem[], remote: CartItem[]): CartItem[] {
  const byKey = new Map<number, CartItem>();
  for (const it of remote) byKey.set(lineKey(it), it);
  for (const it of local) {
    const k = lineKey(it);
    const cur = byKey.get(k);
    // Preserve server-side metadata (variant_id, size, color, maxQty,
    // tax flags …) when present; combine quantities the way Amazon does —
    // sum local + remote, then cap at the line's known max (per-order limit
    // or stock). The cart page's refetch pass later re-caps against the
    // *live* server values, so this is best-effort at merge time.
    if (cur) {
      const cap = cur.maxQty ?? it.maxQty;
      const summed = cur.qty + it.qty;
      const next = cap != null ? Math.min(summed, cap) : summed;
      byKey.set(k, { ...cur, qty: next });
    } else {
      byKey.set(k, it);
    }
  }
  return [...byKey.values()];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], saved: [] });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const ready = useRef(false);
  const skipNextSync = useRef(false);

  // Bootstrap the cart from the right source for the current auth state. Run
  // once on mount and again whenever the Navbar fires `auth:changed` (login or
  // logout) — otherwise the badge stays stale until the user hits refresh.
  useEffect(() => {
    let cancelled = false;
    const cancelTokens: { cancel: boolean }[] = [];

    async function bootstrap() {
      const myToken = { cancel: false };
      // Cancel any in-flight bootstrap from a previous auth event.
      for (const t of cancelTokens) t.cancel = true;
      cancelTokens.length = 0;
      cancelTokens.push(myToken);

      let loggedIn = false;
      try {
        const meRes = await fetch(`${API}/api/v1/auth/me`, { credentials: "include", cache: "no-store" });
        if (meRes.ok) {
          const meJson = await meRes.json();
          loggedIn = !!meJson?.data?.user;
        }
      } catch { /* offline — fall through */ }
      if (cancelled || myToken.cancel) return;
      setIsLoggedIn(loggedIn);

      if (!loggedIn) {
        // Guest: localStorage holds the active cart only. Saved-for-later is logged-in only.
        skipNextSync.current = true;
        dispatch({ type: "INIT", items: readLocal(), saved: [] });
        ready.current = true;
        return;
      }

      let remote: CartItem[] = [];
      let saved: CartItem[] = [];
      try {
        const cartRes = await fetch(`${API}/api/v1/cart`, { credentials: "include", cache: "no-store" });
        if (cartRes.ok) {
          const j = await cartRes.json();
          remote = j?.data?.items || [];
          saved = j?.data?.saved || [];
        }
      } catch {}

      const local = readLocal();
      const merged = local.length ? mergeItems(local, remote) : remote;

      if (local.length) {
        try {
          const putRes = await fetch(`${API}/api/v1/cart`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ items: merged.map((i) => ({ id: i.id, qty: i.qty, variant_id: i.variant_id })) }),
          });
          if (putRes.ok) {
            const j = await putRes.json();
            const serverItems: CartItem[] = j?.data?.items || [];
            saved = j?.data?.saved || saved;
            remote = serverItems.length >= merged.length ? serverItems : merged;
          } else {
            remote = merged;
          }
        } catch {
          remote = merged;
        }
        clearLocal();
      } else {
        remote = merged;
      }

      if (cancelled || myToken.cancel) return;
      skipNextSync.current = true;
      dispatch({ type: "INIT", items: remote, saved });
      ready.current = true;
    }

    bootstrap();

    function onAuthChanged() {
      // Wipe state immediately so the navbar count flips to 0 while the new
      // cart is loading; bootstrap will populate it from the right source.
      skipNextSync.current = true;
      dispatch({ type: "INIT", items: [], saved: [] });
      ready.current = false;
      bootstrap();
    }
    window.addEventListener("auth:changed", onAuthChanged);

    return () => {
      cancelled = true;
      for (const t of cancelTokens) t.cancel = true;
      window.removeEventListener("auth:changed", onAuthChanged);
    };
  }, []);

  // Persist active cart on every change. Saved list is updated through dedicated PATCH calls in the move helpers below.
  useEffect(() => {
    if (!ready.current) return;
    if (skipNextSync.current) { skipNextSync.current = false; return; }

    if (isLoggedIn) {
      const payload = state.items.map((i) => ({ id: i.id, qty: i.qty, variant_id: i.variant_id }));
      fetch(`${API}/api/v1/cart`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: payload }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          // The PUT endpoint re-runs listCart server-side and hands back fresh
          // availability flags (out_of_stock / insufficient_stock / available_stock).
          // Apply them per row so the "Only N left" banner and Place Order disable
          // react to qty edits without waiting for a page refresh.
          const fresh: CartItem[] = j?.data?.items || [];
          if (!fresh.length) return;
          skipNextSync.current = true;
          for (const it of fresh) {
            dispatch({
              type: "UPDATE_LIMITS",
              id: lineKey(it),
              limits: {
                stock: it.stock,
                available_stock: it.available_stock,
                availability: it.availability,
                out_of_stock: it.out_of_stock,
                insufficient_stock: it.insufficient_stock,
                low_stock: it.low_stock,
              },
            });
          }
        })
        .catch(() => {});
    } else {
      writeLocal(state.items);
    }
  }, [state.items, isLoggedIn]);

  function moveToSaved(id: number) {
    // Skip the PUT effect — replaceCart on the backend would DELETE this row
    // from the cart entirely (since it's no longer in state.items) before the
    // PATCH below could flip its is_saved_for_later flag. The PATCH alone is
    // the canonical persistence for this action.
    skipNextSync.current = true;
    dispatch({ type: "MOVE_TO_SAVED", id });
    if (isLoggedIn) {
      fetch(`${API}/api/v1/cart/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ saved: true }),
      }).catch(() => {});
    }
  }

  function moveToCart(id: number) {
    // Same reasoning — moving back to active should be a flag flip, not a full PUT.
    skipNextSync.current = true;
    dispatch({ type: "MOVE_TO_CART", id });
    if (isLoggedIn) {
      fetch(`${API}/api/v1/cart/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ saved: false }),
      }).catch(() => {});
    }
  }

  function removeFromSaved(id: number) {
    dispatch({ type: "REMOVE_SAVED", id });
    if (isLoggedIn) {
      fetch(`${API}/api/v1/cart/items/${id}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => {});
    }
  }

  const count = state.items.reduce((s, i) => s + i.qty, 0);
  const total = state.items.reduce((s, i) => s + i.price * i.qty, 0);

  // Tax: per-item, only added on top when prices are exclusive (the default).
  // For inclusive prices, tax is informational only (already in `price`) — we don't double-charge.
  const taxTotal = state.items.reduce((s, i) => {
    const pct = Number(i.tax_percentage || 0);
    if (!pct) return s;
    if (Number(i.is_prices_inclusive_tax) === 1) return s;
    return s + (i.price * i.qty * pct) / 100;
  }, 0);

  // ── Shipping settings ────────────────────────────────────────────────────
  const [shipping, setShipping] = useState<{ flatFee: number; freeAbove: number; enabled: boolean }>({
    flatFee: 0, freeAbove: 0, enabled: true,
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/v1/settings`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.data) return;
        const s = j.data;
        setShipping({
          flatFee: Number(s.default_delivery_charge || 0),
          freeAbove: Number(s.standard_shipping_free_delivery) === 1
            ? Number(s.minimum_free_delivery_order_amount || 0)
            : 0,
          enabled: Number(s.local_shipping_method ?? 1) === 1,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const deliveryCharge = !shipping.enabled || total <= 0 ? 0
    : (shipping.freeAbove > 0 && total >= shipping.freeAbove ? 0 : shipping.flatFee);

  // ── Coupon state ─────────────────────────────────────────────────────────
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);

  // Hydrate any previously-applied coupon code from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COUPON_KEY);
      if (raw) {
        const c = JSON.parse(raw) as AppliedCoupon;
        if (c?.code) setCoupon(c);
      }
    } catch {}
  }, []);

  // Persist coupon to localStorage whenever it changes.
  useEffect(() => {
    try {
      if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
      else localStorage.removeItem(COUPON_KEY);
    } catch {}
  }, [coupon]);

  // Re-validate the coupon whenever the cart total changes. If the coupon is no
  // longer valid (cart fell below min order, expired, etc.) clear it silently.
  useEffect(() => {
    if (!coupon) return;
    if (total <= 0) { setCoupon(null); return; }
    let cancelled = false;
    fetch(`${API}/api/v1/promo-codes/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code: coupon.code, total }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.error) { setCoupon(null); return; }
        const newDiscount = Number(j?.data?.discount || 0);
        if (newDiscount !== coupon.discount) {
          setCoupon({ ...coupon, discount: newDiscount });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const applyCoupon = async (code: string): Promise<{ ok: boolean; error?: string }> => {
    const trimmed = String(code || "").trim().toUpperCase();
    if (!trimmed) return { ok: false, error: "Enter a coupon code." };
    if (total <= 0) return { ok: false, error: "Add items to cart before applying a coupon." };
    try {
      const res = await fetch(`${API}/api/v1/promo-codes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: trimmed, total }),
      });
      const j = await res.json();
      if (j?.error) return { ok: false, error: j.message || "Could not apply coupon." };
      setCoupon({
        code: j.data.code.promo_code,
        discount: Number(j.data.discount),
        message: j.data.code.message,
      });
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error. Please try again." };
    }
  };

  const removeCoupon = () => setCoupon(null);

  const couponDiscount = coupon ? Math.min(coupon.discount, total) : 0;
  const finalTotal = Math.max(0, total - couponDiscount + taxTotal + deliveryCharge);

  // Aggregate the per-row availability flags into a single "can we let the
  // user click Place Order?" boolean. Anything that's OOS, insufficient, or
  // pointing at a now-inactive product/variant blocks checkout. "low_stock"
  // is fine — it's just a UX hint.
  const blockingItems = state.items.filter(
    (i) => i.out_of_stock || i.insufficient_stock || i.availability === 'unavailable',
  );
  const hasBlockingIssue = blockingItems.length > 0;

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        saved: state.saved,
        addToCart: (item, qty = 1) => dispatch({ type: "ADD", item, qty }),
        removeFromCart: (id) => dispatch({ type: "REMOVE", id }),
        updateQty: (id, qty) => dispatch({ type: "SET_QTY", id, qty }),
        updateLimits: (id, limits) => dispatch({ type: "UPDATE_LIMITS", id, limits }),
        moveToSaved,
        moveToCart,
        removeFromSaved,
        clearCart: () => { dispatch({ type: "CLEAR" }); setCoupon(null); },
        count,
        total,
        taxTotal,
        deliveryCharge,
        freeDeliveryThreshold: shipping.freeAbove,
        coupon,
        couponDiscount,
        finalTotal,
        applyCoupon,
        removeCoupon,
        hasBlockingIssue,
        blockingItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
