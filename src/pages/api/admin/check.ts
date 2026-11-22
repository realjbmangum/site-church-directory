import type { APIRoute } from 'astro';
import { sanitizePatch } from '@shared/desk';
import { actorEmail, getDb } from '../../../lib/db';
import { applyCheck, dismissCheck } from '../../../lib/desk-actions';
import { formText, originDenied, redirect } from '../../../lib/http';

const CLASSES = new Set(['unchanged', 'minor_update', 'major_update', 'likely_closed', 'check_failed']);

export const POST: APIRoute = async ({ request, locals }) => {
  if (originDenied(request)) return new Response('Forbidden', { status: 403 });
  const db = getDb(locals);
  if (!db) return redirect('/admin/checks?error=save_failed');
  const form = await request.formData();
  const action = formText(form, 'action', 20);
  const actor = actorEmail(locals);

  if (action === 'create') {
    const churchId = formText(form, 'church_id', 120);
    const classification = formText(form, 'classification', 40);
    const reason = formText(form, 'reason', 1000);
    if (!churchId || !CLASSES.has(classification) || !reason) return redirect('/admin/checks?error=missing');
    const church = await db.prepare(`SELECT id FROM churches WHERE id = ?`).bind(churchId).first();
    if (!church) return redirect('/admin/checks?error=missing');
    const raw: Record<string, string> = {};
    for (const field of ['service_times', 'phone', 'website', 'status', 'closed_reason'] as const) {
      const value = formText(form, field, field === 'service_times' ? 2000 : 300);
      if (value) raw[field] = value;
    }
    const patch = sanitizePatch(raw);
    await db.prepare(
      `INSERT INTO church_listing_checks (id, church_id, checked_at, classification, reason, proposed_changes, evidence_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      churchId,
      new Date().toISOString(),
      classification,
      reason,
      JSON.stringify(patch),
      formText(form, 'evidence_url', 400) || null,
    ).run();
    return redirect('/admin/checks?done=saved');
  }

  const id = formText(form, 'id', 80);
  const result = action === 'apply'
    ? await applyCheck(db, id, actor)
    : action === 'dismiss'
      ? await dismissCheck(db, id, actor)
      : { ok: false, error: 'invalid' };
  if (!result.ok) return redirect(`/admin/checks?error=${result.error || 'invalid'}`);
  return redirect(`/admin/checks?done=${action === 'apply' ? 'applied' : 'dismissed'}`);
};
