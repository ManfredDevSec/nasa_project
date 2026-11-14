export const STATUS = {
  GREEN: { label: 'Normal',   hex: '#6fae7c' },
  AMBER: { label: 'Watch',    hex: '#d9a441' },
  RED:   { label: 'Act now',  hex: '#d0604f' },
}

export function getStatus(level) {
  return STATUS[level] ?? { label: level ?? 'Unknown', hex: '#6b695f' }
}
