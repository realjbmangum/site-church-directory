import { json } from '../../_shared/http';
import { requireActor, type AccessEnv } from '../../_shared/access';

interface Env extends AccessEnv {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const actor = await requireActor(request, env);
  if (!actor) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.DB) return json({ ok: false, error: 'd1_not_configured' }, 500);

  const [submissions, edits, checks, inbox, churches, counts] = await Promise.all([
    env.DB.prepare(
      `SELECT id, name, contact_name, contact_email, phone, website, street_address, city, state, postal_code,
              service_times_text, languages_text, campus_name, family_id, message, created_at
       FROM submissions WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100`,
    ).all(),
    env.DB.prepare(
      `SELECT id, church_id, church_name, contact_name, contact_email, message, proposed_changes, created_at
       FROM listing_edit_requests WHERE status = 'waiting' ORDER BY created_at ASC LIMIT 100`,
    ).all(),
    env.DB.prepare(
      `SELECT id, church_id, summary, proposed_changes, evidence_url, created_at
       FROM listing_checks WHERE status = 'waiting' ORDER BY created_at ASC LIMIT 100`,
    ).all(),
    env.DB.prepare(
      `SELECT id, received_at, sender_name, sender_email, subject, substr(text_body, 1, 400) AS excerpt, forward_error
       FROM inbox_messages ORDER BY received_at DESC LIMIT 20`,
    ).all(),
    env.DB.prepare(`SELECT id, name, city FROM churches ORDER BY name ASC`).all(),
    env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM churches) AS churches,
         (SELECT COUNT(*) FROM submissions WHERE status = 'pending') AS submissions,
         (SELECT COUNT(*) FROM listing_edit_requests WHERE status = 'waiting') AS edits,
         (SELECT COUNT(*) FROM listing_checks WHERE status = 'waiting') AS checks`,
    ).first(),
  ]);

  return json({
    ok: true,
    actor,
    counts,
    submissions: submissions.results || [],
    edits: edits.results || [],
    checks: checks.results || [],
    inbox: inbox.results || [],
    churches: churches.results || [],
  });
};
