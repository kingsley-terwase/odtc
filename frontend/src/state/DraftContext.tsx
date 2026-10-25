import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Booking, Place, Quote } from '../api';

export type Size = '' | 'SMALL' | 'MEDIUM' | 'LARGE';
export type Person = { name: string; phone: string; email: string };

export type Details = {
  description: string;
  size: Size;
  booker: Person;
  senderSame: boolean;
  sender: Person;
  recipientSame: boolean;
  recipient: Person;
};

const blank: Person = { name: '', phone: '', email: '' };

export const emptyDetails = (): Details => ({
  description: '',
  size: '',
  booker: { ...blank },
  senderSame: true,
  sender: { ...blank },
  recipientSame: false,
  recipient: { ...blank },
});

type Draft = {
  pickup: Place | null;
  dropoff: Place | null;
  quote: Quote | null;
  token: string | null;
  details: Details;
  booking: Booking | null; // set once the booking exists, so a retry never creates a duplicate
};

type DraftState = Draft & {
  setPlace: (field: 'pickup' | 'dropoff', p: Place | null) => void;
  swap: () => void;
  setQuote: (q: Quote | null, token?: string | null) => void;
  setDetails: (d: Details) => void;
  setBooking: (b: Booking | null) => void;
  reset: () => void;
};

const Ctx = createContext<DraftState | null>(null);

const initial = (): Draft => ({ pickup: null, dropoff: null, quote: null, token: null, details: emptyDetails(), booking: null });

export function DraftProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<Draft>(initial);

  const setPlace = useCallback(
    (field: 'pickup' | 'dropoff', p: Place | null) => setD((s) => ({ ...s, [field]: p, quote: null, token: null, booking: null })),
    [],
  );
  const swap = useCallback(() => setD((s) => ({ ...s, pickup: s.dropoff, dropoff: s.pickup, quote: null, token: null, booking: null })), []);
  const setQuote = useCallback((q: Quote | null, token: string | null = null) => setD((s) => ({ ...s, quote: q, token })), []);
  const setDetails = useCallback((details: Details) => setD((s) => ({ ...s, details })), []);
  const setBooking = useCallback((booking: Booking | null) => setD((s) => ({ ...s, booking })), []);
  const reset = useCallback(() => setD(initial()), []);

  const value = useMemo(() => ({ ...d, setPlace, swap, setQuote, setDetails, setBooking, reset }), [d, setPlace, swap, setQuote, setDetails, setBooking, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDraft() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDraft must be used inside DraftProvider');
  return v;
}
