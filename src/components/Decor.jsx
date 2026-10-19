// Abstract shapes from the design system: layered waves (the signature motif) and pagination dots.
// They fill empty space, bleed off an edge and never sit behind text. Purely decorative.

const SOFT = '#e4efe7';
const MID = '#4f8a6c';
const DEEP = '#1f4d3a';

// Three bands stepping from the light tint to the deep accent, rising toward the right edge.
const BANDS = [
  'M0,288 C70,252 110,176 196,166 S330,176 378,112 S456,36 480,24 L480,288 Z',
  'M112,288 C176,258 216,212 290,206 S400,196 432,148 S472,96 480,88 L480,288 Z',
  'M248,288 C292,268 330,250 384,246 S452,228 480,196 L480,288 Z',
];

const FLIPS = {
  br: undefined,
  tr: 'translate(0 288) scale(1 -1)',
  bl: 'translate(480 0) scale(-1 1)',
  tl: 'translate(480 288) scale(-1 -1)',
};

/**
 * Layered waves anchored to a corner of the nearest positioned ancestor.
 * `corner` picks which corner they bleed off; `tones` are light → deep.
 */
export function Waves({ corner = 'br', tones = [SOFT, MID, DEEP], className = '' }) {
  const pos = {
    br: 'bottom-0 right-0',
    tr: 'top-0 right-0',
    bl: 'bottom-0 left-0',
    tl: 'top-0 left-0',
  }[corner];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 480 288"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute ${pos} ${className}`}
    >
      <g transform={FLIPS[corner]}>
        {BANDS.map((d, i) => <path key={i} d={d} fill={tones[i]} />)}
      </g>
    </svg>
  );
}

export function Dots({ count = 4, className = '', color = MID }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${count * 16} 8`} className={`pointer-events-none ${className}`} style={{ width: count * 16, height: 8 }}>
      {Array.from({ length: count }, (_, i) => <circle key={i} cx={4 + i * 16} cy="4" r="4" fill={color} opacity={i === 0 ? 1 : 0.45} />)}
    </svg>
  );
}
