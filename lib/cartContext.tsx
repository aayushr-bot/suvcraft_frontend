"use client";

import { createContext, useContext, useReducer, useEffect } from "react";

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
};

type State = { items: CartItem[] };
type Action =
  | { type: "INIT"; items: CartItem[] }
  | { type: "ADD"; item: Omit<CartItem, "qty">; qty: number }
  | { type: "REMOVE"; id: number }
  | { type: "SET_QTY"; id: number; qty: number }
  | { type: "UPDATE_LIMITS"; id: number; limits: Partial<Pick<CartItem, "minQty" | "maxQty" | "step" | "stock">> }
  | { type: "CLEAR" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT":
      return { items: action.items };
    case "ADD": {
      const existing = state.items.find((i) => i.id === action.item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === action.item.id ? { ...i, ...action.item, qty: i.qty + action.qty } : i
          ),
        };
      }
      return { items: [...state.items, { ...action.item, qty: action.qty }] };
    }
    case "REMOVE":
      return { items: state.items.filter((i) => i.id !== action.id) };
    case "SET_QTY":
      if (action.qty < 1) return { items: state.items.filter((i) => i.id !== action.id) };
      return {
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, qty: action.qty } : i
        ),
      };
    case "UPDATE_LIMITS":
      return {
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, ...action.limits } : i
        ),
      };
    case "CLEAR":
      return { items: [] };
    default:
      return state;
  }
}

type CartContextType = {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeFromCart: (id: number) => void;
  updateQty: (id: number, qty: number) => void;
  updateLimits: (id: number, limits: Partial<Pick<CartItem, "minQty" | "maxQty" | "step" | "stock">>) => void;
  clearCart: () => void;
  count: number;
  total: number;
};

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQty: () => {},
  updateLimits: () => {},
  clearCart: () => {},
  count: 0,
  total: 0,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("suvcraft_cart");
      if (saved) dispatch({ type: "INIT", items: JSON.parse(saved) });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("suvcraft_cart", JSON.stringify(state.items));
    } catch {}
  }, [state.items]);

  const count = state.items.reduce((s, i) => s + i.qty, 0);
  const total = state.items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        addToCart: (item, qty = 1) => dispatch({ type: "ADD", item, qty }),
        removeFromCart: (id) => dispatch({ type: "REMOVE", id }),
        updateQty: (id, qty) => dispatch({ type: "SET_QTY", id, qty }),
        updateLimits: (id, limits) => dispatch({ type: "UPDATE_LIMITS", id, limits }),
        clearCart: () => dispatch({ type: "CLEAR" }),
        count,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
