/**
 * The only field lists that may be written onto a live church.
 * Public suggestions use the short list. Listing checks use the longer one.
 * Slug and id are never patched. Churches are never deleted.
 */

export const PUBLIC_EDIT_FIELDS = [
  'name',
  'phone',
  'website',
  'street_address',
  'city',
  'state',
  'postal_code',
  'service_times_text',
  'campus_name',
  'languages_text',
];

export const CHECK_FIELDS = [
  ...PUBLIC_EDIT_FIELDS,
  'proof_quote',
  'proof_url',
  'proof_strength',
  'date_checked',
  'family_id',
  'body_id',
  'latitude',
  'longitude',
  'earliest_sunday_time',
  'earliest_sunday_minutes',
  'status',
  'closed_reason',
  'unpublished_at',
  'note',
  'kids_youth',
  'worship_style',
  'theology',
  'young_adults',
  'lgbtq_stance',
  'outreach',
  'geocode_source',
  'geocoded_at',
];

const LIMITS = {
  name: 200,
  phone: 40,
  website: 300,
  street_address: 200,
  city: 80,
  state: 40,
  postal_code: 12,
  service_times_text: 4000,
  campus_name: 120,
  languages_text: 300,
  proof_quote: 4000,
  proof_url: 500,
  proof_strength: 80,
  date_checked: 20,
  family_id: 80,
  body_id: 120,
  earliest_sunday_time: 20,
  note: 2000,
  closed_reason: 300,
  unpublished_at: 40,
  kids_youth: 200,
  worship_style: 80,
  theology: 200,
  lgbtq_stance: 80,
  outreach: 300,
  geocode_source: 80,
  geocoded_at: 40,
};

function cleanText(value, max) {
  if (value == null) return null;
  const text = String(value).replace(/\u0000/g, '').trim();
  if (!text) return null;
  if (text.length > max) return { error: 'too_long' };
  return text;
}

function cleanUrl(value) {
  const text = cleanText(value, 500);
  if (text && typeof text === 'object') return text;
  if (text == null) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { error: 'bad_url' };
    return url.toString();
  } catch {
    return { error: 'bad_url' };
  }
}

function cleanStatus(value) {
  const text = cleanText(value, 20);
  if (text && typeof text === 'object') return text;
  if (text == null) return { error: 'bad_status' };
  if (text !== 'open' && text !== 'closed') return { error: 'bad_status' };
  return text;
}

function cleanNumber(value, { integer = false, min = null, max = null } = {}) {
  if (value == null || value === '') return null;
  const number = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(number)) return { error: 'bad_number' };
  if (integer && !Number.isInteger(number)) return { error: 'bad_number' };
  if (min != null && number < min) return { error: 'bad_number' };
  if (max != null && number > max) return { error: 'bad_number' };
  return number;
}

function cleanField(key, value) {
  if (key === 'website' || key === 'proof_url') return cleanUrl(value);
  if (key === 'status') return cleanStatus(value);
  if (key === 'latitude') return cleanNumber(value, { min: -90, max: 90 });
  if (key === 'longitude') return cleanNumber(value, { min: -180, max: 180 });
  if (key === 'earliest_sunday_minutes') return cleanNumber(value, { integer: true, min: 0, max: 24 * 60 });
  if (key === 'young_adults') return cleanNumber(value, { integer: true, min: 0, max: 1 });
  if (key === 'unpublished_at' || key === 'date_checked' || key === 'geocoded_at') {
    const text = cleanText(value, LIMITS[key] || 40);
    if (text && typeof text === 'object') return text;
    if (text == null) return null;
    if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return { error: 'bad_date' };
    return text;
  }
  return cleanText(value, LIMITS[key] || 200);
}

export function parseProposedChanges(raw, allowlist) {
  let obj = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) obj = {};
    else {
      try {
        obj = JSON.parse(trimmed);
      } catch {
        return { ok: false, error: 'bad_json' };
      }
    }
  }
  if (obj == null) obj = {};
  if (typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'bad_patch' };

  const patch = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!allowlist.includes(key)) return { ok: false, error: 'field_not_allowed', field: key };
    const cleaned = cleanField(key, value);
    if (cleaned && typeof cleaned === 'object' && 'error' in cleaned) {
      return { ok: false, error: cleaned.error, field: key };
    }
    patch[key] = cleaned;
  }
  return { ok: true, patch };
}

export function splitLanguages(value) {
  if (value == null || value === '') return [];
  const seen = new Set();
  const languages = [];
  for (const part of String(value).split(/[;,]/)) {
    const language = part.trim();
    if (!language) continue;
    const key = language.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    languages.push(language);
  }
  return languages;
}

/**
 * Statements that write an already-approved patch.
 * The caller must update the desk row first and stop when that row was not waiting.
 */
export function applyChurchStatements({ churchId, patch }) {
  const assignments = [];
  const binds = [];
  for (const [key, value] of Object.entries(patch)) {
    assignments.push(`${key} = ?`);
    binds.push(value);
  }
  assignments.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`);
  const statements = [];
  if (Object.keys(patch).length > 0) {
    statements.push({
      sql: `UPDATE churches SET ${assignments.join(', ')} WHERE id = ?`,
      binds: [...binds, churchId],
    });
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'languages_text')) {
    statements.push({
      sql: 'DELETE FROM church_languages WHERE church_id = ?',
      binds: [churchId],
    });
    for (const language of splitLanguages(patch.languages_text)) {
      statements.push({
        sql: 'INSERT INTO church_languages (church_id, language) VALUES (?, ?)',
        binds: [churchId, language],
      });
    }
  }
  return statements;
}

export function decideQueueStatement(table, id, status, actor) {
  if (table !== 'listing_checks' && table !== 'listing_edit_requests' && table !== 'submissions') {
    throw new Error('bad_queue');
  }
  return {
    sql: `UPDATE ${table} SET status = ?, decided_by = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND status = ?`,
    binds: [status, actor, id, table === 'submissions' ? 'pending' : 'waiting'],
  };
}
