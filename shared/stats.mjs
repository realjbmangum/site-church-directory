import { mentionsSaturday, serviceBucket, SERVICE_BUCKETS } from './filters.mjs';

export function countBy(churches, pick) {
  const counts = new Map();
  for (const church of churches) {
    const key = pick(church);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function languageCounts(churches) {
  return countBy(
    churches.flatMap((church) =>
      (church.languages || []).map((language) => ({ language, id: church.id })),
    ),
    (row) => row.language,
  );
}

export function sundayBuckets(churches) {
  const counts = Object.fromEntries(SERVICE_BUCKETS.map((bucket) => [bucket.id, 0]));
  for (const church of churches) {
    counts[serviceBucket(church)] += 1;
  }
  return SERVICE_BUCKETS.map((bucket) => ({
    id: bucket.id,
    label: bucket.label,
    count: counts[bucket.id],
  }));
}

export function saturdayCount(churches) {
  return churches.filter((church) => mentionsSaturday(church)).length;
}
