import { defineMiddleware } from 'astro:middleware';
import { ADMIN_ENTRY_HEADER, adminEntryLocation } from './lib/admin-entry';
import { accessDenyResponse, verifyAccess, type AccessEnv } from './lib/access';

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
};

const PROTECTED = [/^\/admin(\/|$)/, /^\/api\/admin(\/|$)/];

function withHeaders(response: Response, extra?: Record<string, string>): Response {
  const apply = (headers: Headers) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
    if (extra) {
      for (const [name, value] of Object.entries(extra)) headers.set(name, value);
    }
  };
  try {
    apply(response.headers);
    return response;
  } catch {
    const headers = new Headers(response.headers);
    apply(headers);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  const adminEntry = adminEntryLocation(url, {
    dev: import.meta.env.DEV,
    rewritten: context.request.headers.get(ADMIN_ENTRY_HEADER) === '1',
  });
  if (adminEntry) {
    return withHeaders(new Response(null, { status: 301, headers: { Location: adminEntry } }));
  }

  if (!PROTECTED.some((pattern) => pattern.test(path))) {
    const response = await next();
    if (url.pathname === '/map' && url.search) {
      return withHeaders(response, { 'X-Robots-Tag': 'noindex, follow' });
    }
    return withHeaders(response);
  }

  const env = (context.locals.runtime?.env ?? {}) as AccessEnv;
  const identity = await verifyAccess(context.request, env);
  const devBypass =
    import.meta.env.DEV &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]');

  if (!identity.ok && !devBypass) {
    console.log(JSON.stringify({ event: 'admin_denied', reason: identity.reason, path }));
    return withHeaders(accessDenyResponse(path, identity.reason));
  }

  const email = identity.ok && typeof identity.payload.email === 'string' ? identity.payload.email : 'dev@localhost';
  context.locals.cfUser = { email };
  const rendered = await next();
  return withHeaders(rendered, { 'X-Robots-Tag': 'noindex, nofollow' });
});
