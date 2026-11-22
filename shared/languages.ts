/** Split a languages cell such as "English; Spanish" into unique labels. */

export function splitLanguages(value: string | null | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(/[;,]/)) {
    const label = part.trim().replace(/\s+/g, ' ');
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}
