// Helpers for the `assessment` object returned by POST /checks/.
// The API data is never changed; these only pick, sort or label it for display.

export const MAX_INSIGHTS = 3
export const WORSE_EYE_LABELS = { LEFT: 'Left eye', RIGHT: 'Right eye', BOTH: 'Both eyes' }

// Actions sorted so priority 1 (most urgent) comes first. Returns a new array.
export function sortedActions(assessment) {
  return [...(assessment?.actions ?? [])].sort((a, b) => a.priority - b.priority)
}

// The first few env_insights (the result page shows at most three).
export function topInsights(assessment, max = MAX_INSIGHTS) {
  return (assessment?.env_insights ?? []).slice(0, max)
}

// True for the action(s) sharing the most urgent priority, to tag them "FIRST".
export function isFirstPriority(action, sorted) {
  return sorted.length > 0 && action.priority === sorted[0].priority
}
