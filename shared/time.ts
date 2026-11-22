export type TimeBucketId =
  | 'before-9'
  | '9-to-1030'
  | '1030-to-noon'
  | 'noon-or-later'
  | 'not-listed';

export const TIME_BUCKETS: { id: TimeBucketId; label: string }[] = [
  { id: 'before-9', label: 'Before 9:00 AM' },
  { id: '9-to-1030', label: '9:00 to 10:30 AM' },
  { id: '1030-to-noon', label: '10:30 AM to noon' },
  { id: 'noon-or-later', label: 'Noon or later' },
  { id: 'not-listed', label: 'No Sunday time listed' },
];

export function timeBucket(minutes: number | null | undefined): TimeBucketId {
  if (minutes == null || Number.isNaN(minutes)) return 'not-listed';
  if (minutes < 540) return 'before-9';
  if (minutes < 630) return '9-to-1030';
  if (minutes < 720) return '1030-to-noon';
  return 'noon-or-later';
}

export function bucketLabel(id: string): string {
  return TIME_BUCKETS.find((bucket) => bucket.id === id)?.label ?? 'No Sunday time listed';
}
