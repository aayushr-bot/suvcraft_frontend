"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type WishlistItem = {
  id: number;
  name: string;
  image: string;
  slug?: string;
  price: number;
  list_price?: number;
  status?: number;
};

type CtxType = {
  items: WishlistItem[];
  ids: Set<number>;
  has: (id: number) => boolean;
  toggle: (item: Omit<WishlistItem, "price"> & { price?: number }) => Promise<void>;
  add: (item: Omit<WishlistItem, "price"> & { price?: number }) => Promise<void>;
  remove: (id: number) => Promise<void>;
  clear: () => Promise<void>;
  count: number;
};

const Ctx = createContext<CtxType>({
  items: [],
  ids: new Set(),
  has: () => false,
  toggle: async () => {},
  add: async () => {},
  remove: async () => {},
  clear: async () => {},
  count: 0,
});

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const STORAGE_KEY = "suvcraft_wishlist";

function readLocal(): WishlistItem[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function writeLocal(items: WishlistItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}
function clearLocal() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const ready = useRef(false);

  // Bootstrap: figure out auth, then pick the right source. Re-runs whenever
  // the Navbar fires `auth:changed` so the badge updates instantly on
  // login/logout without a page refresh.
  useEffect(() => {
    let cancelled = false;
    const cancelTokens: { cancel: boolean }[] = [];

    async function bootstrap() {
      const myToken = { cancel: false };
      for (const t of cancelTokens) t.cancel = true;
      cancelTokens.length = 0;
      cancelTokens.push(myToken);

      let loggedIn = false;
      try {
        const me = await fetch(`${API}/api/v1/auth/me`, { credentials: "include", cache: "no-store" });
        if (me.ok) {
          const j = await me.json();
          loggedIn = !!j?.data?.user;
        }
      } catch {}
      if (cancelled || myToken.cancel) return;
      setIsLoggedIn(loggedIn);

      if (!loggedIn) {
        setItems(readLocal());
        ready.current = true;
        return;
      }

      // Logged-in: pull DB list, then if there's anything in localStorage, merge it server-side.
      let remote: WishlistItem[] = [];
      try {
        const res = await fetch(`${API}/api/v1/wishlist`, { credentials: "include", cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          remote = j?.data?.items || [];
        }
      } catch {}

      const local = readLocal();
      if (local.length) {
        try {
          const merge = await fetch(`${API}/api/v1/wishlist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ items: local.map((i) => i.id) }),
          });
          if (merge.ok) {
            const j = await merge.json();
            remote = j?.data?.items || remote;
          }
        } catch {}
        clearLocal();
      }

      if (cancelled || myToken.cancel) return;
      setItems(remote);
      ready.current = true;
    }

    bootstrap();

    function onAuthChanged() {
      // Flip to empty so the heart-count badge updates immediately, then refetch.
      setItems([]);
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

  const ids = new Set(items.map((i) => i.id));
  const has = useCallback((id: number) => ids.has(id), [ids]);

  const add = useCallback(async (item: Omit<WishlistItem, "price"> & { price?: number }) => {
    const payload: WishlistItem = {
      id: item.id,
      name: item.name,
      image: item.image,
      slug: item.slug,
      price: item.price ?? 0,
      list_price: item.list_price,
      status: item.status,
    };

    setItems((prev) => (prev.some((p) => p.id === payload.id) ? prev : [payload, ...prev]));

    if (isLoggedIn) {
      try {
        await fetch(`${API}/api/v1/wishlist/${payload.id}`, { method: "POST", credentials: "include" });
      } catch {}
    } else if (ready.current) {
      writeLocal([payload, ...readLocal().filter((p) => p.id !== payload.id)]);
    }
  }, [isLoggedIn]);

  const remove = useCallback(async (id: number) => {
    setItems((prev) => prev.filter((p) => p.id !== id));

    if (isLoggedIn) {
      try {
        await fetch(`${API}/api/v1/wishlist/${id}`, { method: "DELETE", credentials: "include" });
      } catch {}
    } else if (ready.current) {
      writeLocal(readLocal().filter((p) => p.id !== id));
    }
  }, [isLoggedIn]);

  const toggle = useCallback(async (item: Omit<WishlistItem, "price"> & { price?: number }) => {
    if (ids.has(item.id)) await remove(item.id);
    else await add(item);
  }, [ids, add, remove]);

  const clear = useCallback(async () => {
    setItems([]);
    if (isLoggedIn) {
      try { await fetch(`${API}/api/v1/wishlist`, { method: "DELETE", credentials: "include" }); } catch {}
    } else {
      clearLocal();
    }
  }, [isLoggedIn]);

  return (
    <Ctx.Provider value={{ items, ids, has, toggle, add, remove, clear, count: items.length }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWishlist() {
  return useContext(Ctx);
}
