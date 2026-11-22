import type { APIRoute } from 'astro';
import { getBucket } from '../../lib/db';

export const GET: APIRoute = async ({ params, locals }) => {
  const key = params.key;
  if (!key || key.includes('..') || key.startsWith('/')) return new Response('Not found', { status: 404 });
  const bucket = getBucket(locals);
  if (!bucket) return new Response('Not found', { status: 404 });
  const object = await bucket.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/octet-stream');
  headers.set('cache-control', 'public, max-age=86400');
  return new Response(object.body, { headers });
};
