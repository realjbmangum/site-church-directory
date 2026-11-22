/**
 * Approve writes only the stored public fields. Reject leaves the church alone.
 */
import { json } from '../../_shared/http';
import { requireActor, type AccessEnv } from '../../_shared/access';
import { applyPatch, decide } from '../../_shared/apply';
import { PUBLIC_EDIT_FIELDS, parseProposedChanges } from '../../../shared/listing-patch.mjs';

interface Env extends AccessEnv {
  DB: D1Database;
}

interface EditRow {
  id: string;
  church_id: string | null;
  status: string;
  proposed_changes: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const actor = await requireActor(request, env);
  if (!actor) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.DB) return json({ ok: false, error: 'd1_not_configured' }, 500);

  let body: { action?: string; request_id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_body' }, 400);
  }
  if (!body.request_id) return json({ ok: false, error: 'request_id required' }, 400);

  const row = await env.DB.prepare(
    'SELECT id, church_id, status, proposed_changes FROM listing_edit_requests WHERE id = ?',
  ).bind(body.request_id).first<EditRow>();
  if (!row) return json({ ok: false, error: 'request_not_found' }, 404);
  if (row.status !== 'waiting') return json({ ok: false, error: 'already_decided' }, 409);

  if (body.action === 'reject') {
    const wrote = await decide(
      env.DB,
      `UPDATE listing_edit_requests
       SET status = 'rejected', decided_by = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? AND status = 'waiting'`,
      [actor, row.id],
    );
    if (!wrote) return json({ ok: false, error: 'already_decided' }, 409);
    return json({ ok: true, status: 'rejected' });
  }

  if (body.action !== 'approve') return json({ ok: false, error: 'bad_action' }, 400);
  const parsed = parseProposedChanges(row.proposed_changes, PUBLIC_EDIT_FIELDS);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);
  if (!row.church_id) return json({ ok: false, error: 'listing_missing' }, 404);
  const church = await env.DB.prepare('SELECT id FROM churches WHERE id = ?').bind(row.church_id).first();
  if (!church) return json({ ok: false, error: 'listing_missing' }, 404);

  const wrote = await decide(
    env.DB,
    `UPDATE listing_edit_requests
     SET status = 'approved', decided_by = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ? AND status = 'waiting'`,
    [actor, row.id],
  );
  if (!wrote) return json({ ok: false, error: 'already_decided' }, 409);

  try {
    await applyPatch(env.DB, row.church_id, parsed.patch);
  } catch (error) {
    console.error(JSON.stringify({ event: 'edit_apply_failed', id: row.id, error: String(error) }));
    return json({ ok: false, error: 'apply_failed' }, 500);
  }
  return json({ ok: true, status: 'approved', fields: Object.keys(parsed.patch) });
};
