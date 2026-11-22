/**
 * Approve inserts a church. Reject does not. The public form never writes churches.
 */
import { json } from '../../_shared/http';
import { requireActor, type AccessEnv } from '../../_shared/access';
import { uniqueSlug } from '../../../shared/slug.mjs';
import { splitLanguages } from '../../../shared/listing-patch.mjs';

interface Env extends AccessEnv {
  DB: D1Database;
}

interface SubmissionRow {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string;
  phone: string | null;
  website: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  service_times_text: string | null;
  languages_text: string | null;
  campus_name: string | null;
  family_id: string | null;
  message: string | null;
  status: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const actor = await requireActor(request, env);
  if (!actor) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.DB) return json({ ok: false, error: 'd1_not_configured' }, 500);

  let body: { action?: string; submission_id?: string; rejection_reason?: string };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_body' }, 400);
  }
  if (!body.submission_id) return json({ ok: false, error: 'submission_id required' }, 400);

  const row = await env.DB.prepare('SELECT * FROM submissions WHERE id = ?').bind(body.submission_id).first<SubmissionRow>();
  if (!row) return json({ ok: false, error: 'submission_not_found' }, 404);
  if (row.status !== 'pending') return json({ ok: false, error: 'already_decided' }, 409);

  if (body.action === 'reject') {
    const reason = (body.rejection_reason || '').trim().slice(0, 500) || null;
    const result = await env.DB.prepare(
      `UPDATE submissions
       SET status = 'rejected', rejection_reason = ?, decided_by = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? AND status = 'pending'`,
    ).bind(reason, actor, row.id).run();
    if ((result.meta?.changes ?? 0) < 1) return json({ ok: false, error: 'already_decided' }, 409);
    return json({ ok: true, status: 'rejected' });
  }

  if (body.action !== 'approve') return json({ ok: false, error: 'bad_action' }, 400);

  let familyId = row.family_id;
  if (familyId) {
    const family = await env.DB.prepare('SELECT id FROM denomination_families WHERE id = ?').bind(familyId).first();
    if (!family) familyId = null;
  }

  const used = new Set<string>();
  const existing = await env.DB.prepare('SELECT slug FROM churches').all<{ slug: string }>();
  for (const item of existing.results || []) used.add(item.slug);
  const slug = uniqueSlug(row.name, used);
  const languages = splitLanguages(row.languages_text);

  await env.DB.prepare(
    `INSERT INTO churches (
      id, slug, name, status, campus_name, street_address, city, state, postal_code,
      phone, website, family_id, service_times_text, service_times_structured, languages_text, note
    ) VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    slug,
    slug,
    row.name,
    row.campus_name,
    row.street_address,
    row.city,
    row.state,
    row.postal_code,
    row.phone,
    row.website,
    familyId,
    row.service_times_text,
    JSON.stringify({ raw: row.service_times_text || '', earliest_sunday_time: null, earliest_sunday_minutes: null }),
    languages.join('; ') || null,
    'Added from an approved submission. Not yet checked against the church website.',
  ).run();

  if (languages.length) {
    await env.DB.batch(languages.map((language) =>
      env.DB.prepare('INSERT INTO church_languages (church_id, language) VALUES (?, ?)').bind(slug, language),
    ));
  }

  const decided = await env.DB.prepare(
    `UPDATE submissions
     SET status = 'approved', promoted_church_id = ?, decided_by = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ? AND status = 'pending'`,
  ).bind(slug, actor, row.id).run();
  if ((decided.meta?.changes ?? 0) < 1) {
    return json({ ok: false, error: 'already_decided', church_id: slug }, 409);
  }

  console.log(JSON.stringify({ event: 'submission_approved', id: row.id, church_id: slug, actor }));
  return json({
    ok: true,
    status: 'approved',
    church_id: slug,
    note: 'Saved in the database. The public site shows it on the next build.',
  });
};
