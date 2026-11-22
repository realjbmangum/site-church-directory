-- Church Directory schema.
-- Apply locally with: npm run db:migrate
-- Do not run this against the remote D1 database until Brian approves it.

CREATE TABLE IF NOT EXISTS metros (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS cities (
  id TEXT PRIMARY KEY,
  metro_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS denomination_families (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS denomination_bodies (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  historically_black_tradition INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_bodies_family ON denomination_bodies (family_id);

-- status is open or closed. Rows are never deleted.
CREATE TABLE IF NOT EXISTS churches (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_reason TEXT,
  metro_id TEXT,
  city_id TEXT,
  campus_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  latitude REAL,
  longitude REAL,
  geocode_source TEXT,
  geocode_matched_address TEXT,
  denomination_family_id TEXT,
  denomination_body_id TEXT,
  denomination_original TEXT,
  denomination_evidence TEXT,
  languages_text TEXT,
  service_times TEXT,
  service_times_structured TEXT,
  earliest_sunday_time TEXT,
  earliest_sunday_minutes INTEGER,
  proof_quote TEXT,
  proof_url TEXT,
  proof_strength TEXT,
  date_checked TEXT,
  http_status INTEGER,
  http_note TEXT,
  address_source TEXT,
  phone_source TEXT,
  denomination_source TEXT,
  source TEXT,
  osm_id TEXT,
  checked_with TEXT,
  note TEXT,
  photo_key TEXT,
  logo_key TEXT,
  kids_youth TEXT,
  worship_style TEXT,
  theology TEXT,
  young_adults TEXT,
  lgbtq_stance TEXT,
  outreach TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_churches_status ON churches (status);
CREATE INDEX IF NOT EXISTS idx_churches_city ON churches (city_id, status);
CREATE INDEX IF NOT EXISTS idx_churches_family ON churches (denomination_family_id, status);
CREATE INDEX IF NOT EXISTS idx_churches_body ON churches (denomination_body_id, status);
CREATE INDEX IF NOT EXISTS idx_churches_zip ON churches (zip);

CREATE TABLE IF NOT EXISTS church_languages (
  church_id TEXT NOT NULL,
  language TEXT NOT NULL,
  PRIMARY KEY (church_id, language)
);

CREATE TABLE IF NOT EXISTS church_service_times (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL,
  day TEXT,
  time_label TEXT,
  minutes INTEGER,
  source_text TEXT,
  sort_order INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_times_church ON church_service_times (church_id, sort_order);

CREATE TABLE IF NOT EXISTS search_intent_categories (
  rank INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  evidence_score REAL,
  recommendation TEXT,
  how_to_use TEXT,
  rationale TEXT
);

-- Desk queues. Public forms insert waiting rows.
-- A live church row changes only when one of these rows is approved.

CREATE TABLE IF NOT EXISTS church_submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  campus_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  denomination_family TEXT,
  denomination_body TEXT,
  languages_text TEXT,
  service_times TEXT,
  note TEXT,
  submitter_name TEXT,
  submitter_email TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'approved', 'rejected')),
  decided_by TEXT,
  decided_at TEXT,
  church_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON church_submissions (status, created_at);

CREATE TABLE IF NOT EXISTS church_edit_requests (
  id TEXT PRIMARY KEY,
  church_id TEXT,
  church_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  message TEXT,
  proposed_changes TEXT NOT NULL,
  pending_asset_key TEXT,
  pending_asset_type TEXT,
  pending_asset_role TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'approved', 'rejected')),
  decided_by TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_edits_status ON church_edit_requests (status, created_at);

CREATE TABLE IF NOT EXISTS church_listing_checks (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('unchanged', 'minor_update', 'major_update', 'likely_closed', 'check_failed')),
  reason TEXT NOT NULL,
  proposed_changes TEXT,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'applied', 'dismissed')),
  decided_by TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_checks_status ON church_listing_checks (status, checked_at);
CREATE INDEX IF NOT EXISTS idx_checks_church ON church_listing_checks (church_id, checked_at);

-- Inbound mail. The email-inbox Worker is the only writer.
-- It does not update churches.

CREATE TABLE IF NOT EXISTS inbox_messages (
  id TEXT PRIMARY KEY,
  dedupe_key TEXT NOT NULL UNIQUE,
  received_at TEXT NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  recipient TEXT,
  subject TEXT,
  text_body TEXT,
  html_body TEXT,
  message_id TEXT,
  in_reply_to TEXT,
  references_header TEXT,
  matched_church_id TEXT,
  match_method TEXT,
  forward_error TEXT,
  raw_size INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_inbox_received ON inbox_messages (received_at);
