/**
 * Load the Charlotte CSVs into local D1.
 * Refuses --remote. Brian runs the remote migration and seed after review.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSeedSql, loadDirectory } from './directory.ts';

if (process.argv.includes('--remote')) {
  console.error('Refusing to seed the remote D1 database. Apply it only after Brian approves the pull request.');
  process.exit(1);
}

const root = join(import.meta.dirname, '..');
const seed = loadDirectory(join(root, 'data/charlotte'));
const sql = buildSeedSql(seed);
mkdirSync(join(root, '.tmp'), { recursive: true });
const file = join(root, '.tmp/seed.sql');
writeFileSync(file, sql);

const withCoords = seed.churches.filter((church) => church.latitude != null).length;
console.log(
  `Seeding ${seed.churches.length} churches, ${seed.families.length} families, ${seed.bodies.length} bodies, ${seed.cities.length} cities. Coordinates on ${withCoords}.`,
);

execFileSync(
  'npx',
  [
    'wrangler',
    'd1',
    'execute',
    'church-directory',
    '--local',
    '--persist-to',
    '.wrangler/state',
    '--file',
    file,
  ],
  { cwd: root, stdio: 'inherit' },
);
