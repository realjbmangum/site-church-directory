/**
 * Cloudflare Access JWT check for /admin and /api/admin.
 * Fails closed when the team domain or token is missing. Audience is not
 * required: the signed issuer proves the token came from this Access team.
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface AccessEnv {
  CF_ACCESS_TEAM_DOMAIN?: string;
}

export type AccessDenial = 'no-team-domain' | 'no-token' | `verify-failed:${string}`;
export type AccessResult = { ok: true; payload: JWTPayload } | { ok: false; reason: AccessDenial };

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwks(issuer: string) {
  let set = jwksCache.get(issuer);
  if (!set) {
    set = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer));
    jwksCache.set(issuer, set);
  }
  return set;
}

export function accessTeamIssuer(domain: string | undefined): string | null {
  if (!domain) return null;
  const trimmed = domain.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  if (/^https:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
      if (url.pathname !== '/' && url.pathname !== '') return null;
      return url.origin;
    } catch {
      return null;
    }
  }
  if (!/^[a-z0-9.-]+$/i.test(trimmed)) return null;
  if (trimmed.startsWith('.') || trimmed.endsWith('.') || trimmed.includes('..')) return null;
  return `https://${trimmed}`;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    let value = part.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) value = value.slice(1, -1);
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return null;
}

export function readAccessToken(request: Request): string | null {
  const header = request.headers.get('Cf-Access-Jwt-Assertion')?.trim();
  if (header) return header;
  return readCookie(request.headers.get('Cookie'), 'CF_Authorization');
}

export function accessFailureReason(error: unknown): AccessDenial {
  const code = typeof (error as { code?: unknown } | null)?.code === 'string' ? (error as { code: string }).code : '';
  const claim = typeof (error as { claim?: unknown } | null)?.claim === 'string' ? (error as { claim: string }).claim : '';
  if (!/^[A-Z][A-Z0-9_]+$/.test(code)) return 'verify-failed:unknown';
  if (claim && /^[A-Za-z0-9_]+$/.test(claim)) return `verify-failed:${code}:${claim}`;
  return `verify-failed:${code}`;
}

export async function verifyAccess(request: Request, env: AccessEnv): Promise<AccessResult> {
  const issuer = accessTeamIssuer(env.CF_ACCESS_TEAM_DOMAIN);
  if (!issuer) return { ok: false, reason: 'no-team-domain' };
  const token = readAccessToken(request);
  if (!token) return { ok: false, reason: 'no-token' };
  try {
    const { payload } = await jwtVerify(token, jwks(issuer), { issuer });
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, reason: accessFailureReason(error) };
  }
}

export function accessDenyResponse(pathname: string, reason: AccessDenial): Response {
  const headers = new Headers({
    'X-Access-Deny-Reason': reason,
    'X-Robots-Tag': 'noindex, nofollow',
    'Cache-Control': 'no-store',
  });
  if (pathname.startsWith('/api/')) {
    headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify({ error: 'unauthorized', reason }), { status: 401, headers });
  }
  return new Response('This desk is locked. Sign in through Cloudflare Access.', { status: 403, headers });
}
