import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { patchFromCheck, sanitizePatch } from '../shared/desk.ts';
import { splitLanguages } from '../shared/languages.ts';
import { parseServiceTimes } from '../shared/service-times.ts';
import { churchSlug } from '../shared/slug.ts';
import { buildSeedSql, loadDirectory } from '../scripts/directory.ts';

const seed = loadDirectory(new URL('../data/charlotte/', import.meta.url).pathname);

test('seed loads the Charlotte pilot', () => {
  assert.equal(seed.churches.length, 158);
  assert.equal(seed.families.length, 15);
  assert.equal(seed.bodies.length, 67);
  assert.ok(seed.cities.length >= 7);
  assert.equal(seed.intents.length, 28);
  const withCoords = seed.churches.filter((church) => church.latitude != null);
  assert.ok(withCoords.length >= 150);
  for (const church of withCoords) {
    assert.ok(church.latitude! > 34 && church.latitude! < 36);
    assert.ok(church.longitude! < -80 && church.longitude! > -82);
  }
  assert.equal(seed.churches.filter((church) => church.status !== 'open').length, 0);
});

test('seed sql replaces directory rows and leaves the desk alone', () => {
  const sql = buildSeedSql(seed);
  assert.equal(sql.match(/INSERT INTO churches/g)?.length, 158);
  assert.match(sql, /DELETE FROM churches/);
  assert.doesNotMatch(sql, /DELETE FROM church_submissions/);
  assert.doesNotMatch(sql, /DELETE FROM inbox_messages/);
  assert.match(sql, /kids_youth/);
});

test('slugs stay stable for a known church', () => {
  assert.equal(churchSlug('Amity Presbyterian Church', 'Charlotte'), 'amity-presbyterian-church-charlotte');
  const amity = seed.churches.find((church) => church.name === 'Amity Presbyterian Church');
  assert.equal(amity?.slug, 'amity-presbyterian-church-charlotte');
  assert.equal(amity?.family_name, 'Presbyterian & Reformed');
});

test('service times keep the original wording and add structure only when a time is obvious', () => {
  const clean = parseServiceTimes('Sunday | 11:00 AM');
  assert.equal(clean.length, 1);
  assert.equal(clean[0].day, 'Sunday');
  assert.equal(clean[0].time_label, '11:00 AM');
  assert.equal(clean[0].minutes, 660);
  const messy = parseServiceTimes('x'.repeat(300));
  assert.equal(messy.length, 0);
});

test('languages split on semicolons', () => {
  assert.deepEqual(splitLanguages('English; Spanish; Spanish'), ['English', 'Spanish']);
});

test('desk patches cannot rename the slug or delete the row', () => {
  const patch = sanitizePatch({ slug: 'hacked', id: 'gone', status: 'deleted', phone: ' (704) 555-0100 ', name: '  New Name  ' });
  assert.equal(patch.phone, '(704) 555-0100');
  assert.equal(patch.name, 'New Name');
  assert.equal('slug' in patch, false);
  assert.equal('id' in patch, false);
  assert.equal('status' in patch, false);
});

test('an approved closed check marks the church closed and does not drop it', () => {
  const patch = patchFromCheck({
    classification: 'likely_closed',
    reason: 'The site says the congregation has merged.',
    proposed_changes: '{}',
    checked_at: '2026-11-22T15:00:00.000Z',
  });
  assert.equal(patch.status, 'closed');
  assert.match(String(patch.closed_reason), /merged/);
  assert.equal(patch.date_checked, '2026-11-22');
  const explicit = patchFromCheck({
    classification: 'likely_closed',
    reason: 'The building is for sale.',
    proposed_changes: JSON.stringify({ status: 'closed' }),
    checked_at: '2026-11-22T15:00:00.000Z',
  });
  assert.equal(explicit.status, 'closed');
  assert.match(String(explicit.closed_reason), /for sale/);
});

test('migration keeps open and closed and never mentions DELETE of churches as a status', () => {
  const sql = readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8');
  assert.match(sql, /CHECK \(status IN \('open', 'closed'\)\)/);
  assert.match(sql, /kids_youth/);
  assert.match(sql, /lgbtq_stance/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS inbox_messages/);
});
