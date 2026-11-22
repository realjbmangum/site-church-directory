-- Church Directory (Charlotte pilot).
-- SQLite types: timestamps and JSON are TEXT, flags are INTEGER 0/1, ids are TEXT.
--
-- Churches are never deleted by the application. A closed or hidden church stays
-- in this table with status = 'closed' and/or unpublished_at set.
-- The DELETE statements in data/build/seed.sql are a local CSV reload only.
--
-- Apply locally (does not create a remote database):
--   npx wrangler d1 migrations apply church-directory-db --local
--
-- TODO(brian): Create the remote D1 database yourself, then put its id in
-- wrangler.jsonc. Do not point this project at pottydirectory-db or recordstops-db.

CREATE TABLE IF NOT EXISTS denomination_families (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  blurb TEXT,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS denomination_bodies (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  historically_black_tradition INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bodies_family ON denomination_bodies (family_id);

-- Live listings. status is open or closed. unpublished_at hides a row from the
-- next public build without removing it.
CREATE TABLE IF NOT EXISTS churches (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_reason TEXT,
  unpublished_at TEXT,
  campus_name TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  latitude REAL,
  longitude REAL,
  geocode_source TEXT,
  geocoded_at TEXT,
  phone TEXT,
  website TEXT,
  family_id TEXT,
  body_id TEXT,
  denomination_original TEXT,
  denomination_evidence TEXT,
  service_times_text TEXT,
  service_times_structured TEXT,
  earliest_sunday_time TEXT,
  earliest_sunday_minutes INTEGER,
  languages_text TEXT,
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
  -- Optional future filters. Empty until a desk row fills them in.
  kids_youth TEXT,
  worship_style TEXT,
  theology TEXT,
  young_adults INTEGER,
  lgbtq_stance TEXT,
  outreach TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_churches_city ON churches (city);
CREATE INDEX IF NOT EXISTS idx_churches_family ON churches (family_id);
CREATE INDEX IF NOT EXISTS idx_churches_body ON churches (body_id);
CREATE INDEX IF NOT EXISTS idx_churches_status ON churches (status, unpublished_at);

CREATE TABLE IF NOT EXISTS church_languages (
  church_id TEXT NOT NULL,
  language TEXT NOT NULL,
  PRIMARY KEY (church_id, language)
);

-- Public "submit a church" form. Approving a row is what inserts a church.
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  service_times_text TEXT,
  languages_text TEXT,
  campus_name TEXT,
  family_id TEXT,
  body_id TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  promoted_church_id TEXT,
  rejection_reason TEXT,
  decided_by TEXT,
  decided_at TEXT,
  honeypot TEXT,
  ms_to_submit INTEGER,
  user_agent TEXT,
  ip_address TEXT,
  source TEXT NOT NULL DEFAULT 'submit_form',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status, created_at);

-- Public "suggest an edit" form. Approve writes proposed_changes. Reject does not.
CREATE TABLE IF NOT EXISTS listing_edit_requests (
  id TEXT PRIMARY KEY,
  church_id TEXT,
  church_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  message TEXT,
  proposed_changes TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'approved', 'rejected')),
  decided_by TEXT,
  decided_at TEXT,
  honeypot TEXT,
  ms_to_submit INTEGER,
  user_agent TEXT,
  ip_address TEXT,
  source TEXT NOT NULL DEFAULT 'suggest_edit',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_listing_edits_status ON listing_edit_requests (status, created_at);

-- Listing checks. Approve writes the stored proposed fields. Reject leaves the church.
CREATE TABLE IF NOT EXISTS listing_checks (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  proposed_changes TEXT,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'approved', 'rejected')),
  decided_by TEXT,
  decided_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_listing_checks_status ON listing_checks (status, created_at);
CREATE INDEX IF NOT EXISTS idx_listing_checks_church ON listing_checks (church_id);

-- Inbound mail for this directory only. The email worker is the only writer.
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
  raw_size INTEGER,
  forward_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_inbox_received ON inbox_messages (received_at);
