import type { APIRoute } from 'astro';
import { all, getDb } from '../lib/db';
import { canonicalUrl, sitemapDocument, xmlResponse } from '../lib/site';

export const GET: APIRoute = async ({ locals }) => {
  const db = getDb(locals);
  const rows = db
    ? await all<{ slug: string }>(
        db,
        `SELECT ci.slug FROM cities ci
         WHERE EXISTS (SELECT 1 FROM churches c WHERE c.city_id = ci.id AND c.status = 'open')
         ORDER BY ci.slug`,
      )
    : [];
  return xmlResponse(sitemapDocument([
    { loc: canonicalUrl('/charlotte') },
    ...rows.map((row) => ({ loc: canonicalUrl(`/city/${row.slug}`) })),
  ]));
};
