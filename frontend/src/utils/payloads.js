// Request bodies, built in one place so they are easy to compare with the API spec.

// POST /checks/ body. Omits taken_at, distance_ok and notes (the server fills those in).
export function buildCheckPayload(answers, astronautId) {
  return {
    astronaut: astronautId,
    near_vision_left: answers.near_vision_left,
    near_vision_right: answers.near_vision_right,
    contrast_left: answers.contrast_left,
    contrast_right: answers.contrast_right,
    amsler_left: answers.amsler_left,
    amsler_right: answers.amsler_right,
    headache: answers.headache,
    eye_pressure: answers.eye_pressure,
    blur: answers.blur,
    is_baseline: false,
  }
}

// POST /daily-logs/ body. Number fields arrive from the form as strings.
export function buildDailyLogPayload(form, numberFields, astronautId, date) {
  const payload = { astronaut: astronautId, date, mood: form.mood }
  for (const field of numberFields) payload[field] = Number(form[field])
  return payload
}
