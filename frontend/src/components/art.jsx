// Original, free-to-use illustrations drawn in SVG (no downloads, no licences, nothing to host).
const G = '#1B8F4C';
const B = '#0047AB';
const D = '#00297A';
const O = '#F96B0F';

export function CourierScene({ sx, dark = false }) {
  const sky = dark ? 'rgba(255,255,255,.10)' : '#E8F1FF';
  return (
    <svg viewBox="0 0 480 300" role="img" aria-label="A courier on a scooter carrying a parcel through the city" style={{ width: '100%', height: 'auto', display: 'block', ...sx }}>
      <circle cx="372" cy="70" r="46" fill={O} opacity=".95" />
      <circle cx="372" cy="70" r="64" fill={O} opacity=".18" />
      <rect x="0" y="0" width="480" height="300" fill="none" />
      {/* skyline */}
      <g>
        <rect x="14" y="120" width="54" height="130" fill={dark ? '#1B4FA8' : '#BFD6F7'} />
        <rect x="74" y="84" width="46" height="166" fill={dark ? '#2A5FC0' : '#A3C2F2'} />
        <rect x="126" y="140" width="58" height="110" fill={dark ? '#1B4FA8' : '#BFD6F7'} />
        <rect x="300" y="110" width="52" height="140" fill={dark ? '#2A5FC0' : '#A3C2F2'} />
        <rect x="358" y="150" width="60" height="100" fill={dark ? '#1B4FA8' : '#BFD6F7'} />
        <rect x="424" y="96" width="44" height="154" fill={dark ? '#2A5FC0' : '#A3C2F2'} />
        {[0, 1, 2, 3].map((r) => [0, 1].map((c) => <rect key={`a${r}${c}`} x={84 + c * 18} y={96 + r * 26} width="9" height="12" fill={sky} />))}
        {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`b${r}${c}`} x={24 + c * 16} y={134 + r * 28} width="8" height="12" fill={sky} />))}
        {[0, 1, 2, 3].map((r) => [0, 1].map((c) => <rect key={`c${r}${c}`} x={434 + c * 16} y={108 + r * 30} width="8" height="12" fill={sky} />))}
      </g>
      {/* trees */}
      <g>
        <rect x="262" y="206" width="6" height="44" fill="#7A4B22" />
        <circle cx="265" cy="196" r="24" fill={G} />
        <circle cx="252" cy="208" r="16" fill="#25A85E" />
      </g>
      {/* road */}
      <rect x="0" y="246" width="480" height="54" fill={dark ? '#0B1B3A' : '#22304F'} />
      <g stroke="#fff" strokeWidth="4" strokeDasharray="22 18" opacity=".8"><line x1="0" y1="274" x2="480" y2="274" /></g>
      {/* route + pin */}
      <path d="M40 232 C 120 190, 190 236, 300 214 S 420 196, 446 172" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" opacity=".9" />
      <g transform="translate(446 140)"><path d="M0 34 C-18 14 -16 -8 0 -8 C16 -8 18 14 0 34Z" fill={G} /><circle cx="0" cy="6" r="7" fill="#fff" /></g>
      {/* scooter */}
      <g transform="translate(150 150)">
        <circle cx="30" cy="96" r="22" fill="#111C36" /><circle cx="30" cy="96" r="10" fill="#CBD7EE" />
        <circle cx="150" cy="96" r="22" fill="#111C36" /><circle cx="150" cy="96" r="10" fill="#CBD7EE" />
        <path d="M30 96 L62 50 H132 L150 96 Z" fill={B} />
        <path d="M110 50 L120 18 H146" fill="none" stroke="#111C36" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="52" y="40" width="68" height="14" rx="3" fill={D} />
        {/* parcel */}
        <rect x="12" y="-10" width="56" height="50" fill={O} /><rect x="12" y="-10" width="56" height="12" fill="#FFB27A" />
        <rect x="36" y="-10" width="8" height="50" fill="#fff" opacity=".85" />
        {/* rider */}
        <path d="M84 42 L92 0 L116 6 L108 44 Z" fill={G} />
        <path d="M108 8 L142 20" stroke={G} strokeWidth="10" strokeLinecap="round" />
        <path d="M92 44 L112 48 L124 82" fill="none" stroke="#22304F" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="108" cy="-14" r="15" fill="#F1C7A1" />
        <path d="M92 -14 A16 16 0 0 1 124 -14 L124 -6 H92 Z" fill={G} />
        <rect x="112" y="-12" width="14" height="6" fill="#fff" opacity=".9" />
      </g>
    </svg>
  );
}

export function ParcelStack({ sx }) {
  return (
    <svg viewBox="0 0 240 200" role="img" aria-label="Stack of parcels" style={{ width: '100%', height: 'auto', display: 'block', ...sx }}>
      <ellipse cx="120" cy="184" rx="96" ry="10" fill="#0B1B3A" opacity=".12" />
      <g><rect x="22" y="104" width="100" height="76" fill="#D98B4D" /><rect x="22" y="104" width="100" height="16" fill="#E9A66C" /><rect x="64" y="104" width="16" height="76" fill="#fff" opacity=".8" /></g>
      <g><rect x="110" y="120" width="104" height="60" fill="#C97A3C" /><rect x="110" y="120" width="104" height="14" fill="#DE9A5E" /><rect x="154" y="120" width="14" height="60" fill="#fff" opacity=".8" /></g>
      <g><rect x="56" y="40" width="96" height="64" fill={B} /><rect x="56" y="40" width="96" height="14" fill="#2F6FD1" /><rect x="96" y="40" width="14" height="64" fill="#fff" opacity=".85" />
        <rect x="64" y="76" width="22" height="16" fill="#fff" opacity=".9" /></g>
      <g transform="translate(168 30)"><path d="M0 34 C-16 14 -14 -6 0 -6 C14 -6 16 14 0 34Z" fill={G} /><circle cx="0" cy="8" r="6" fill="#fff" /></g>
    </svg>
  );
}

export function RouteMap({ sx }) {
  return (
    <svg viewBox="0 0 360 220" role="img" aria-label="Map with a route between two pins" style={{ width: '100%', height: 'auto', display: 'block', ...sx }}>
      <rect width="360" height="220" fill="#EAF2FF" />
      {[40, 100, 160].map((y) => <rect key={y} x="0" y={y} width="360" height="14" fill="#fff" />)}
      {[60, 150, 250, 320].map((x) => <rect key={x} x={x} y="0" width="14" height="220" fill="#fff" />)}
      <rect x="84" y="118" width="54" height="34" fill="#CFE8D8" /><rect x="178" y="22" width="62" height="40" fill="#CFE8D8" />
      <rect x="270" y="130" width="40" height="60" fill="#D9E4F7" />
      <path d="M54 190 L54 167 L157 167 L157 107 L257 107 L257 47 L304 47" fill="none" stroke={B} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M54 190 L54 167 L157 167 L157 107 L257 107 L257 47 L304 47" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="1 10" strokeLinecap="round" />
      <circle cx="54" cy="190" r="10" fill={B} /><circle cx="54" cy="190" r="4" fill="#fff" />
      <g transform="translate(304 47)"><path d="M0 26 C-14 10 -12 -8 0 -8 C12 -8 14 10 0 26Z" fill={G} /><circle cx="0" cy="4" r="5" fill="#fff" /></g>
    </svg>
  );
}
