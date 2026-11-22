import { submissionInput, validateSubmission } from '../../shared/forms.mjs';
import { formResult, readFields, sameOrigin } from '../_shared/http';

interface Env {
  DB: D1Database;
}

function log(event: string, fields: Record<string, string | number | boolean | null>) {
  console.log(JSON.stringify({ event, ...fields }));
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return formResult(request, '/submit?error=1', { ok: false, error: 'bad_origin' }, 403);
  if (!env.DB) return formResult(request, '/submit?error=1', { ok: false, error: 'd1_not_configured' }, 500);

  let fields: Record<string, string>;
  try {
    fields = await readFields(request);
  } catch {
    return formResult(request, '/submit?error=1', { ok: false, error: 'bad_body' }, 400);
  }

  const input = submissionInput(fields);
  const verdict = validateSubmission(input);
  const ip = request.headers.get('cf-connecting-ip') || '';
  const userAgent = request.headers.get('user-agent') || '';

  if (verdict.spam) {
    await env.DB.prepare(
      `INSERT INTO submissions (
        id, name, contact_email, city, state, status, honeypot, ms_to_submit, user_agent, ip_address, source
      ) VALUES (?, ?, ?, ?, ?, 'spam', ?, ?, ?, ?, 'submit_form')`,
    ).bind(
      crypto.randomUUID(),
      input.name || '(spam)',
      input.contact_email || 'spam@example.invalid',
      input.city,
      input.state,
      input.honeypot || verdict.reason,
      verdict.msToSubmit ?? null,
      userAgent,
      ip,
    ).run();
    log('submission_spam', { reason: verdict.reason });
    return formResult(request, '/submit?sent=1', { ok: true }, 200);
  }

  if (!verdict.ok) {
    return formResult(request, '/submit?error=1', { ok: false, errors: verdict.errors }, 400);
  }

  let familyId: string | null = input.family_id || null;
  if (familyId) {
    const family = await env.DB.prepare('SELECT id FROM denomination_families WHERE id = ?').bind(familyId).first<{ id: string }>();
    if (!family) familyId = null;
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO submissions (
      id, name, contact_name, contact_email, phone, website, street_address, city, state, postal_code,
      service_times_text, languages_text, campus_name, family_id, message, status, ms_to_submit,
      user_agent, ip_address, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 'submit_form')`,
  ).bind(
    id,
    input.name,
    input.contact_name || null,
    input.contact_email,
    input.phone || null,
    input.website || null,
    input.street_address || null,
    input.city,
    input.state,
    input.postal_code || null,
    input.service_times_text || null,
    input.languages_text || null,
    input.campus_name || null,
    familyId,
    input.message || null,
    verdict.msToSubmit ?? null,
    userAgent,
    ip,
  ).run();

  log('submission_stored', { id });
  return formResult(request, '/submit?sent=1', { ok: true, id }, 200);
};
