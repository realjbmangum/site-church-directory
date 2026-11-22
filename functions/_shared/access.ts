/**
 * Cloudflare Access JWT check for the admin API.
 * Fails closed. Team domain only: signature and issuer, not a per-app audience,
 * matching the other directories.
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface AccessEnv {
  CF_ACCESS_TEAM_DOMAIN?: string;
  ADMIN_DEV_BYPASS?: string;
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function accessTeamIssuer(domain: string | undefined): string | null {
  if (!domain) return null;
  const trimmed = domain.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  if (/^https:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      if (url.pathname !== '/' && url.pathname !== '') return null;
      return url.origin;
    } catch {
      return null;
    }
  }
  if (!/^[a-z0-9.-]+$/i.test(trimmed)) return null;
  return `https://${trimmed}`;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const value = part.slice(eq + 1).trim();
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
  return readCookie(request.headers.get('cookie'), 'CF_Authorization');
}

export async function verifyAccess(
  request: Request,
  env: AccessEnv,
): Promise<{ ok: true; payload: JWTPayload } | { ok: false; reason: string }> {
  const issuer = accessTeamIssuer(env.CF_ACCESS_TEAM_DOMAIN);
  if (!issuer) return { ok: false, reason: 'no-team-domain' };
  const token = readAccessToken(request);
  if (!token) return { ok: false, reason: 'no-token' };
  let jwks = jwksCache.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer));
    jwksCache.set(issuer, jwks);
  }
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer });
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: 'verify-failed' };
  }
}

export function localBypass(request: Request, env: AccessEnv): boolean {
  if (env.ADMIN_DEV_BYPASS !== '1') return false;
  const host = new URL(request.url).hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

export async function requireActor(request: Request, env: AccessEnv): Promise<string | null> {
  if (localBypass(request, env)) return 'dev@localhost';
  const identity = await verifyAccess(request, env);
  if (!identity.ok) return null;
  const email = identity.payload.email;
  return typeof email === 'string' && email ? email : 'access-user';
}
