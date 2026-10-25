import { createContext, createElement, useContext, useEffect, useState } from 'react';
import * as api from './api';
import { RATE } from './config';

const KEY = 'odtc_rate';
const CKEY = 'odtc_charges';

const toRate = (r) => {
  const v = typeof r === 'number' || typeof r === 'string'
    ? r
    : r?.ratePerKm ?? r?.rate ?? r?.pricing?.ratePerKm ?? r?.data?.ratePerKm ?? r?.data?.rate ?? r?.result?.ratePerKm ?? r?.result?.rate;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Last values we saw are kept so returning visitors never see a stale number flash
// while a sleeping backend wakes up.
const cached = () => {
  try { return toRate(localStorage.getItem(KEY)); } catch { return null; }
};
const cachedCharges = () => {
  try { return JSON.parse(localStorage.getItem(CKEY)) || { vatRate: null, baseFare: null }; } catch { return { vatRate: null, baseFare: null }; }
};

export const RateContext = createContext(RATE);
export const ChargesContext = createContext({ vatRate: null, baseFare: null });
export const useRateValue = () => useContext(RateContext);
// { vatRate (percent), baseFare }. A value is null until it has loaded.
export const useCharges = () => useContext(ChargesContext);

export function RateProvider({ children }) {
  const [rate, setRate] = useState(() => cached() ?? RATE);
  const [charges, setCharges] = useState(cachedCharges);

  useEffect(() => {
    let stale = false;
    const load = () => {
      api.getRate()
        .then((r) => {
          const n = toRate(r);
          if (!n || stale) return;
          setRate(n);
          try { localStorage.setItem(KEY, String(n)); } catch { /* storage blocked */ }
        })
        .catch(() => { /* keep the current value */ });

      api.getCharges().then((c) => {
        if (stale) return;
        setCharges((old) => {
          const next = { vatRate: c.vatRate ?? old.vatRate, baseFare: null };
          try { localStorage.setItem(CKEY, JSON.stringify(next)); } catch { /* storage blocked */ }
          return next;
        });
      });
    };
    load();
    // Pick up admin changes without a manual reload.
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      stale = true;
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id);
    };
  }, []);

  return createElement(RateContext.Provider, { value: rate }, createElement(ChargesContext.Provider, { value: charges }, children));
}
