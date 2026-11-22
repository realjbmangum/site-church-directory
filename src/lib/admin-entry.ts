/** Access is attached to /admin/ later. The bare /admin path has to land there. */

export const ADMIN_ENTRY_HEADER = 'x-church-directory-admin-entry';
const ENTRY_PATHS = new Set(['/admin', '/admin/index.html']);

export function adminEntryLocation(url: URL, opts: { dev?: boolean; rewritten?: boolean } = {}): string | null {
  if (opts.dev || opts.rewritten) return null;
  if (!ENTRY_PATHS.has(url.pathname)) return null;
  const dest = new URL(url.href);
  dest.pathname = '/admin/';
  return dest.href;
}

export function rewriteAdminSlashRequest(request: Request): Request {
  const url = new URL(request.url);
  if (url.pathname !== '/admin/') return request;
  url.pathname = '/admin';
  const headers = new Headers(request.headers);
  headers.set(ADMIN_ENTRY_HEADER, '1');
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }
  return new Request(url, init);
}
