/** URL slugs shared by the seed script, geocoder, and live approval path. */

export function slugify(value: string): string {
  const base = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, 80).replace(/-+$/g, '');
}

export function churchSlug(name: string, city: string | null | undefined): string {
  const joined = [name, city || ''].join(' ').trim();
  return slugify(joined) || 'church';
}

export function uniqueSlug(base: string, used: Set<string>): string {
  const root = base || 'church';
  let slug = root;
  let n = 2;
  while (used.has(slug)) {
    const suffix = `-${n++}`;
    slug = `${root.slice(0, 80 - suffix.length)}${suffix}`;
  }
  used.add(slug);
  return slug;
}
