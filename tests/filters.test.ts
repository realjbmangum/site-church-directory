import assert from 'node:assert/strict';
import test from 'node:test';
import { partOfLine, churchTypeName } from '../shared/church-types.ts';
import { isStatedYes, matchesSearch, outreachTokens, statedParts, type SearchableChurch } from '../shared/filters.ts';

test('unknown is not a stated value and is never a no', () => {
  assert.deepEqual(statedParts('unknown'), []);
  assert.deepEqual(statedParts(''), []);
  assert.equal(isStatedYes('unknown'), false);
  assert.equal(isStatedYes('yes'), true);
  assert.deepEqual(outreachTokens('community service; missions'), ['community-service', 'missions']);
});

test('a specific body is a secondary line only when it names a group', () => {
  assert.equal(partOfLine('Southern Baptist Convention'), 'Part of the Southern Baptist Convention');
  assert.equal(partOfLine('Baptist (body not stated)'), null);
  assert.equal(partOfLine('Metrolina Baptist Association member (convention not stated)'), null);
  assert.equal(partOfLine('Not stated'), null);
});

test('church type falls back to the family when research is not loaded', () => {
  assert.equal(churchTypeName('Baptist', 'Southern Baptist Convention', null), 'Baptist');
  assert.equal(churchTypeName('Presbyterian & Reformed', 'PC(USA)', null), 'Presbyterian');
  assert.equal(churchTypeName('Baptist', 'Southern Baptist Convention', 'Not listed yet'), 'Not listed yet');
});

test('filters combine across groups and any choice counts inside a group', () => {
  const church: SearchableChurch = {
    slug: 'a',
    name: 'A',
    city: 'Charlotte',
    zip: '28202',
    typeSlug: 'baptist',
    typeName: 'Baptist',
    languages: ['English'],
    services: [{ day: 'Sunday', minutes: 9 * 60 }, { day: 'Wednesday', minutes: 19 * 60 }],
    worship: ['traditional'],
    outreach: ['food-pantry'],
    nursery: false,
    kids: true,
    youth: false,
    youngAdults: false,
    choir: false,
    livestream: true,
    groups: false,
    school: false,
  };
  const base = {
    q: '',
    place: '',
    type: 'baptist',
    languages: [],
    days: ['sunday'],
    times: ['9-to-1030'],
    worship: [],
    outreach: [],
    nursery: false,
    kids: true,
    youth: false,
    youngAdults: false,
    choir: false,
    livestream: false,
    groups: false,
    school: false,
  };
  assert.equal(matchesSearch(church, base), true);
  assert.equal(matchesSearch(church, { ...base, days: ['saturday'] }), false);
  assert.equal(matchesSearch(church, { ...base, worship: ['contemporary', 'traditional'] }), true);
  assert.equal(matchesSearch(church, { ...base, nursery: true }), false);
});
