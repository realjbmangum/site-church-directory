import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';
import { formText, honeypotTripped, looksLikeEmail, originDenied, redirect } from '../../lib/http';

export const POST: APIRoute = async ({ request, locals }) => {
  if (originDenied(request)) return new Response('Forbidden', { status: 403 });
  const db = getDb(locals);
  if (!db) return redirect('/submit?error=save_failed');
  const form = await request.formData();
  if (honeypotTripped(form)) return redirect('/submit?sent=1');

  const name = formText(form, 'name', 200);
  const city = formText(form, 'city', 80);
  const state = formText(form, 'state', 2).toUpperCase();
  const address = formText(form, 'address', 300);
  const website = formText(form, 'website', 300);
  const email = formText(form, 'submitter_email', 200);
  if (!name || !city || !/^[A-Z]{2}$/.test(state) || !looksLikeEmail(email) || (!address && !website)) {
    return redirect('/submit?error=missing');
  }

  await db.prepare(
    `INSERT INTO church_submissions (
      id, name, campus_name, address, city, state, zip, phone, website, email,
      denomination_family, denomination_body, languages_text, service_times, note,
      submitter_name, submitter_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    name,
    formText(form, 'campus_name', 200) || null,
    address || null,
    city,
    state,
    formText(form, 'zip', 10) || null,
    formText(form, 'phone', 40) || null,
    website || null,
    formText(form, 'email', 200) || null,
    formText(form, 'denomination_family', 120) || null,
    formText(form, 'denomination_body', 200) || null,
    formText(form, 'languages_text', 200) || null,
    formText(form, 'service_times', 2000) || null,
    formText(form, 'note', 1000) || null,
    formText(form, 'submitter_name', 120) || null,
    email,
  ).run();

  return redirect('/submit?sent=1');
};
