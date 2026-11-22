export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
}

export function formatChecked(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function proofLabel(strength: string | null | undefined): string | null {
  if (!strength) return null;
  if (strength === 'strong') return 'Strong: the quote matches a service time on the church site.';
  if (strength.startsWith('weaker')) return 'Needs another look: a person should read the source page again.';
  return strength;
}

export function serviceLines(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  const parts = raw.split('|').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.some((part) => part.length > 160)) return null;
  return parts;
}

export function snippet(value: string | null | undefined, max = 140): string {
  if (!value) return '';
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export function placeLine(church: { city?: string | null; state?: string | null; zip?: string | null }): string {
  const city = [church.city, church.state].filter(Boolean).join(', ');
  return [city, church.zip].filter(Boolean).join(' ');
}

export function directionsUrl(church: { latitude?: number | null; longitude?: number | null; address?: string | null; city?: string | null; state?: string | null; zip?: string | null }): string | null {
  if (church.latitude != null && church.longitude != null) {
    return `https://www.openstreetmap.org/directions?to=${church.latitude}%2C${church.longitude}`;
  }
  const query = [church.address, church.city, church.state, church.zip].filter(Boolean).join(', ');
  if (!query) return null;
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/media/${key.split('/').map(encodeURIComponent).join('/')}`;
}
