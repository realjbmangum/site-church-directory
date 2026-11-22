import type { APIRoute } from 'astro';
import { sanitizePatch } from '@shared/desk';
import { getDb } from '../../lib/db';
import { formText, honeypotTripped, originDenied, redirect } from '../../lib/http';
import { getChurch } from '../../lib/queries';

const FIELDS = ['service_times', 'phone', 'website', 'address', 'city', 'state', 'zip', 'languages_text', 'campus_name'] as const;

export const POST: APIRoute = async ({ request, locals }) => {
  if (originDenied(request)) return new Response('Forbidden', { status: 403 });
  const db = getDb(locals);
  if (!db) return redirect('/map?error=save_failed');
  const form = await request.formData();
  const slug = formText(form, 'church', 120);
  const back = `/church/${slug}/suggest`;
  if (honeypotTripped(form)) return redirect(`${back}?sent=1`);
  const church = await getChurch(db, slug);
  if (!church) return redirect('/map');
  const message = formText(form, 'message', 2000);
  if (!message) return redirect(`${back}?error=missing`);

  const raw: Record<string, string> = {};
  for (const field of FIELDS) {
    const value = formText(form, field, field === 'service_times' ? 2000 : 300);
    if (value) raw[field] = value;
  }
  const patch = sanitizePatch(raw);
  await db.prepare(
    `INSERT INTO church_edit_requests (
      id, church_id, church_name, contact_name, contact_email, message, proposed_changes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    church.id,
    church.name,
    formText(form, 'contact_name', 120) || null,
    formText(form, 'contact_email', 200) || null,
    message,
    JSON.stringify(patch),
  ).run();
  return redirect(`${back}?sent=1`);
};
