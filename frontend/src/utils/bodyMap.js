import { PART_ORDER } from './parts.js'
import { normalizeLevel } from './status.js'

// Helpers for GET /astronauts/{id}/body-map/ (`parts` is a list of { part, level, ... }).

export function findPart(parts, name) {
  return (parts ?? []).find((p) => p.part === name)
}

export function partLevel(parts, name) {
  return normalizeLevel(findPart(parts, name)?.level)
}

// Parts in the fixed display order EYES, HEART, SLEEP, MIND (missing parts are skipped).
export function partsInOrder(parts) {
  return PART_ORDER.map((name) => findPart(parts, name)).filter(Boolean)
}
