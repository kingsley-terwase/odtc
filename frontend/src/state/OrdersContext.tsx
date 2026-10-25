import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../api';
import { Booking, Place } from '../api';
import { isActivePhase, phaseOf } from '../utils/format';
import { store } from './storage';

export type StoredOrder = {
  id: string;
  token: string; // private booking token, needed to read this order
  reference: string;
  createdAt: string;
  booking: Booking;
};

type OrdersState = {
  orders: StoredOrder[];
  recents: Place[];
  loaded: boolean;
  add: (booking: Booking, token: string) => void;
  get: (id: string) => StoredOrder | undefined;
  findByReference: (ref: string) => StoredOrder | undefined;
  refresh: (id: string) => Promise<Booking | null>;
  refreshActive: () => Promise<void>;
  addRecent: (p: Place) => void;
};

const ORDERS_KEY = 'odtc_orders_v1';
const RECENTS_KEY = 'odtc_recent_places_v1';

const Ctx = createContext<OrdersState | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [recents, setRecents] = useState<Place[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ordersRef = useRef<StoredOrder[]>([]);
  ordersRef.current = orders;

  useEffect(() => {
    (async () => {
      const [o, r] = await Promise.all([store.getJson<StoredOrder[]>(ORDERS_KEY, []), store.getJson<Place[]>(RECENTS_KEY, [])]);
      setOrders(o);
      setRecents(r);
      setLoaded(true);
    })();
  }, []);

  const save = useCallback((next: StoredOrder[]) => {
    setOrders(next);
    store.setJson(ORDERS_KEY, next);
  }, []);

  const add = useCallback(
    (booking: Booking, token: string) => {
      const rest = ordersRef.current.filter((o) => o.id !== booking.id);
      save([{ id: booking.id, token, reference: booking.reference, createdAt: booking.createdAt, booking }, ...rest]);
    },
    [save],
  );

  const refresh = useCallback(
    async (id: string) => {
      const o = ordersRef.current.find((x) => x.id === id);
      if (!o) return null;
      try {
        const b = await api.readBooking(o.id, o.token);
        save(ordersRef.current.map((x) => (x.id === id ? { ...x, booking: b } : x)));
        return b;
      } catch {
        return null;
      }
    },
    [save],
  );

  const refreshActive = useCallback(async () => {
    const active = ordersRef.current.filter((o) => isActivePhase(phaseOf(o.booking)));
    await Promise.all(active.map((o) => refresh(o.id)));
  }, [refresh]);

  const addRecent = useCallback((p: Place) => {
    setRecents((prev) => {
      const next = [p, ...prev.filter((x) => x.placeId !== p.placeId)].slice(0, 8);
      store.setJson(RECENTS_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<OrdersState>(
    () => ({
      orders,
      recents,
      loaded,
      add,
      refresh,
      refreshActive,
      addRecent,
      get: (id) => orders.find((o) => o.id === id),
      findByReference: (ref) => {
        const r = ref.trim().toUpperCase();
        return orders.find((o) => o.reference.toUpperCase() === r || o.id.toUpperCase() === r);
      },
    }),
    [orders, recents, loaded, add, refresh, refreshActive, addRecent],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrders() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOrders must be used inside OrdersProvider');
  return v;
}
