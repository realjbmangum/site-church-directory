/**
 * Build the public directory from the Charlotte CSVs and write a local D1 seed.
 * Does not talk to Cloudflare.
 *
 *   node scripts/seed.mjs
 *   node scripts/seed.mjs --sql
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDirectory, seedSql } from '../shared/directory.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'data', 'build');
const directory = buildDirectory();
mkdirSync(outDir, { recursive: true });

const snapshot = {
  generatedAt: directory.generatedAt,
  checkedOn: directory.checkedOn,
  counts: directory.counts,
  families: directory.families.map((family) => ({
    slug: family.slug,
    name: family.name,
    churchCount: family.churchCount,
  })),
  cities: directory.cities,
};
writeFileSync(join(outDir, 'summary.json'), `${JSON.stringify(snapshot, null, 2)}\n`);

if (process.argv.includes('--sql')) {
  const sqlPath = join(outDir, 'seed.sql');
  writeFileSync(sqlPath, seedSql(directory));
  console.log(`Wrote ${sqlPath}`);
}

console.log(
  `Charlotte pilot: ${directory.counts.churches} churches, ${directory.counts.families} families with listings, ${directory.counts.cities} cities, ${directory.counts.geocoded} geocoded.`,
);
