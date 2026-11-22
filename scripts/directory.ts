import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from '../shared/csv.ts';
import { splitLanguages } from '../shared/languages.ts';
import { parseServiceTimes } from '../shared/service-times.ts';
import { churchSlug, slugify, uniqueSlug } from '../shared/slug.ts';

export interface GeocodeHit {
  lat: number;
  lng: number;
  matched_address: string;
  match: string;
}

export interface SeedChurch {
  id: string;
  slug: string;
  name: string;
  status: 'open' | 'closed';
  closed_reason: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  city_id: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  geocode_source: string | null;
  geocode_matched_address: string | null;
  family_id: string | null;
  family_name: string | null;
  body_id: string | null;
  body_name: string | null;
  denomination_original: string | null;
  denomination_evidence: string | null;
  languages: string[];
  languages_text: string | null;
  service_times: string | null;
  service_times_structured: string | null;
  earliest_sunday_time: string | null;
  earliest_sunday_minutes: number | null;
  proof_quote: string | null;
  proof_url: string | null;
  proof_strength: string | null;
  date_checked: string | null;
  http_status: number | null;
  http_note: string | null;
  address_source: string | null;
  phone_source: string | null;
  denomination_source: string | null;
  source: string | null;
  osm_id: string | null;
  checked_with: string | null;
  note: string | null;
}

export interface SeedFamily {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

export interface SeedBody {
  id: string;
  family_id: string;
  slug: string;
  name: string;
  historically_black_tradition: number;
}

export interface SeedCity {
  id: string;
  slug: string;
  name: string;
  state: string;
}

export interface SeedIntent {
  rank: number;
  category: string;
  evidence_score: number | null;
  recommendation: string | null;
  how_to_use: string | null;
  rationale: string | null;
}

export interface DirectorySeed {
  families: SeedFamily[];
  bodies: SeedBody[];
  cities: SeedCity[];
  churches: SeedChurch[];
  intents: SeedIntent[];
}

function blank(value: string | undefined): string | null {
  const text = (value ?? '').trim();
  return text ? text : null;
}

function intOrNull(value: string | undefined): number | null {
  const text = (value ?? '').trim();
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

export function loadDirectory(dataDir: string): DirectorySeed {
  const verified = parseCsv(readFileSync(join(dataDir, 'churches_verified.csv'), 'utf8'));
  const mapping = parseCsv(readFileSync(join(dataDir, 'churches_denomination_mapping.csv'), 'utf8'));
  const taxonomy = parseCsv(readFileSync(join(dataDir, 'denomination_taxonomy.csv'), 'utf8'));
  const intents = parseCsv(readFileSync(join(dataDir, 'search_intent_categories.csv'), 'utf8'));
  const geocodePath = join(dataDir, 'geocodes.json');
  const geocodes: Record<string, GeocodeHit> = existsSync(geocodePath)
    ? (JSON.parse(readFileSync(geocodePath, 'utf8')).results ?? {})
    : {};

  const mapByName = new Map(mapping.map((row) => [row.name.trim(), row]));

  const familyOrder: string[] = [];
  const families: SeedFamily[] = [];
  const familyId = new Map<string, string>();
  for (const row of taxonomy) {
    const name = row.family.trim();
    if (!name || familyId.has(name)) continue;
    const id = slugify(name);
    familyId.set(name, id);
    familyOrder.push(name);
    families.push({ id, slug: id, name, sort_order: familyOrder.length });
  }

  const bodies: SeedBody[] = [];
  const bodyId = new Map<string, string>();
  const bodyUsed = new Set<string>();
  for (const row of taxonomy) {
    const family = row.family.trim();
    const name = row.specific_body.trim();
    if (!family || !name) continue;
    const id = uniqueSlug(slugify(`${family} ${name}`), bodyUsed);
    bodyId.set(`${family}||${name}`, id);
    bodies.push({
      id,
      family_id: familyId.get(family) || slugify(family),
      slug: id,
      name,
      historically_black_tradition: row.historically_black_tradition.trim().toLowerCase() === 'yes' ? 1 : 0,
    });
  }

  const cityUsed = new Set<string>();
  const cities: SeedCity[] = [];
  const cityIds = new Map<string, string>();
  for (const row of verified) {
    const name = row.city.trim();
    const state = row.state.trim() || 'NC';
    if (!name) continue;
    const key = `${name}|${state}`;
    if (cityIds.has(key)) continue;
    const id = uniqueSlug(slugify(name), cityUsed);
    cityIds.set(key, id);
    cities.push({ id, slug: id, name, state });
  }

  const churchUsed = new Set<string>();
  const churches: SeedChurch[] = verified.map((row) => {
    const mapped = mapByName.get(row.name.trim());
    const name = row.name.trim();
    const city = blank(row.city);
    const state = blank(row.state);
    const slug = uniqueSlug(churchSlug(name, city), churchUsed);
    const familyName = blank(mapped?.denomination_family);
    const bodyName = blank(mapped?.denomination_body);
    const languages = splitLanguages(mapped?.languages || 'English');
    const serviceTimes = blank(row.service_times);
    const structured = parseServiceTimes(serviceTimes);
    const geo = geocodes[slug];
    const closedReason = blank(row.closed_reason);
    return {
      id: slug,
      slug,
      name,
      status: closedReason ? 'closed' : 'open',
      closed_reason: closedReason,
      address: blank(row.address),
      city,
      state,
      zip: blank(row.zip),
      city_id: city && state ? cityIds.get(`${city}|${state}`) ?? cityIds.get(`${city}|NC`) ?? null : null,
      phone: blank(row.phone),
      website: blank(row.website),
      latitude: geo?.lat ?? null,
      longitude: geo?.lng ?? null,
      geocode_source: geo ? 'us-census-bureau' : null,
      geocode_matched_address: geo?.matched_address ?? null,
      family_id: familyName ? familyId.get(familyName) ?? null : null,
      family_name: familyName,
      body_id: familyName && bodyName ? bodyId.get(`${familyName}||${bodyName}`) ?? null : null,
      body_name: bodyName,
      denomination_original: blank(mapped?.denomination_original) ?? blank(row.denomination),
      denomination_evidence: blank(mapped?.denomination_evidence),
      languages,
      languages_text: languages.length ? languages.join('; ') : null,
      service_times: serviceTimes,
      service_times_structured: structured.length ? JSON.stringify(structured) : null,
      earliest_sunday_time: blank(mapped?.earliest_sunday_time),
      earliest_sunday_minutes: intOrNull(mapped?.earliest_sunday_minutes),
      proof_quote: blank(row.proof_quote),
      proof_url: blank(row.proof_url),
      proof_strength: blank(row.proof_strength),
      date_checked: blank(row.date_checked),
      http_status: intOrNull(row.http_status),
      http_note: blank(row.http_note),
      address_source: blank(row.address_source),
      phone_source: blank(row.phone_source),
      denomination_source: blank(row.denomination_source),
      source: blank(row.source),
      osm_id: blank(row.osm_id),
      checked_with: blank(row.checked_with),
      note: blank(row.note),
    };
  });

  return {
    families,
    bodies,
    cities,
    churches,
    intents: intents.map((row) => ({
      rank: Number(row.rank),
      category: row.category.trim(),
      evidence_score: row.evidence_score.trim() ? Number(row.evidence_score) : null,
      recommendation: blank(row.recommendation),
      how_to_use: blank(row.how_to_use),
      rationale: blank(row.rationale),
    })),
  };
}

export function sqlString(value: string | number | null | undefined): string {
  if (value == null || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function sqlNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'NULL';
  return String(value);
}

export function buildSeedSql(seed: DirectorySeed): string {
  const lines: string[] = [];
  lines.push('-- Generated by scripts/seed.ts. Safe to re-run locally.');
  lines.push('-- Replaces directory content. Desk rows and inbox mail are left in place.');
  lines.push('DELETE FROM church_service_times;');
  lines.push('DELETE FROM church_languages;');
  lines.push('DELETE FROM churches;');
  lines.push('DELETE FROM denomination_bodies;');
  lines.push('DELETE FROM denomination_families;');
  lines.push('DELETE FROM cities;');
  lines.push('DELETE FROM metros;');
  lines.push('DELETE FROM search_intent_categories;');
  lines.push(
    `INSERT INTO metros (id, slug, name, state, description) VALUES ('charlotte', 'charlotte', 'Charlotte metro', 'NC', ${sqlString(
      'Churches in Charlotte and nearby towns whose service times were checked against their own websites.',
    )});`,
  );
  for (const city of seed.cities) {
    lines.push(
      `INSERT INTO cities (id, metro_id, slug, name, state) VALUES (${sqlString(city.id)}, 'charlotte', ${sqlString(city.slug)}, ${sqlString(city.name)}, ${sqlString(city.state)});`,
    );
  }
  for (const family of seed.families) {
    lines.push(
      `INSERT INTO denomination_families (id, slug, name, sort_order) VALUES (${sqlString(family.id)}, ${sqlString(family.slug)}, ${sqlString(family.name)}, ${family.sort_order});`,
    );
  }
  for (const body of seed.bodies) {
    lines.push(
      `INSERT INTO denomination_bodies (id, family_id, slug, name, historically_black_tradition) VALUES (${sqlString(body.id)}, ${sqlString(body.family_id)}, ${sqlString(body.slug)}, ${sqlString(body.name)}, ${body.historically_black_tradition});`,
    );
  }
  for (const church of seed.churches) {
    lines.push(
      `INSERT INTO churches (
        id, slug, name, status, closed_reason, metro_id, city_id, campus_name,
        address, city, state, zip, phone, website, email,
        latitude, longitude, geocode_source, geocode_matched_address,
        denomination_family_id, denomination_body_id, denomination_original, denomination_evidence,
        languages_text, service_times, service_times_structured, earliest_sunday_time, earliest_sunday_minutes,
        proof_quote, proof_url, proof_strength, date_checked, http_status, http_note,
        address_source, phone_source, denomination_source, source, osm_id, checked_with, note,
        photo_key, logo_key, kids_youth, worship_style, theology, young_adults, lgbtq_stance, outreach,
        created_at, updated_at
      ) VALUES (
        ${sqlString(church.id)}, ${sqlString(church.slug)}, ${sqlString(church.name)}, ${sqlString(church.status)}, ${sqlString(church.closed_reason)}, 'charlotte', ${sqlString(church.city_id)}, NULL,
        ${sqlString(church.address)}, ${sqlString(church.city)}, ${sqlString(church.state)}, ${sqlString(church.zip)}, ${sqlString(church.phone)}, ${sqlString(church.website)}, NULL,
        ${sqlNumber(church.latitude)}, ${sqlNumber(church.longitude)}, ${sqlString(church.geocode_source)}, ${sqlString(church.geocode_matched_address)},
        ${sqlString(church.family_id)}, ${sqlString(church.body_id)}, ${sqlString(church.denomination_original)}, ${sqlString(church.denomination_evidence)},
        ${sqlString(church.languages_text)}, ${sqlString(church.service_times)}, ${sqlString(church.service_times_structured)}, ${sqlString(church.earliest_sunday_time)}, ${sqlNumber(church.earliest_sunday_minutes)},
        ${sqlString(church.proof_quote)}, ${sqlString(church.proof_url)}, ${sqlString(church.proof_strength)}, ${sqlString(church.date_checked)}, ${sqlNumber(church.http_status)}, ${sqlString(church.http_note)},
        ${sqlString(church.address_source)}, ${sqlString(church.phone_source)}, ${sqlString(church.denomination_source)}, ${sqlString(church.source)}, ${sqlString(church.osm_id)}, ${sqlString(church.checked_with)}, ${sqlString(church.note)},
        NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      );`,
    );
    church.languages.forEach((language) => {
      lines.push(
        `INSERT INTO church_languages (church_id, language) VALUES (${sqlString(church.id)}, ${sqlString(language)});`,
      );
    });
    const structured = church.service_times_structured ? JSON.parse(church.service_times_structured) as { day: string | null; time_label: string; minutes: number | null; source_text: string }[] : [];
    structured.forEach((slot, index) => {
      lines.push(
        `INSERT INTO church_service_times (id, church_id, day, time_label, minutes, source_text, sort_order) VALUES (${sqlString(`${church.id}-t${index + 1}`)}, ${sqlString(church.id)}, ${sqlString(slot.day)}, ${sqlString(slot.time_label)}, ${sqlNumber(slot.minutes)}, ${sqlString(slot.source_text)}, ${index + 1});`,
      );
    });
  }
  for (const intent of seed.intents) {
    if (!intent.category || !Number.isFinite(intent.rank)) continue;
    lines.push(
      `INSERT INTO search_intent_categories (rank, category, evidence_score, recommendation, how_to_use, rationale) VALUES (${intent.rank}, ${sqlString(intent.category)}, ${sqlNumber(intent.evidence_score)}, ${sqlString(intent.recommendation)}, ${sqlString(intent.how_to_use)}, ${sqlString(intent.rationale)});`,
    );
  }
  return `${lines.join('\n')}\n`;
}
