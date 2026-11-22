export interface ChurchMatch {
  id: string;
  name: string;
  website: string | null;
}

export function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export function senderHost(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null;
  return email.split('@').pop()?.trim().toLowerCase() || null;
}

/** Match a message to a church for the desk. Does not change the church. */
export function matchChurch(
  churches: ChurchMatch[],
  subject: string,
  text: string,
  senderEmail: string | null,
): { churchId: string | null; method: string | null } {
  const fromHost = senderHost(senderEmail);
  if (fromHost) {
    const bySite = churches.find((church) => hostOf(church.website) === fromHost);
    if (bySite) return { churchId: bySite.id, method: 'website' };
  }
  const hay = `${subject}\n${text}`.toLowerCase();
  let best: ChurchMatch | null = null;
  for (const church of churches) {
    const name = church.name.trim().toLowerCase();
    if (name.length < 8) continue;
    if (!hay.includes(name)) continue;
    if (!best || name.length > best.name.length) best = church;
  }
  if (best) return { churchId: best.id, method: 'name' };
  return { churchId: null, method: null };
}

export async function dedupeKey(messageId: string | null, raw: ArrayBuffer | null): Promise<string> {
  const basis = messageId?.trim();
  const bytes = basis ? new TextEncoder().encode(basis.toLowerCase()) : new Uint8Array(raw ?? new ArrayBuffer(0));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20000);
}
