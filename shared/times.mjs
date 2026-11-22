/**
 * Best-effort Sunday time for the optional structured field.
 * The church's own wording stays in service_times_text.
 * Returns null when the line names another day and never says Sunday.
 */
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/gi;
const LEADING_RE = /\b(\d{1,2}):(\d{2})(?=\s*[&,]\s*\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))/gi;

function labelFor(minutes) {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  let hour = hour24 % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function toMinutes(hourText, minuteText, suffix) {
  let hour = Number(hourText);
  const minute = Number(minuteText || 0);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 1 || hour > 12 || minute > 59) return null;
  const ap = suffix.toLowerCase().replace(/\./g, '');
  if (ap.startsWith('p') && hour < 12) hour += 12;
  if (ap.startsWith('a') && hour === 12) hour = 0;
  return hour * 60 + minute;
}

export function inferSundayTime(text) {
  const raw = String(text || '');
  if (!raw.trim()) return null;
  const lower = raw.toLowerCase();
  const saysSunday = /\bsun(?:day)?\b/.test(lower);
  const saysOtherDay = /\b(?:mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:rs|rsday)?|fri(?:day)?|sat(?:urday)?)\b/.test(lower);
  if (!saysSunday && saysOtherDay) return null;

  const found = [];
  for (const match of raw.matchAll(TIME_RE)) {
    const minutes = toMinutes(match[1], match[2], match[3]);
    if (minutes != null) found.push(minutes);
  }
  // "8:30 & 11:00 AM" only tags the second time. Keep the first clock time too.
  const suffix = raw.match(/(a\.?m\.?|p\.?m\.?)/i);
  if (suffix) {
    for (const match of raw.matchAll(LEADING_RE)) {
      const minutes = toMinutes(match[1], match[2], suffix[1]);
      if (minutes != null) found.push(minutes);
    }
  }
  if (found.length === 0) return null;
  const minutes = Math.min(...found);
  return { time: labelFor(minutes), minutes };
}
