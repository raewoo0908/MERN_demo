export function formatInt(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatMinutes(n: number, digits = 1): string {
  return `${n.toFixed(digits)} min`;
}

export function formatKm(meters: number, digits = 0): string {
  return `${(meters / 1000).toLocaleString('en-US', {
    maximumFractionDigits: digits,
  })} km`;
}

// Station names include prefix "2715." — strip for cleaner display.
export function cleanStationName(name: string): string {
  return name.replace(/^\s*\d{1,5}\.\s*/, '').trim();
}

export const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
