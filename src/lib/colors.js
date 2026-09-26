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

export const CHART = {
  grid: '#ece3cf',
  axis: '#7a8079',
  text: '#4a5550',
  surface: '#fffdf8',
};
