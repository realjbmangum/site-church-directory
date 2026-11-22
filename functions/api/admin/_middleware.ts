/**
 * Every /api/admin route. Cloudflare Access should also cover /admin and
 * /api/admin at the edge. This check is the in-code lock. If the team domain
 * is unset, the API returns 503. It does not open.
 */
import { json } from '../../_shared/http';
import { localBypass, verifyAccess, type AccessEnv } from '../../_shared/access';

interface Env extends AccessEnv {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (localBypass(request, env)) return context.next();
  if (!env.CF_ACCESS_TEAM_DOMAIN) return json({ ok: false, error: 'access_not_configured' }, 503);
  const identity = await verifyAccess(request, env);
  if (!identity.ok) return json({ ok: false, error: 'unauthorized', reason: identity.reason }, 401);
  return context.next();
};
