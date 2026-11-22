export const SERVICE_BUCKETS = [
  { id: 'before-9', label: 'Before 9:00 AM' },
  { id: '9', label: '9:00 AM hour' },
  { id: '10', label: '10:00 AM hour' },
  { id: '11', label: '11:00 AM hour' },
  { id: 'afternoon', label: 'Afternoon or evening' },
  { id: 'unknown', label: 'Sunday time not parsed' },
];

export const SERVICE_BUCKET_LABEL = Object.fromEntries(
  SERVICE_BUCKETS.map((bucket) => [bucket.id, bucket.label]),
);

/** Sunday start-time bucket from the earliest Sunday minutes, when we have one. */
export function serviceBucket(church) {
  const raw = church.earliestSundayMinutes;
  if (raw == null || raw === '') return 'unknown';
  const minutes = Number(raw);
  if (!Number.isFinite(minutes)) return 'unknown';
  if (minutes < 9 * 60) return 'before-9';
  if (minutes < 10 * 60) return '9';
  if (minutes < 11 * 60) return '10';
  if (minutes < 12 * 60) return '11';
  return 'afternoon';
}

export function mentionsSaturday(church) {
  return /saturday/i.test(church.serviceTimesText || '');
}

/**
 * Map and analytics filters.
 * family and body are slugs. place matches city or ZIP. time is a Sunday bucket
 * or "saturday". language is an exact language name.
 */
export function churchMatches(church, filters = {}) {
  const family = filters.family || '';
  const body = filters.body || '';
  const language = filters.language || '';
  const place = String(filters.place || '').trim().toLowerCase();
  const time = filters.time || '';

  if (family && church.familySlug !== family) return false;
  if (body && church.bodySlug !== body) return false;
  if (language) {
    const wanted = language.toLowerCase();
    const names = church.languages || [];
    if (!names.some((name) => name.toLowerCase() === wanted)) return false;
  }
  if (place) {
    const haystack = `${church.city || ''} ${church.postalCode || ''}`.toLowerCase();
    if (!haystack.includes(place)) return false;
  }
  if (time === 'saturday') {
    if (!mentionsSaturday(church)) return false;
  } else if (time && serviceBucket(church) !== time) {
    return false;
  }
  return true;
}
