import { editInput, validateEdit } from '../../shared/forms.mjs';
import { formResult, readFields, sameOrigin } from '../_shared/http';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return formResult(request, '/suggest-edit?error=1', { ok: false, error: 'bad_origin' }, 403);
  if (!env.DB) return formResult(request, '/suggest-edit?error=1', { ok: false, error: 'd1_not_configured' }, 500);

  let fields: Record<string, string>;
  try {
    fields = await readFields(request);
  } catch {
    return formResult(request, '/suggest-edit?error=1', { ok: false, error: 'bad_body' }, 400);
  }

  const input = editInput(fields);
  const verdict = validateEdit(input);
  const ip = request.headers.get('cf-connecting-ip') || '';
  const userAgent = request.headers.get('user-agent') || '';

  if (verdict.spam) {
    await env.DB.prepare(
      `INSERT INTO listing_edit_requests (
        id, church_id, contact_email, message, proposed_changes, status, honeypot, ms_to_submit, user_agent, ip_address, source
      ) VALUES (?, ?, ?, ?, '{}', 'rejected', ?, ?, ?, ?, 'suggest_edit')`,
    ).bind(
      crypto.randomUUID(),
      input.church_id || null,
      input.contact_email || 'spam@example.invalid',
      verdict.reason,
      input.honeypot || verdict.reason,
      verdict.msToSubmit ?? null,
      userAgent,
      ip,
    ).run();
    return formResult(request, '/suggest-edit?sent=1', { ok: true }, 200);
  }

  if (!verdict.ok) {
    return formResult(request, '/suggest-edit?error=1', { ok: false, errors: verdict.errors }, 400);
  }

  const church = await env.DB.prepare('SELECT id, name FROM churches WHERE id = ?').bind(input.church_id).first<{ id: string; name: string }>();
  if (!church) return formResult(request, '/suggest-edit?error=1', { ok: false, errors: ['That church is not in the directory.'] }, 400);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO listing_edit_requests (
      id, church_id, church_name, contact_name, contact_email, message, proposed_changes, status,
      ms_to_submit, user_agent, ip_address, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, ?, 'suggest_edit')`,
  ).bind(
    id,
    church.id,
    church.name,
    input.contact_name || null,
    input.contact_email,
    input.message || null,
    JSON.stringify(verdict.patch),
    verdict.msToSubmit ?? null,
    userAgent,
    ip,
  ).run();

  console.log(JSON.stringify({ event: 'edit_stored', id }));
  return formResult(request, '/suggest-edit?sent=1', { ok: true, id }, 200);
};
