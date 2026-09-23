import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from '../types';

export interface CartLine {
  product: Product;
  quantity: number;
}

interface CartContextValue {
  items: CartLine[];
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clear: () => void;
  itemCount: number;
  subtotal: number;
}

const STORAGE_KEY = 'd2c-cart';
const CartContext = createContext<CartContextValue | undefined>(undefined);

const readCart = (): CartLine[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as CartLine[] : [];
  } catch (error) {
    return [];
  }
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const addItem = (product: Product, quantity = 1) => {
    setItems((current) => {
      const available = product.available_quantity ?? Number.MAX_SAFE_INTEGER;
      const existing = current.find((item) => item.product.product_id === product.product_id);
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + quantity, available);
        if (nextQuantity <= 0) return current;
        return current.map((item) => item.product.product_id === product.product_id
          ? { ...item, quantity: nextQuantity }
          : item);
      }
      const nextQuantity = Math.min(Math.max(quantity, 0), available);
      if (nextQuantity <= 0) return current;
      return [...current, { product, quantity: nextQuantity }];
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((current) => current.map((item) => {
      if (item.product.product_id !== productId) return item;
      const available = item.product.available_quantity ?? Number.MAX_SAFE_INTEGER;
      return { ...item, quantity: Math.min(quantity, available) };
    }));
  };

  const removeItem = (productId: number) => {
    setItems((current) => current.filter((item) => item.product.product_id !== productId));
  };

  const clear = () => setItems([]);

  const subtotal = useMemo(() => items.reduce((total, item) => total + item.quantity * (item.product.price * (1 - (item.product.discount ?? 0) / 100)), 0), [items]);
  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);

  const value = useMemo<CartContextValue>(() => ({ items, addItem, updateQuantity, removeItem, clear, itemCount, subtotal }), [items, itemCount, subtotal]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
