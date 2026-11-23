import { all, first } from './db';

const CHURCH_SELECT = `
  SELECT
    c.id, c.slug, c.name, c.status, c.closed_reason, c.metro_id, c.city_id, c.campus_name,
    c.address, c.city, c.state, c.zip, c.phone, c.website, c.email,
    c.latitude, c.longitude, c.geocode_source,
    c.denomination_family_id, c.denomination_body_id, c.denomination_original, c.denomination_evidence,
    c.languages_text, c.service_times, c.service_times_structured, c.earliest_sunday_time, c.earliest_sunday_minutes,
    c.proof_quote, c.proof_url, c.proof_strength, c.date_checked, c.http_note, c.note,
    c.photo_key, c.logo_key, c.kids_youth, c.worship_style, c.theology, c.young_adults, c.lgbtq_stance, c.outreach,
    c.updated_at,
    f.name AS family_name, f.slug AS family_slug,
    b.name AS body_name, b.slug AS body_slug, b.historically_black_tradition
  FROM churches c
  LEFT JOIN denomination_families f ON f.id = c.denomination_family_id
  LEFT JOIN denomination_bodies b ON b.id = c.denomination_body_id
`;

export interface ChurchRecord {
  id: string;
  slug: string;
  name: string;
  status: 'open' | 'closed';
  closed_reason: string | null;
  metro_id: string | null;
  city_id: string | null;
  campus_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  geocode_source: string | null;
  denomination_family_id: string | null;
  denomination_body_id: string | null;
  denomination_original: string | null;
  denomination_evidence: string | null;
  languages_text: string | null;
  service_times: string | null;
  service_times_structured: string | null;
  earliest_sunday_time: string | null;
  earliest_sunday_minutes: number | null;
  proof_quote: string | null;
  proof_url: string | null;
  proof_strength: string | null;
  date_checked: string | null;
  http_note: string | null;
  note: string | null;
  photo_key: string | null;
  logo_key: string | null;
  kids_youth: string | null;
  worship_style: string | null;
  theology: string | null;
  young_adults: string | null;
  lgbtq_stance: string | null;
  outreach: string | null;
  updated_at: string;
  family_name: string | null;
  family_slug: string | null;
  body_name: string | null;
  body_slug: string | null;
  historically_black_tradition: number | null;
}

export interface FamilyRecord {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  church_count: number;
}

export interface BodyRecord {
  id: string;
  slug: string;
  name: string;
  family_id: string;
  family_slug: string;
  family_name: string;
  historically_black_tradition: number;
  church_count: number;
}

export interface CityRecord {
  id: string;
  slug: string;
  name: string;
  state: string;
  church_count: number;
}

export interface LanguageRecord {
  language: string;
  church_count: number;
}

export function listOpenChurches(db: D1Database): Promise<ChurchRecord[]> {
  return all<ChurchRecord>(db, `${CHURCH_SELECT} WHERE c.status = 'open' ORDER BY c.name`);
}

export function getChurch(db: D1Database, slug: string): Promise<ChurchRecord | null> {
  return first<ChurchRecord>(db, `${CHURCH_SELECT} WHERE c.slug = ?`, slug);
}

export function listFamilies(db: D1Database): Promise<FamilyRecord[]> {
  return all<FamilyRecord>(
    db,
    `SELECT f.id, f.slug, f.name, f.sort_order,
            (SELECT COUNT(*) FROM churches c WHERE c.denomination_family_id = f.id AND c.status = 'open') AS church_count
     FROM denomination_families f
     ORDER BY f.sort_order`,
  );
}

export function getFamily(db: D1Database, slug: string): Promise<FamilyRecord | null> {
  return first<FamilyRecord>(
    db,
    `SELECT f.id, f.slug, f.name, f.sort_order,
            (SELECT COUNT(*) FROM churches c WHERE c.denomination_family_id = f.id AND c.status = 'open') AS church_count
     FROM denomination_families f
     WHERE f.slug = ?`,
    slug,
  );
}

export function listBodies(db: D1Database, familyId?: string): Promise<BodyRecord[]> {
  const where = familyId ? 'WHERE b.family_id = ?' : '';
  const binds = familyId ? [familyId] : [];
  return all<BodyRecord>(
    db,
    `SELECT b.id, b.slug, b.name, b.family_id, b.historically_black_tradition,
            f.slug AS family_slug, f.name AS family_name,
            (SELECT COUNT(*) FROM churches c WHERE c.denomination_body_id = b.id AND c.status = 'open') AS church_count
     FROM denomination_bodies b
     JOIN denomination_families f ON f.id = b.family_id
     ${where}
     ORDER BY church_count DESC, b.name`,
    ...binds,
  );
}

export function getBody(db: D1Database, familySlug: string, bodySlug: string): Promise<BodyRecord | null> {
  return first<BodyRecord>(
    db,
    `SELECT b.id, b.slug, b.name, b.family_id, b.historically_black_tradition,
            f.slug AS family_slug, f.name AS family_name,
            (SELECT COUNT(*) FROM churches c WHERE c.denomination_body_id = b.id AND c.status = 'open') AS church_count
     FROM denomination_bodies b
     JOIN denomination_families f ON f.id = b.family_id
     WHERE f.slug = ? AND b.slug = ?`,
    familySlug,
    bodySlug,
  );
}

export function listCities(db: D1Database): Promise<CityRecord[]> {
  return all<CityRecord>(
    db,
    `SELECT ci.id, ci.slug, ci.name, ci.state,
            (SELECT COUNT(*) FROM churches c WHERE c.city_id = ci.id AND c.status = 'open') AS church_count
     FROM cities ci
     ORDER BY church_count DESC, ci.name`,
  );
}

export function getCity(db: D1Database, slug: string): Promise<CityRecord | null> {
  return first<CityRecord>(
    db,
    `SELECT ci.id, ci.slug, ci.name, ci.state,
            (SELECT COUNT(*) FROM churches c WHERE c.city_id = ci.id AND c.status = 'open') AS church_count
     FROM cities ci WHERE ci.slug = ?`,
    slug,
  );
}

export function churchesInCity(db: D1Database, cityId: string): Promise<ChurchRecord[]> {
  return all<ChurchRecord>(db, `${CHURCH_SELECT} WHERE c.status = 'open' AND c.city_id = ? ORDER BY c.name`, cityId);
}

export function churchesInFamily(db: D1Database, familyId: string): Promise<ChurchRecord[]> {
  return all<ChurchRecord>(db, `${CHURCH_SELECT} WHERE c.status = 'open' AND c.denomination_family_id = ? ORDER BY c.name`, familyId);
}

export function churchesInBody(db: D1Database, bodyId: string): Promise<ChurchRecord[]> {
  return all<ChurchRecord>(db, `${CHURCH_SELECT} WHERE c.status = 'open' AND c.denomination_body_id = ? ORDER BY c.name`, bodyId);
}

export function listLanguages(db: D1Database): Promise<LanguageRecord[]> {
  return all<LanguageRecord>(
    db,
    `SELECT cl.language AS language, COUNT(*) AS church_count
     FROM church_languages cl
     JOIN churches c ON c.id = cl.church_id
     WHERE c.status = 'open'
     GROUP BY cl.language
     ORDER BY church_count DESC, cl.language`,
  );
}

export function unplacedChurches(db: D1Database): Promise<ChurchRecord[]> {
  return all<ChurchRecord>(db, `${CHURCH_SELECT} WHERE c.status = 'open' AND c.city_id IS NULL ORDER BY c.name`);
}

export interface IntentRecord {
  rank: number;
  category: string;
  evidence_score: number | null;
  recommendation: string | null;
  how_to_use: string | null;
  rationale: string | null;
}

export function listIntents(db: D1Database): Promise<IntentRecord[]> {
  return all<IntentRecord>(db, `SELECT rank, category, evidence_score, recommendation, how_to_use, rationale FROM search_intent_categories ORDER BY rank`);
}

export interface DeskCounts {
  submissions: number;
  edits: number;
  checks: number;
  inbox: number;
  churches: number;
  closed: number;
}

export async function deskCounts(db: D1Database): Promise<DeskCounts> {
  const row = await first<{
    submissions: number;
    edits: number;
    checks: number;
    inbox: number;
    churches: number;
    closed: number;
  }>(
    db,
    `SELECT
      (SELECT COUNT(*) FROM church_submissions WHERE status = 'waiting') AS submissions,
      (SELECT COUNT(*) FROM church_edit_requests WHERE status = 'waiting') AS edits,
      (SELECT COUNT(*) FROM church_listing_checks WHERE status = 'waiting') AS checks,
      (SELECT COUNT(*) FROM inbox_messages) AS inbox,
      (SELECT COUNT(*) FROM churches WHERE status = 'open') AS churches,
      (SELECT COUNT(*) FROM churches WHERE status = 'closed') AS closed`,
  );
  return row ?? { submissions: 0, edits: 0, checks: 0, inbox: 0, churches: 0, closed: 0 };
}

export interface SubmissionRow {
  id: string;
  name: string;
  campus_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  denomination_family: string | null;
  denomination_body: string | null;
  languages_text: string | null;
  service_times: string | null;
  note: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  church_id: string | null;
  created_at: string;
}

export function listSubmissions(db: D1Database, status: string): Promise<SubmissionRow[]> {
  return all<SubmissionRow>(db, `SELECT * FROM church_submissions WHERE status = ? ORDER BY created_at DESC LIMIT 100`, status);
}

export interface EditRow {
  id: string;
  church_id: string | null;
  church_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  message: string | null;
  proposed_changes: string;
  pending_asset_key: string | null;
  pending_asset_type: string | null;
  pending_asset_role: string | null;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

export function listEdits(db: D1Database, status: string): Promise<EditRow[]> {
  return all<EditRow>(db, `SELECT * FROM church_edit_requests WHERE status = ? ORDER BY created_at DESC LIMIT 100`, status);
}

export interface CheckRow {
  id: string;
  church_id: string;
  church_name: string | null;
  church_slug: string | null;
  checked_at: string;
  classification: string;
  reason: string;
  proposed_changes: string | null;
  evidence_url: string | null;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

export function listChecks(db: D1Database, status: string): Promise<CheckRow[]> {
  return all<CheckRow>(
    db,
    `SELECT k.*, c.name AS church_name, c.slug AS church_slug
     FROM church_listing_checks k
     LEFT JOIN churches c ON c.id = k.church_id
     WHERE k.status = ?
     ORDER BY k.created_at DESC
     LIMIT 100`,
    status,
  );
}

export interface InboxRow {
  id: string;
  received_at: string;
  sender_name: string | null;
  sender_email: string | null;
  recipient: string | null;
  subject: string | null;
  text_body: string | null;
  matched_church_id: string | null;
  match_method: string | null;
  forward_error: string | null;
  created_at: string;
  church_name: string | null;
  church_slug: string | null;
}

export function listInbox(db: D1Database): Promise<InboxRow[]> {
  return all<InboxRow>(
    db,
    `SELECT m.id, m.received_at, m.sender_name, m.sender_email, m.recipient, m.subject, m.text_body,
            m.matched_church_id, m.match_method, m.forward_error, m.created_at,
            c.name AS church_name, c.slug AS church_slug
     FROM inbox_messages m
     LEFT JOIN churches c ON c.id = m.matched_church_id
     ORDER BY m.received_at DESC
     LIMIT 100`,
  );
}

export function listChurchOptions(db: D1Database): Promise<{ id: string; name: string; city: string | null }[]> {
  return all(db, `SELECT id, name, city FROM churches ORDER BY name`);
}

export interface FutureCounts {
  kids_youth: number;
  worship_style: number;
  theology: number;
  young_adults: number;
  lgbtq_stance: number;
  outreach: number;
}

export function futureFilterCounts(db: D1Database): Promise<FutureCounts | null> {
  return first<FutureCounts>(
    db,
    `SELECT
      SUM(CASE WHEN kids_youth IS NOT NULL AND kids_youth != '' THEN 1 ELSE 0 END) AS kids_youth,
      SUM(CASE WHEN worship_style IS NOT NULL AND worship_style != '' THEN 1 ELSE 0 END) AS worship_style,
      SUM(CASE WHEN theology IS NOT NULL AND theology != '' THEN 1 ELSE 0 END) AS theology,
      SUM(CASE WHEN young_adults IS NOT NULL AND young_adults != '' THEN 1 ELSE 0 END) AS young_adults,
      SUM(CASE WHEN lgbtq_stance IS NOT NULL AND lgbtq_stance != '' THEN 1 ELSE 0 END) AS lgbtq_stance,
      SUM(CASE WHEN outreach IS NOT NULL AND outreach != '' THEN 1 ELSE 0 END) AS outreach
     FROM churches WHERE status = 'open'`,
  );
}
