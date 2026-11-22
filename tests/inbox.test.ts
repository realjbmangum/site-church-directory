import assert from 'node:assert/strict';
import test from 'node:test';
import { dedupeKey, htmlToText, matchChurch } from '../workers/email-inbox/src/prepare.ts';

const churches = [
  { id: 'amity-presbyterian-church-charlotte', name: 'Amity Presbyterian Church', website: 'https://www.amitypc.org/' },
  { id: 'beloved-community-church-charlotte', name: 'Beloved Community Church', website: 'https://www.belovedcc.org' },
];

test('mail from a church website domain matches that church', () => {
  const match = matchChurch(churches, 'Question', 'Hello', 'office@amitypc.org');
  assert.equal(match.churchId, 'amity-presbyterian-church-charlotte');
  assert.equal(match.method, 'website');
});

test('a named church in the subject matches when the sender is unknown', () => {
  const match = matchChurch(churches, 'Beloved Community Church hours', '', 'person@example.com');
  assert.equal(match.churchId, 'beloved-community-church-charlotte');
  assert.equal(match.method, 'name');
});

test('unrelated mail stays unmatched', () => {
  const match = matchChurch(churches, 'Lunch', 'See you there', 'person@example.com');
  assert.equal(match.churchId, null);
});

test('dedupe keys are stable and html becomes text', async () => {
  const first = await dedupeKey('<id-1@example.com>', null);
  const second = await dedupeKey('<id-1@example.com>', null);
  assert.equal(first, second);
  assert.equal(htmlToText('<p>Sunday at 11</p>'), 'Sunday at 11');
});
