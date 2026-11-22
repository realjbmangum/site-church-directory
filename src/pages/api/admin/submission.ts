import type { APIRoute } from 'astro';
import { actorEmail, getDb } from '../../../lib/db';
import { approveSubmission, rejectSubmission } from '../../../lib/desk-actions';
import { formText, originDenied, redirect } from '../../../lib/http';

export const POST: APIRoute = async ({ request, locals }) => {
  if (originDenied(request)) return new Response('Forbidden', { status: 403 });
  const db = getDb(locals);
  if (!db) return redirect('/admin/submissions?error=save_failed');
  const form = await request.formData();
  const id = formText(form, 'id', 80);
  const action = formText(form, 'action', 20);
  const actor = actorEmail(locals);
  const result = action === 'approve'
    ? await approveSubmission(db, id, actor)
    : action === 'reject'
      ? await rejectSubmission(db, id, actor)
      : { ok: false as const, error: 'invalid' };
  if (!result.ok) return redirect(`/admin/submissions?error=${result.error || 'invalid'}`);
  return redirect(`/admin/submissions?done=${action === 'approve' ? 'approved' : 'rejected'}`);
};
