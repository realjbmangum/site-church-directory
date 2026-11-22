import type { APIRoute } from 'astro';
import { getBucket, getDb } from '../../../lib/db';
import { formText, originDenied, redirect } from '../../../lib/http';

const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (originDenied(request)) return new Response('Forbidden', { status: 403 });
  const db = getDb(locals);
  const bucket = getBucket(locals);
  if (!db || !bucket) return redirect('/admin/edits?error=save_failed');
  const form = await request.formData();
  const churchId = formText(form, 'church_id', 120);
  const role = formText(form, 'role', 20) === 'logo' ? 'logo' : 'photo';
  const file = form.get('file');
  if (!churchId || !(file instanceof File) || !TYPES[file.type] || file.size < 1 || file.size > 4_000_000) {
    return redirect('/admin/edits?error=missing');
  }
  const church = await db.prepare(`SELECT id, name FROM churches WHERE id = ?`).bind(churchId).first<{ id: string; name: string }>();
  if (!church) return redirect('/admin/edits?error=missing');
  const id = crypto.randomUUID();
  const key = `pending/${id}.${TYPES[file.type]}`;
  await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  await db.prepare(
    `INSERT INTO church_edit_requests (
      id, church_id, church_name, message, proposed_changes, pending_asset_key, pending_asset_type, pending_asset_role
    ) VALUES (?, ?, ?, ?, '{}', ?, ?, ?)`,
  ).bind(id, church.id, church.name, `Proposed ${role}`, key, file.type, role).run();
  return redirect('/admin/edits?done=saved');
};
