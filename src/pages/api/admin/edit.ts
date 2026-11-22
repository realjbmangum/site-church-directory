import type { APIRoute } from 'astro';
import { actorEmail, getBucket, getDb } from '../../../lib/db';
import { approveEdit, rejectEdit } from '../../../lib/desk-actions';
import { formText, originDenied, redirect } from '../../../lib/http';

export const POST: APIRoute = async ({ request, locals }) => {
  if (originDenied(request)) return new Response('Forbidden', { status: 403 });
  const db = getDb(locals);
  if (!db) return redirect('/admin/edits?error=save_failed');
  const form = await request.formData();
  const id = formText(form, 'id', 80);
  const action = formText(form, 'action', 20);
  const actor = actorEmail(locals);
  const bucket = getBucket(locals);
  const result = action === 'approve'
    ? await approveEdit(db, bucket, id, actor)
    : action === 'reject'
      ? await rejectEdit(db, bucket, id, actor)
      : { ok: false, error: 'invalid' };
  if (!result.ok) return redirect(`/admin/edits?error=${result.error || 'invalid'}`);
  return redirect(`/admin/edits?done=${action === 'approve' ? 'approved' : 'rejected'}`);
};
