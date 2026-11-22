export interface StructuredServiceTime {
  day: string | null;
  time_label: string;
  minutes: number | null;
  source_text: string;
}

const DAY_RE = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
const TIME_RE = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/gi;
const SKIP_RE = /\b(deadline|newsletter|submit your|by noon|by 5)\b/i;

function titleDay(value: string): string {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatTime(match: RegExpMatchArray): { label: string; minutes: number | null } {
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3].replace(/\./g, '').toLowerCase();
  const isPm = meridiem.startsWith('p');
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return { label: match[0], minutes: null };
  }
  let hours24 = hour % 12;
  if (isPm) hours24 += 12;
  const labelHour = hour;
  const label = `${labelHour}:${String(minute).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;
  return { label, minutes: hours24 * 60 + minute };
}

/**
 * Best-effort structure. The church's own wording stays in `service_times`.
 * This never replaces that text. Long announcement paragraphs are left unstructured.
 */
export function parseServiceTimes(raw: string | null | undefined): StructuredServiceTime[] {
  if (!raw || !raw.trim()) return [];
  if (raw.length > 280 && !raw.includes('|')) return [];
  const parts = raw.split('|').map((part) => part.trim()).filter(Boolean);
  let currentDay: string | null = null;
  const out: StructuredServiceTime[] = [];
  for (const part of parts) {
    if (SKIP_RE.test(part)) continue;
    const dayMatch = part.match(DAY_RE);
    if (dayMatch) currentDay = titleDay(dayMatch[1]);
    const times = [...part.matchAll(TIME_RE)];
    for (const time of times) {
      const formatted = formatTime(time);
      out.push({
        day: currentDay,
        time_label: formatted.label,
        minutes: formatted.minutes,
        source_text: part.slice(0, 180),
      });
    }
  }
  return out.slice(0, 12);
}
