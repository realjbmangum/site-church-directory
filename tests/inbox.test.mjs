import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { inboxRow, inboxStatement } from '../workers/email-inbox/src/prepare.mjs';

test('inbox rows stay in inbox_messages and do not mention churches', () => {
  const row = inboxRow({
    dedupeKey: 'abc',
    receivedAt: '2026-11-22T00:00:00.000Z',
    senderName: 'Ada',
    senderEmail: 'ada@example.com',
    recipient: 'info@example.com',
    subject: 'Service time',
    text: 'Sunday at 10',
    html: '<p>Sunday at 10</p>',
    messageId: '<id@example.com>',
    inReplyTo: null,
    references: null,
    rawSize: 42,
    forwardError: null,
  });
  const statement = inboxStatement({ ...row, id: 'row-1' });
  assert.match(statement.sql, /INSERT INTO inbox_messages/);
  assert.doesNotMatch(statement.sql, /churches/i);
  assert.equal(statement.binds[0], 'row-1');
  assert.equal(statement.binds.length, 14);
});

test('the inbox worker source does not write listings', () => {
  const source = readFileSync(new URL('../workers/email-inbox/src/index.ts', import.meta.url), 'utf8');
  assert.match(source, /inbox_messages/);
  assert.doesNotMatch(source, /INSERT INTO churches/i);
  assert.doesNotMatch(source, /UPDATE churches/i);
  assert.doesNotMatch(source, /"addresses"/);
});
