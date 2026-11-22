/**
 * Offline geocoder for the Charlotte seed.
 * Uses the free US Census Bureau geocoder first. Addresses it cannot match
 * fall back to OpenStreetMap Nominatim, one request at a time.
 * No API key. No paid API.
 *
 *   node scripts/geocode.mjs
 *
 * A slug already stored as Match or skipped is left alone.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDirectory } from '../shared/directory.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'data', 'charlotte', 'geocodes.json');
const censusBatch = 'https://geocoding.geo.census.gov/geocoder/locations/addressbatch';
const censusOne = 'https://geocoding.geo.census.gov/geocoder/locations/address';
const benchmark = 'Public_AR_Current';
const nominatim = 'https://nominatim.openstreetmap.org/search';
const userAgent = 'ChurchDirectoryCharlottePilot/0.1 (offline seed geocode)';

function loadExisting() {
  if (!existsSync(outPath)) {
    return { source: 'US Census Bureau Geocoder', benchmark, generated_at: null, results: {} };
  }
  return JSON.parse(readFileSync(outPath, 'utf8'));
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function splitCsvLine(line) {
  const cells = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += char;
    } else if (char === '"') inQuotes = true;
    else if (char === ',') {
      cells.push(field);
      field = '';
    } else field += char;
  }
  cells.push(field);
  return cells;
}

function save(existing) {
  existing.generated_at = new Date().toISOString();
  existing.source = 'US Census Bureau Geocoder, with OpenStreetMap Nominatim for misses';
  existing.benchmark = benchmark;
  writeFileSync(outPath, `${JSON.stringify(existing, null, 2)}\n`);
}

function cleanStreet(street) {
  return street
    .replace(/\./g, '')
    .replace(/\bEast\b/gi, 'E')
    .replace(/\bWest\b/gi, 'W')
    .replace(/\bNorth\b/gi, 'N')
    .replace(/\bSouth\b/gi, 'S')
    .replace(/\bW\s*T\b/gi, 'WT')
    .replace(/\s+/g, ' ')
    .trim();
}

async function censusSingle(church) {
  const params = new URLSearchParams({
    street: cleanStreet(church.streetAddress),
    city: church.city || '',
    state: church.state || 'NC',
    zip: church.postalCode || '',
    benchmark,
    format: 'json',
  });
  const response = await fetch(`${censusOne}?${params}`);
  if (!response.ok) return null;
  const data = await response.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  const latitude = Number(match.coordinates?.y);
  const longitude = Number(match.coordinates?.x);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    match: 'Match',
    match_type: 'census-oneline',
    matched_address: match.matchedAddress || null,
    latitude,
    longitude,
    source: 'US Census Bureau Geocoder',
  };
}

async function nominatimSearch(church) {
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    q: `${church.streetAddress}, ${church.city || ''}, ${church.state || 'NC'} ${church.postalCode || ''}`,
  });
  const response = await fetch(`${nominatim}?${params}`, {
    headers: { 'User-Agent': userAgent, Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const data = await response.json();
  const hit = data?.[0];
  if (!hit) return null;
  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    match: 'Match',
    match_type: 'nominatim',
    matched_address: hit.display_name || null,
    latitude,
    longitude,
    source: 'OpenStreetMap Nominatim',
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const directory = buildDirectory({ geocodes: { results: {} } });
const existing = loadExisting();
existing.results ||= {};

const todo = [];
for (const church of directory.churches) {
  const prior = existing.results[church.slug];
  if (prior && (prior.match === 'Match' || prior.match === 'skipped')) continue;
  if (!church.streetAddress) {
    existing.results[church.slug] = { match: 'skipped', reason: 'no street address' };
    continue;
  }
  todo.push(church);
}

if (todo.length > 0) {
  console.log(`Sending ${todo.length} addresses to the Census batch geocoder.`);
  const csv = todo
    .map((church) =>
      [church.slug, church.streetAddress, church.city || '', church.state || 'NC', church.postalCode || '']
        .map(csvCell)
        .join(','),
    )
    .join('\n');
  const body = new FormData();
  body.set('benchmark', benchmark);
  body.set('addressFile', new Blob([csv], { type: 'text/csv' }), 'addresses.csv');
  const response = await fetch(censusBatch, { method: 'POST', body });
  if (!response.ok) {
    console.error(`Census geocoder HTTP ${response.status}`);
    console.error((await response.text()).slice(0, 500));
    process.exit(1);
  }
  const text = await response.text();
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())) {
    const cells = splitCsvLine(line);
    const coord = cells[5] || '';
    const [lngText, latText] = coord.split(',').map((part) => part.trim());
    const latitude = latText ? Number(latText) : null;
    const longitude = lngText ? Number(lngText) : null;
    const match = cells[2] || 'No_Match';
    existing.results[cells[0]] = {
      match,
      match_type: cells[3] || null,
      matched_address: cells[4] || null,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      source: match === 'Match' ? 'US Census Bureau Geocoder' : null,
    };
  }
}

const misses = directory.churches.filter((church) => {
  const record = existing.results[church.slug];
  return church.streetAddress && (!record || record.match !== 'Match');
});

for (const church of misses) {
  const census = await censusSingle(church);
  if (census) {
    existing.results[church.slug] = census;
    console.log(`Census oneline matched ${church.slug}`);
    continue;
  }
  await sleep(1100);
  const osm = await nominatimSearch(church);
  if (osm) {
    existing.results[church.slug] = osm;
    console.log(`Nominatim matched ${church.slug}`);
  } else {
    existing.results[church.slug] = {
      match: 'No_Match',
      reason: 'census and nominatim missed',
      source: null,
    };
    console.log(`Still unmatched ${church.slug}`);
  }
}

save(existing);
const matched = Object.values(existing.results).filter((record) => record.match === 'Match').length;
console.log(`Matched ${matched} of ${directory.churches.length}. Wrote ${outPath}`);
