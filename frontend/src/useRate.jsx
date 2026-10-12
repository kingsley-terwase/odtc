import { createContext, createElement, useContext, useEffect, useState } from 'react';
import * as api from './api';
import { RATE } from './config';

const KEY = 'odtc_rate';

const toRate = (r) => {
  const v = typeof r === 'number' || typeof r === 'string'
    ? r
    : r?.ratePerKm ?? r?.rate ?? r?.data?.ratePerKm ?? r?.data?.rate ?? r?.result?.ratePerKm ?? r?.result?.rate;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Last rate we saw is kept so returning visitors never see a stale number flash
// while a sleeping backend wakes up.
const cached = () => {
  try { return toRate(localStorage.getItem(KEY)); } catch { return null; }
};

export const RateContext = createContext(RATE);
export const useRateValue = () => useContext(RateContext);

export function RateProvider({ children }) {
  const [rate, setRate] = useState(() => cached() ?? RATE);

  useEffect(() => {
    // Uses whichever rate function exists in ../api. getRate is the one to add.
    const fetchRate = api.getRate || api.getPricing || api.getConfig;
    if (!fetchRate) return undefined;
    let stale = false;
    const load = () => {
      Promise.resolve(fetchRate())
        .then((r) => {
          const n = toRate(r);
          if (!n || stale) return;
          setRate(n);
          try { localStorage.setItem(KEY, String(n)); } catch { /* storage blocked */ }
        })
        .catch(() => { /* keep the current value */ });
    };
    load();
    // Pick up rate changes without a manual reload.
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      stale = true;
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id);
    };
  }, []);

  return createElement(RateContext.Provider, { value: rate }, children);
}