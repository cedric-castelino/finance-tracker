// Categorical chart palette, validated for colour-vision deficiency on the cream surface.
// Slots are assigned in fixed order; anything past slot 8 folds into "Other".
export const SERIES = ['#1a7a52', '#d98a2b', '#3b82c4', '#b8497a', '#6fa83f', '#6a52a8', '#c9533f', '#159a94'];
export const OTHER = '#a39e90';

export const INCOME = '#1a7a52';
export const EXPENSE = '#c9533f';

// Stable colour per name, based on a fixed ordering list (e.g. category order in settings).
export function colorMap(names) {
  const map = {};
  names.forEach((n, i) => {
    map[n] = i < SERIES.length ? SERIES[i] : OTHER;
  });
  map.Other = map.Other || OTHER;
  return map;
}

// Finance mood from the design system. Used for single-series and highlighted series
// (bars, the current month, portfolio value); categorical charts keep SERIES above.
export const FINANCE = { deep: '#1f4d3a', mid: '#4f8a6c', soft: '#e4efe7' };

// Wave tones for shapes drawn on a finance-deep surface (quieter steps of the same family).
export const ON_DEEP = ['#2a5f48', '#3a7358', '#4f8a6c'];

export const CHART = {
  grid: '#eee6d6',
  axis: '#766c5e',
  text: '#5f5649',
  surface: '#ffffff',
  muted: '#a39e90',
};
