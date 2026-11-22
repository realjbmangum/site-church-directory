import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDirectory } from '../shared/directory.mjs';
import { churchMatches } from '../shared/filters.mjs';
import { languageCounts, sundayBuckets } from '../shared/stats.mjs';
import { CHECK_FIELDS, PUBLIC_EDIT_FIELDS, applyChurchStatements, parseProposedChanges } from '../shared/listing-patch.mjs';
import { validateEdit, validateSubmission } from '../shared/forms.mjs';
import { inferSundayTime } from '../shared/times.mjs';

const directory = buildDirectory();
const churches = directory.churches;

test('seed covers every verified church and the full taxonomy', () => {
  assert.equal(churches.length, 158);
  assert.equal(directory.families.length, 15);
  assert.equal(directory.bodies.length, 67);
  assert.equal(new Set(churches.map((church) => church.slug)).size, 158);
  assert.ok(directory.counts.geocoded >= 150);
  assert.equal(churches.filter((church) => church.published).length, 158);
});

test('every church keeps the service wording and a family from the taxonomy', () => {
  for (const church of churches) {
    assert.ok(church.serviceTimesText.length > 0, church.name);
    assert.equal(church.serviceTimesStructured.raw, church.serviceTimesText);
    assert.ok(directory.families.some((family) => family.id === church.familyId), church.name);
    assert.ok(church.languages.length > 0, church.name);
    assert.equal(church.status, 'open');
  }
});

test('future filter fields stay empty', () => {
  for (const church of churches) {
    assert.equal(church.kidsYouth, null);
    assert.equal(church.worshipStyle, null);
    assert.equal(church.theology, null);
    assert.equal(church.youngAdults, null);
    assert.equal(church.lgbtqStance, null);
    assert.equal(church.outreach, null);
  }
});

test('filters combine family, language, place, and service time', () => {
  const spanish = churches.filter((church) => churchMatches(church, { language: 'Spanish' }));
  assert.ok(spanish.length >= 9);
  const charlotteBaptist = churches.filter((church) =>
    churchMatches(church, { family: 'baptist', place: 'charlotte' }),
  );
  assert.ok(charlotteBaptist.length > 0);
  assert.ok(charlotteBaptist.every((church) => church.familySlug === 'baptist'));
  const buckets = sundayBuckets(churches);
  assert.equal(buckets.reduce((sum, bucket) => sum + bucket.count, 0), churches.length);
  const languages = languageCounts(churches);
  assert.ok(languages.some((row) => row.label === 'English' && row.count === 158));
});

test('live church writes stay on the allowlist and never delete a church', () => {
  const blocked = parseProposedChanges({ slug: 'nope' }, PUBLIC_EDIT_FIELDS);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, 'field_not_allowed');
  const status = parseProposedChanges({ status: 'closed' }, PUBLIC_EDIT_FIELDS);
  assert.equal(status.ok, false);
  const allowed = parseProposedChanges({ phone: '(704) 555-0100', status: 'closed' }, CHECK_FIELDS);
  assert.equal(allowed.ok, true);
  const statements = applyChurchStatements({ churchId: 'example', patch: allowed.patch });
  const sql = statements.map((statement) => statement.sql).join('\n');
  assert.match(sql, /UPDATE churches SET/);
  assert.doesNotMatch(sql, /delete\s+from\s+churches/i);
});

test('a missing Sunday time can be read from the church wording', () => {
  assert.deepEqual(inferSundayTime('9:45 am'), { time: '9:45 AM', minutes: 9 * 60 + 45 });
  assert.deepEqual(inferSundayTime('8:30 & 11:00 AM Traditional'), { time: '8:30 AM', minutes: 8 * 60 + 30 });
  assert.equal(inferSundayTime('Wednesday Worship - 7:00 PM'), null);
  const assurance = churches.find((church) => church.name === 'Assurance United Methodist Church');
  assert.equal(assurance.serviceTimesText, '9:45 am');
  assert.equal(assurance.earliestSundayMinutes, 9 * 60 + 45);
});

test('public forms reject incomplete submissions and keep spam quiet', () => {
  const now = 1_000_000;
  const spam = validateSubmission(
    {
      name: 'Test Church',
      contact_email: 'a@b.co',
      city: 'Charlotte',
      state: 'NC',
      honeypot: 'http://spam.test',
      form_loaded_at: now - 10_000,
    },
    now,
  );
  assert.equal(spam.spam, true);
  const missing = validateSubmission(
    { name: '', contact_email: 'not-an-email', city: '', state: '', honeypot: '', form_loaded_at: now - 10_000 },
    now,
  );
  assert.equal(missing.ok, false);
  assert.ok(missing.errors.length >= 2);
  const edit = validateEdit(
    {
      church_id: 'amity-presbyterian-church',
      contact_email: 'member@example.com',
      message: '',
      patch: { phone: '704-555-0199' },
      honeypot: '',
      form_loaded_at: now - 5000,
    },
    now,
  );
  assert.equal(edit.ok, true);
  assert.equal(edit.patch.phone, '704-555-0199');
});
