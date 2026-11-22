/**
 * Geocode church street addresses with the US Census Bureau batch geocoder.
 * Free, no API key. Writes data/charlotte/geocodes.json. Does not touch D1.
 *
 * https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from '../shared/csv.ts';
import { churchSlug, uniqueSlug } from '../shared/slug.ts';

const root = join(import.meta.dirname, '..');
const dataDir = join(root, 'data/charlotte');
const endpoint = 'https://geocoding.geo.census.gov/geocoder/locations/addressbatch';

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

const verified = parseCsv(readFileSync(join(dataDir, 'churches_verified.csv'), 'utf8'));
const used = new Set<string>();
const rows = verified.map((row) => {
  const slug = uniqueSlug(churchSlug(row.name.trim(), row.city.trim() || null), used);
  return {
    slug,
    address: row.address.trim(),
    city: row.city.trim(),
    state: row.state.trim() || 'NC',
    zip: row.zip.trim(),
  };
});

const geocodable = rows.filter((row) => row.address && row.city);
const skipped = rows.filter((row) => !row.address || !row.city).map((row) => row.slug);
const body = geocodable
  .map((row) => [row.slug, row.address, row.city, row.state, row.zip].map(csvField).join(','))
  .join('\n');

const form = new FormData();
form.set('benchmark', 'Public_AR_Current');
form.set('addressFile', new Blob([body], { type: 'text/csv' }), 'addresses.csv');

console.log(`Geocoding ${geocodable.length} addresses. Skipping ${skipped.length} without a street and city.`);
const response = await fetch(endpoint, {
  method: 'POST',
  body: form,
  headers: {
    'User-Agent': 'findachurch-directory-seed/0.1 (local geocode script)',
  },
});
if (!response.ok) {
  console.error(`Census geocoder returned ${response.status}`);
  console.error((await response.text()).slice(0, 500));
  process.exit(1);
}
const text = await response.text();
const results: Record<string, { lat: number; lng: number; matched_address: string; match: string }> = {};
let matched = 0;
let missed = 0;
for (const line of text.split(/\r?\n/)) {
  if (!line.trim()) continue;
  const cells = parseCsvLine(line);
  const slug = cells[0] ?? '';
  const status = cells[2] ?? '';
  const matchedAddress = cells[4] ?? '';
  const coord = cells[5] ?? '';
  if (status !== 'Match' || !coord.includes(',')) {
    missed += 1;
    continue;
  }
  const [lngText, latText] = coord.split(',');
  const lng = Number(lngText);
  const lat = Number(latText);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    missed += 1;
    continue;
  }
  results[slug] = { lat, lng, matched_address: matchedAddress, match: status };
  matched += 1;
}

const output = {
  generated_at: new Date().toISOString(),
  source: 'US Census Bureau Geocoder, Public_AR_Current batch locations',
  source_url: 'https://geocoding.geo.census.gov/geocoder/',
  matched,
  missed,
  skipped,
  results,
};
writeFileSync(join(dataDir, 'geocodes.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Matched ${matched}. No match ${missed}. Wrote data/charlotte/geocodes.json`);

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      cells.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  cells.push(field);
  return cells;
}
