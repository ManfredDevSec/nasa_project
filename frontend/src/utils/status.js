// Single source of truth for what each status level looks like.
// Colour is never used alone: every level also has a word and an icon shape.
export const LEVELS = {
  GREEN: { word: 'ALL CLEAR', color: '#22c55e', textOnLight: '#15803d', rank: 1 },
  AMBER: { word: 'WATCH', color: '#f59e0b', textOnLight: '#b45309', rank: 2 },
  RED: { word: 'ACT NOW', color: '#ef4444', textOnLight: '#b91c1c', rank: 3 },
  UNKNOWN: { word: 'NO DATA', color: '#64748b', textOnLight: '#475569', rank: 0 },
}

// Anything the backend sends that we do not recognise is treated as UNKNOWN.
export function normalizeLevel(level) {
  return LEVELS[level] ? level : 'UNKNOWN'
}

export function getLevel(level) {
  return LEVELS[normalizeLevel(level)]
}

// Sort a list so RED comes first, then AMBER, GREEN and finally UNKNOWN.
export function sortBySeverity(items, getLevelOf = (item) => item.level) {
  return [...items].sort((a, b) => getLevel(getLevelOf(b)).rank - getLevel(getLevelOf(a)).rank)
}
