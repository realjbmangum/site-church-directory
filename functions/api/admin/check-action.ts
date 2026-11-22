/**
 * Listing checks. Create only inserts a desk row.
 * Approve writes the stored patch. Reject does not touch the church.
 */
import { json } from '../../_shared/http';
import { requireActor, type AccessEnv } from '../../_shared/access';
import { applyPatch, decide } from '../../_shared/apply';
import { CHECK_FIELDS, parseProposedChanges } from '../../../shared/listing-patch.mjs';

interface Env extends AccessEnv {
  DB: D1Database;
}

interface CheckRow {
  id: string;
  church_id: string;
  status: string;
  proposed_changes: string | null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const actor = await requireActor(request, env);
  if (!actor) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.DB) return json({ ok: false, error: 'd1_not_configured' }, 500);

  let body: {
    action?: string;
    check_id?: string;
    church_id?: string;
    summary?: string;
    evidence_url?: string;
    proposed_changes?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_body' }, 400);
  }

  if (body.action === 'create') return createCheck(env, actor, body);
  if (!body.check_id) return json({ ok: false, error: 'check_id required' }, 400);

  const row = await env.DB.prepare(
    'SELECT id, church_id, status, proposed_changes FROM listing_checks WHERE id = ?',
  ).bind(body.check_id).first<CheckRow>();
  if (!row) return json({ ok: false, error: 'check_not_found' }, 404);
  if (row.status !== 'waiting') return json({ ok: false, error: 'already_decided' }, 409);

  if (body.action === 'reject') {
    const wrote = await decide(
      env.DB,
      `UPDATE listing_checks
       SET status = 'rejected', decided_by = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? AND status = 'waiting'`,
      [actor, row.id],
    );
    if (!wrote) return json({ ok: false, error: 'already_decided' }, 409);
    return json({ ok: true, status: 'rejected' });
  }

  if (body.action !== 'approve') return json({ ok: false, error: 'bad_action' }, 400);
  const parsed = parseProposedChanges(row.proposed_changes || '{}', CHECK_FIELDS);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);
  const church = await env.DB.prepare('SELECT id FROM churches WHERE id = ?').bind(row.church_id).first();
  if (!church) return json({ ok: false, error: 'listing_missing' }, 404);

  const wrote = await decide(
    env.DB,
    `UPDATE listing_checks
     SET status = 'approved', decided_by = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ? AND status = 'waiting'`,
    [actor, row.id],
  );
  if (!wrote) return json({ ok: false, error: 'already_decided' }, 409);
  try {
    await applyPatch(env.DB, row.church_id, parsed.patch);
  } catch (error) {
    console.error(JSON.stringify({ event: 'check_apply_failed', id: row.id, error: String(error) }));
    return json({ ok: false, error: 'apply_failed' }, 500);
  }
  return json({ ok: true, status: 'approved', fields: Object.keys(parsed.patch) });
};

async function createCheck(
  env: Env,
  actor: string,
  body: { church_id?: string; summary?: string; evidence_url?: string; proposed_changes?: unknown },
): Promise<Response> {
  const summary = (body.summary || '').trim();
  if (!body.church_id) return json({ ok: false, error: 'church_id required' }, 400);
  if (summary.length < 8) return json({ ok: false, error: 'summary_too_short' }, 400);
  const church = await env.DB.prepare('SELECT id FROM churches WHERE id = ?').bind(body.church_id).first();
  if (!church) return json({ ok: false, error: 'listing_missing' }, 404);
  const parsed = parseProposedChanges(body.proposed_changes ?? {}, CHECK_FIELDS);
  if (!parsed.ok) return json({ ok: false, error: parsed.error, field: parsed.field }, 400);

  let evidence: string | null = null;
  if (body.evidence_url && body.evidence_url.trim()) {
    try {
      const url = new URL(body.evidence_url.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return json({ ok: false, error: 'bad_url' }, 400);
      evidence = url.toString();
    } catch {
      return json({ ok: false, error: 'bad_url' }, 400);
    }
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO listing_checks (id, church_id, summary, proposed_changes, evidence_url, status, created_by)
     VALUES (?, ?, ?, ?, ?, 'waiting', ?)`,
  ).bind(id, body.church_id, summary.slice(0, 2000), JSON.stringify(parsed.patch), evidence, actor).run();
  return json({ ok: true, id, status: 'waiting' });
}
