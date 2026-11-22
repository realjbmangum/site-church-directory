/**
 * Fail the build if the sitemap index or the church URLs are missing.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const indexPath = join(dist, 'sitemap-index.xml');
if (!existsSync(indexPath)) {
  console.error('sitemap-index.xml was not written');
  process.exit(1);
}
const index = readFileSync(indexPath, 'utf8');
if (!index.includes('sitemap')) {
  console.error('sitemap index is empty');
  process.exit(1);
}
const files = readdirSync(dist).filter((name) => /^sitemap-\d+\.xml$/.test(name));
const xml = files.map((name) => readFileSync(join(dist, name), 'utf8')).join('\n');
const churchUrls = xml.match(/<loc>[^<]*\/churches\/[^<]+<\/loc>/g) || [];
if (churchUrls.length < 158) {
  console.error(`Expected at least 158 church URLs in the sitemap, found ${churchUrls.length}`);
  process.exit(1);
}
const required = ['/charlotte', '/map', '/denominations', '/analytics', '/cities/charlotte'];
for (const path of required) {
  if (!xml.includes(path)) {
    console.error(`Sitemap is missing ${path}`);
    process.exit(1);
  }
}
if (xml.includes('/admin')) {
  console.error('Sitemap includes the admin desk');
  process.exit(1);
}
console.log(`Sitemap ok: ${churchUrls.length} church URLs.`);
