/** Fields an approved desk row is allowed to write onto a live church. */

export const CHURCH_PATCH_KEYS = [
  'name',
  'campus_name',
  'address',
  'city',
  'state',
  'zip',
  'phone',
  'website',
  'email',
  'service_times',
  'service_times_structured',
  'languages_text',
  'proof_quote',
  'proof_url',
  'proof_strength',
  'date_checked',
  'status',
  'closed_reason',
  'latitude',
  'longitude',
  'photo_key',
  'logo_key',
  'kids_youth',
  'worship_style',
  'theology',
  'young_adults',
  'lgbtq_stance',
  'outreach',
  'denomination_family_id',
  'denomination_body_id',
  'denomination_original',
  'denomination_evidence',
] as const;

export type ChurchPatchKey = (typeof CHURCH_PATCH_KEYS)[number];
export type ChurchPatch = Partial<Record<ChurchPatchKey, string | number | null>>;

function clip(key: ChurchPatchKey, value: string): string {
  const max = key === 'proof_quote' || key === 'service_times' || key === 'service_times_structured' ? 4000 : 500;
  return value.slice(0, max);
}

/** Drop anything that is not an allowlisted column. Slug and id never change here. */
export function sanitizePatch(input: unknown): ChurchPatch {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const out: ChurchPatch = {};
  for (const key of CHURCH_PATCH_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const value = source[key];
    if (value == null || value === '') {
      out[key] = null;
      continue;
    }
    if (key === 'latitude' || key === 'longitude') {
      const num = typeof value === 'number' ? value : Number(String(value).trim());
      if (Number.isFinite(num)) out[key] = num;
      continue;
    }
    if (key === 'status') {
      if (value === 'open' || value === 'closed') out[key] = value;
      continue;
    }
    out[key] = clip(key, String(value).trim());
  }
  return out;
}

export function patchFromCheck(check: {
  classification: string;
  reason: string;
  proposed_changes: string | null;
  checked_at: string;
}): ChurchPatch {
  let proposed: unknown = {};
  if (check.proposed_changes) {
    try {
      proposed = JSON.parse(check.proposed_changes);
    } catch {
      proposed = {};
    }
  }
  const patch = sanitizePatch(proposed);
  if (check.classification === 'likely_closed' && patch.status == null) {
    patch.status = 'closed';
  }
  if (patch.status === 'closed' && patch.closed_reason == null && check.reason.trim()) {
    patch.closed_reason = check.reason.slice(0, 500);
  }
  if (patch.date_checked == null && check.checked_at) {
    patch.date_checked = check.checked_at.slice(0, 10);
  }
  return patch;
}

export function isEmptyPatch(patch: ChurchPatch): boolean {
  return Object.keys(patch).length === 0;
}
