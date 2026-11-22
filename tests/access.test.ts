import assert from 'node:assert/strict';
import test from 'node:test';
import { accessDenyResponse, accessTeamIssuer } from '../src/lib/access.ts';

test('access issuer accepts a team host and rejects junk', () => {
  assert.equal(accessTeamIssuer('mangumhome.cloudflareaccess.com'), 'https://mangumhome.cloudflareaccess.com');
  assert.equal(accessTeamIssuer('https://mangumhome.cloudflareaccess.com/'), 'https://mangumhome.cloudflareaccess.com');
  assert.equal(accessTeamIssuer('http://mangumhome.cloudflareaccess.com'), null);
  assert.equal(accessTeamIssuer(''), null);
  assert.equal(accessTeamIssuer('not a host'), null);
});

test('a missing token fails closed', async () => {
  const response = accessDenyResponse('/admin', 'no-token');
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  const api = accessDenyResponse('/api/admin/edit', 'no-team-domain');
  assert.equal(api.status, 401);
});
