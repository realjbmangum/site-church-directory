import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './csv.mjs';
import { slugify, uniqueSlug } from './slug.mjs';
import { splitLanguages } from './listing-patch.mjs';
import { inferSundayTime } from './times.mjs';

function findDataDir() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(process.cwd(), 'data', 'charlotte'),
    join(here, '..', 'data', 'charlotte'),
    join(here, '..', '..', 'data', 'charlotte'),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'churches_verified.csv'))) return candidate;
  }
  throw new Error('Could not find data/charlotte/churches_verified.csv');
}

const dataDir = findDataDir();

const FAMILY_BLURBS = {
  Baptist: 'Churches that baptize professing believers and usually make decisions as a congregation.',
  Methodist: 'Churches in the Wesleyan tradition, with a mix of personal faith and practical service.',
  'Presbyterian & Reformed': 'Churches led by elders, in the Reformed tradition.',
  Catholic: 'Catholic parishes. In this pilot they are in the Diocese of Charlotte unless a listing says otherwise.',
  Orthodox: 'Eastern Orthodox parishes.',
  'Anglican & Episcopal': 'Liturgical churches in the Anglican tradition, including the Episcopal Church.',
  Lutheran: 'Churches that follow the Lutheran confessions.',
  'Pentecostal & Charismatic': 'Churches that put special emphasis on the gifts of the Holy Spirit.',
  Holiness: 'Churches in the Wesleyan holiness tradition, including the Church of the Nazarene.',
  Adventist: 'Churches that worship on Saturday, including the Seventh-day Adventist Church.',
  Moravian: 'Churches in the Moravian tradition, which has deep roots in North Carolina.',
  Restorationist: 'Churches that aim to follow the New Testament pattern, including the Churches of Christ.',
  'Non-denominational': 'Churches that are not part of a denomination.',
  'Other Christian': 'Christian congregations that do not sit in the families above.',
  'Not stated': 'The church site and the source directory did not name a denomination.',
};

export function readSeedFiles() {
  const verified = parseCsv(readFileSync(join(dataDir, 'churches_verified.csv'), 'utf8'));
  const mapping = parseCsv(readFileSync(join(dataDir, 'churches_denomination_mapping.csv'), 'utf8'));
  const taxonomy = parseCsv(readFileSync(join(dataDir, 'denomination_taxonomy.csv'), 'utf8'));
  return { verified, mapping, taxonomy };
}

export function loadGeocodes() {
  const path = join(dataDir, 'geocodes.json');
  if (!existsSync(path)) return { results: {}, source: null };
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  return {
    source: parsed.source || null,
    benchmark: parsed.benchmark || null,
    generatedAt: parsed.generated_at || null,
    results: parsed.results || {},
  };
}

function blank(value) {
  const text = value == null ? '' : String(value).trim();
  return text || null;
}

function keyOf(row) {
  return `${(row.name || '').trim().toLowerCase()}|${(row.city || '').trim().toLowerCase()}|${(row.zip || '').trim()}`;
}

function sqlString(value) {
  if (value == null) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  if (value == null || value === '') return 'NULL';
  const number = Number(value);
  if (!Number.isFinite(number)) return 'NULL';
  return String(number);
}

export function buildDirectory(options = {}) {
  const files = options.files || readSeedFiles();
  const geocodes = options.geocodes || loadGeocodes();
  const { verified, mapping, taxonomy } = files;

  const families = [];
  const familyByName = new Map();
  const bodies = [];
  const bodyByFamilyAndName = new Map();
  const usedBodySlugs = new Set();

  taxonomy.forEach((row, index) => {
    const familyName = row.family.trim();
    let family = familyByName.get(familyName);
    if (!family) {
      family = {
        id: `family:${slugify(familyName)}`,
        slug: slugify(familyName),
        name: familyName,
        blurb: FAMILY_BLURBS[familyName] || 'A Christian tradition in the Charlotte pilot.',
        sort: families.length,
        bodies: [],
        churchCount: 0,
      };
      familyByName.set(familyName, family);
      families.push(family);
    }
    const bodyName = row.specific_body.trim();
    let bodySlug = slugify(bodyName);
    if (usedBodySlugs.has(bodySlug)) bodySlug = `${family.slug}-${bodySlug}`;
    usedBodySlugs.add(bodySlug);
    const body = {
      id: `body:${bodySlug}`,
      slug: bodySlug,
      name: bodyName,
      familyId: family.id,
      familySlug: family.slug,
      familyName: family.name,
      historicallyBlack: row.historically_black_tradition.trim().toLowerCase() === 'yes',
      sort: index,
      churchCount: 0,
    };
    family.bodies.push(body);
    bodies.push(body);
    bodyByFamilyAndName.set(`${familyName}|${bodyName}`, body);
  });

  const mappingByKey = new Map(mapping.map((row) => [keyOf(row), row]));
  const usedChurchSlugs = new Set();
  const churches = [];

  for (const row of verified) {
    const mapped = mappingByKey.get(keyOf(row));
    if (!mapped) {
      throw new Error(`No denomination mapping for ${row.name}`);
    }
    const familyName = mapped.denomination_family.trim();
    const bodyName = mapped.denomination_body.trim();
    const family = familyByName.get(familyName);
    const body = bodyByFamilyAndName.get(`${familyName}|${bodyName}`);
    if (!family || !body) {
      throw new Error(`Taxonomy missing ${familyName} / ${bodyName} for ${row.name}`);
    }

    const slug = uniqueSlug(row.name, usedChurchSlugs);
    const city = blank(row.city);
    const languages = splitLanguages(mapped.languages);
    const serviceTimesText = blank(row.service_times) || blank(mapped.service_times) || '';
    const minutesRaw = blank(mapped.earliest_sunday_minutes);
    let minutes = minutesRaw == null ? null : Number(minutesRaw);
    if (!Number.isFinite(minutes)) minutes = null;
    let earliestLabel = blank(mapped.earliest_sunday_time);
    if (minutes == null) {
      const inferred = inferSundayTime(serviceTimesText);
      if (inferred) {
        minutes = inferred.minutes;
        earliestLabel = inferred.time;
      }
    }
    const structured = {
      raw: serviceTimesText,
      earliest_sunday_time: earliestLabel,
      earliest_sunday_minutes: minutes,
    };
    const geo = geocodes.results[slug] || null;
    const latitude = geo && geo.latitude != null ? Number(geo.latitude) : null;
    const longitude = geo && geo.longitude != null ? Number(geo.longitude) : null;

    const church = {
      id: slug,
      slug,
      name: row.name.trim(),
      status: 'open',
      closedReason: null,
      unpublishedAt: null,
      campusName: null,
      streetAddress: blank(row.address),
      city,
      state: blank(row.state) || (city ? 'NC' : null),
      postalCode: blank(row.zip),
      citySlug: city ? slugify(city) : null,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      geocodeSource: geo && geo.match === 'Match' ? (geocodes.source || 'geocoder') : null,
      geocodedAt: geo && geo.match === 'Match' ? (geocodes.generatedAt || null) : null,
      phone: blank(row.phone),
      website: blank(row.website),
      familyId: family.id,
      familySlug: family.slug,
      familyName: family.name,
      bodyId: body.id,
      bodySlug: body.slug,
      bodyName: body.name,
      historicallyBlack: body.historicallyBlack,
      denominationOriginal: blank(mapped.denomination_original) || blank(row.denomination),
      denominationEvidence: blank(mapped.denomination_evidence),
      serviceTimesText,
      serviceTimesStructured: structured,
      earliestSundayTime: structured.earliest_sunday_time,
      earliestSundayMinutes: structured.earliest_sunday_minutes,
      languages,
      languagesText: languages.join('; '),
      proofQuote: blank(row.proof_quote),
      proofUrl: blank(row.proof_url),
      proofStrength: blank(row.proof_strength),
      dateChecked: blank(row.date_checked),
      httpStatus: blank(row.http_status) ? Number(row.http_status) : null,
      httpNote: blank(row.http_note),
      addressSource: blank(row.address_source),
      phoneSource: blank(row.phone_source),
      denominationSource: blank(row.denomination_source),
      source: blank(row.source),
      osmId: blank(row.osm_id),
      checkedWith: blank(row.checked_with),
      note: blank(row.note),
      kidsYouth: null,
      worshipStyle: null,
      theology: null,
      youngAdults: null,
      lgbtqStance: null,
      outreach: null,
    };
    church.published = church.status === 'open' && !church.unpublishedAt;
    churches.push(church);
    if (church.published) {
      family.churchCount += 1;
      body.churchCount += 1;
    }
  }

  churches.sort((a, b) => a.name.localeCompare(b.name));

  const cityMap = new Map();
  for (const church of churches) {
    if (!church.published || !church.citySlug) continue;
    const existing = cityMap.get(church.citySlug);
    if (existing) existing.churchCount += 1;
    else {
      cityMap.set(church.citySlug, {
        slug: church.citySlug,
        name: church.city,
        state: church.state || 'NC',
        churchCount: 1,
      });
    }
  }
  const cities = [...cityMap.values()].sort((a, b) => b.churchCount - a.churchCount || a.name.localeCompare(b.name));

  const published = churches.filter((church) => church.published);
  const dates = published.map((church) => church.dateChecked).filter(Boolean).sort();

  return {
    generatedAt: new Date().toISOString(),
    checkedOn: dates[dates.length - 1] || null,
    geocodeSource: geocodes.source,
    metro: {
      slug: 'charlotte',
      name: 'Charlotte',
      label: 'Charlotte metro',
      state: 'NC',
      stateName: 'North Carolina',
    },
    families,
    bodies,
    cities,
    churches,
    counts: {
      churches: published.length,
      families: families.filter((family) => family.churchCount > 0).length,
      bodies: bodies.filter((body) => body.churchCount > 0).length,
      cities: cities.length,
      geocoded: published.filter((church) => church.latitude != null && church.longitude != null).length,
      withSaturday: published.filter((church) => /saturday/i.test(church.serviceTimesText || '')).length,
      nonEnglish: published.filter((church) =>
        church.languages.some((language) => language.toLowerCase() !== 'english'),
      ).length,
    },
  };
}

let cached = null;

/** Cached for the Astro build. Node scripts should call buildDirectory(). */
export function getDirectory() {
  if (!cached) cached = buildDirectory();
  return cached;
}

export function publishedChurches(directory = getDirectory()) {
  return directory.churches.filter((church) => church.published);
}

export function churchBySlug(slug, directory = getDirectory()) {
  return directory.churches.find((church) => church.slug === slug && church.published) || null;
}

export function formatLongDate(iso) {
  if (!iso) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function proofNote(church) {
  const when = formatLongDate(church.dateChecked);
  if (church.proofStrength && church.proofStrength.startsWith('weaker')) {
    return when
      ? `Last checked ${when}. The line on the church site was short, so this listing is worth a second look.`
      : 'The line on the church site was short, so this listing is worth a second look.';
  }
  return when
    ? `Last verified ${when} from the church's own website.`
    : "Verified from the church's own website.";
}

export function serviceLines(church) {
  const raw = church.serviceTimesText || '';
  const parts = raw.split('|').map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts : (raw ? [raw] : []);
}

/** SQL that reloads taxonomy and churches into a local D1 database. Desk rows are left alone. */
export function seedSql(directory = buildDirectory()) {
  const lines = [];
  lines.push('-- Local bootstrap for the Charlotte pilot.');
  lines.push('-- Application code never deletes a church. This file only resets the seed tables');
  lines.push('-- so a local database can be loaded again from the CSVs.');
  lines.push('PRAGMA foreign_keys = OFF;');
  lines.push('DELETE FROM church_languages;');
  lines.push('DELETE FROM churches;');
  lines.push('DELETE FROM denomination_bodies;');
  lines.push('DELETE FROM denomination_families;');
  lines.push('PRAGMA foreign_keys = ON;');

  for (const family of directory.families) {
    lines.push(
      `INSERT INTO denomination_families (id, slug, name, blurb, sort_order) VALUES (${sqlString(family.id)}, ${sqlString(family.slug)}, ${sqlString(family.name)}, ${sqlString(family.blurb)}, ${family.sort});`,
    );
  }
  for (const body of directory.bodies) {
    lines.push(
      `INSERT INTO denomination_bodies (id, family_id, slug, name, historically_black_tradition, sort_order) VALUES (${sqlString(body.id)}, ${sqlString(body.familyId)}, ${sqlString(body.slug)}, ${sqlString(body.name)}, ${body.historicallyBlack ? 1 : 0}, ${body.sort});`,
    );
  }
  for (const church of directory.churches) {
    const structured = JSON.stringify(church.serviceTimesStructured);
    lines.push(
      `INSERT INTO churches (
        id, slug, name, status, closed_reason, unpublished_at, campus_name,
        street_address, city, state, postal_code, latitude, longitude, geocode_source, geocoded_at,
        phone, website, family_id, body_id, denomination_original, denomination_evidence,
        service_times_text, service_times_structured, earliest_sunday_time, earliest_sunday_minutes,
        languages_text, proof_quote, proof_url, proof_strength, date_checked, http_status, http_note,
        address_source, phone_source, denomination_source, source, osm_id, checked_with, note,
        kids_youth, worship_style, theology, young_adults, lgbtq_stance, outreach
      ) VALUES (
        ${sqlString(church.id)}, ${sqlString(church.slug)}, ${sqlString(church.name)}, 'open', NULL, NULL, NULL,
        ${sqlString(church.streetAddress)}, ${sqlString(church.city)}, ${sqlString(church.state)}, ${sqlString(church.postalCode)},
        ${sqlNumber(church.latitude)}, ${sqlNumber(church.longitude)}, ${sqlString(church.geocodeSource)}, ${sqlString(church.geocodedAt)},
        ${sqlString(church.phone)}, ${sqlString(church.website)}, ${sqlString(church.familyId)}, ${sqlString(church.bodyId)},
        ${sqlString(church.denominationOriginal)}, ${sqlString(church.denominationEvidence)},
        ${sqlString(church.serviceTimesText)}, ${sqlString(structured)}, ${sqlString(church.earliestSundayTime)}, ${sqlNumber(church.earliestSundayMinutes)},
        ${sqlString(church.languagesText)}, ${sqlString(church.proofQuote)}, ${sqlString(church.proofUrl)}, ${sqlString(church.proofStrength)},
        ${sqlString(church.dateChecked)}, ${sqlNumber(church.httpStatus)}, ${sqlString(church.httpNote)},
        ${sqlString(church.addressSource)}, ${sqlString(church.phoneSource)}, ${sqlString(church.denominationSource)},
        ${sqlString(church.source)}, ${sqlString(church.osmId)}, ${sqlString(church.checkedWith)}, ${sqlString(church.note)},
        NULL, NULL, NULL, NULL, NULL, NULL
      );`,
    );
    for (const language of church.languages) {
      lines.push(
        `INSERT INTO church_languages (church_id, language) VALUES (${sqlString(church.id)}, ${sqlString(language)});`,
      );
    }
  }
  return `${lines.join('\n')}\n`;
}
