// Helpers for GET /astronauts/{id}/engagement/.

// Friendly names for badge codes. Unknown codes are shown in plain words.
const BADGE_NAMES = { FIRST_TEST: 'First test', STREAK_4: '4-week streak', STREAK_12: '12-week streak' }

export function badgeName(code) {
  return BADGE_NAMES[code] ?? code.replaceAll('_', ' ').toLowerCase()
}

// Badges the astronaut has earned (an item without `earned: false` counts as earned).
export function earnedBadges(engagement) {
  return (engagement?.badges ?? []).filter((badge) => badge.earned !== false)
}

// Celebrate on /result when tests_completed went up compared with just before the test.
export function testsIncreased(testsBefore, engagementAfter) {
  return testsBefore != null && engagementAfter?.tests_completed > testsBefore
}
