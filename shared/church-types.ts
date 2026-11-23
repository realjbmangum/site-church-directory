import { FAMILY_DEFAULT, TYPE_BY_FAMILY_BODY } from './church-type-data.ts';
import { slugify } from './slug.ts';

/** Old family slugs that do not match the friendly church type slug. */
export const LEGACY_FAMILY_SLUGS: Record<string, string> = {
  'presbyterian-and-reformed': 'presbyterian',
  'anglican-and-episcopal': 'episcopal-and-anglican',
  adventist: 'seventh-day-adventist',
  holiness: 'holiness-and-nazarene',
  'not-stated': 'not-listed-yet',
  restorationist: 'church-of-christ-and-christian-church',
};

export function churchTypeSlug(name: string): string {
  return slugify(name);
}

/** Family name stored in the existing taxonomy, for a friendly church type. */
export function familyForType(typeName: string): string | null {
  for (const [family, type] of Object.entries(FAMILY_DEFAULT)) {
    if (type === typeName) return family;
  }
  return null;
}

/** Prefer the researched type. Otherwise use the family and body already on the listing. */
export function churchTypeName(family: string | null | undefined, body: string | null | undefined, explicit?: string | null): string {
  const stated = explicit?.trim();
  if (stated && stated.toLowerCase() !== 'unknown') return stated;
  const key = `${family || ''}||${body || ''}`;
  if (family && body && TYPE_BY_FAMILY_BODY[key]) return TYPE_BY_FAMILY_BODY[key];
  if (family && FAMILY_DEFAULT[family]) return FAMILY_DEFAULT[family];
  return 'Not listed yet';
}

/** A secondary line, only when the body names a real group. "Not stated" stays off the page. */
export function partOfLine(body: string | null | undefined): string | null {
  const text = body?.trim() ?? '';
  const lower = text.toLowerCase();
  if (!text || lower === 'unknown' || lower === 'not stated' || lower.includes('not stated')) return null;
  if (lower.startsWith('part of ')) return text;
  const name = text.replace(/^the\s+/i, '');
  return `Part of the ${name}`;
}
