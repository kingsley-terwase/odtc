const area = (name) => ({ name, enabled: true });

export const DEFAULT_COVERAGE = [
  { id: 'rivers', name: 'Rivers State', short: 'Rivers', keys: ['rivers', 'port harcourt'], enabled: true,
    areas: ['Port Harcourt', 'Obio-Akpor', 'Eleme', 'Oyigbo', 'Ikwerre', 'Okrika', 'Etche', 'Emohua'].map(area) },
  { id: 'oyo', name: 'Oyo State (Ibadan only)', short: 'Ibadan, Oyo', keys: ['ibadan'], enabled: true,
    areas: ['Ibadan North', 'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West', 'Akinyele', 'Egbeda', 'Ido', 'Lagelu', 'Oluyole', 'Ona Ara'].map(area) },
];

const has = (label, k) => new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}([^a-z]|$)`).test(label);

// A place is covered when its address falls in an enabled state with at least one enabled area.
export function isCovered(place, coverage) {
  const label = (place?.label || '').toLowerCase();
  return coverage.some((s) => {
    if (!s.enabled || !s.areas.some((a) => a.enabled)) return false;
    if (![...s.keys, ...s.areas.map((a) => a.name.toLowerCase())].some((k) => has(label, k))) return false;
    const hits = s.areas.filter((a) => has(label, a.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length);
    return hits.length ? hits[0].enabled : true;
  });
}

export const coverageText = (coverage) =>
  coverage.filter((s) => s.enabled && s.areas.some((a) => a.enabled)).map((s) => s.short).join(' and ') || 'no areas yet';