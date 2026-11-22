import type { APIRoute } from 'astro';
import { getDb } from '../lib/db';
import { canonicalUrl, sitemapDocument, xmlResponse } from '../lib/site';
import { all } from '../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  const db = getDb(locals);
  const rows = db
    ? await all<{ slug: string; date_checked: string | null }>(
        db,
        `SELECT slug, date_checked FROM churches WHERE status = 'open' ORDER BY slug`,
      )
    : [];
  return xmlResponse(sitemapDocument(rows.map((row) => ({
    loc: canonicalUrl(`/church/${row.slug}`),
    lastmod: row.date_checked,
  }))));
};
