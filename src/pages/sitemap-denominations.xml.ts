import type { APIRoute } from 'astro';
import { all, getDb } from '../lib/db';
import { canonicalUrl, sitemapDocument, xmlResponse } from '../lib/site';

export const GET: APIRoute = async ({ locals }) => {
  const db = getDb(locals);
  const families = db
    ? await all<{ slug: string }>(db, `SELECT slug FROM denomination_families ORDER BY sort_order`)
    : [];
  const bodies = db
    ? await all<{ family_slug: string; slug: string }>(
        db,
        `SELECT f.slug AS family_slug, b.slug AS slug
         FROM denomination_bodies b
         JOIN denomination_families f ON f.id = b.family_id
         WHERE EXISTS (SELECT 1 FROM churches c WHERE c.denomination_body_id = b.id AND c.status = 'open')
         ORDER BY f.sort_order, b.name`,
      )
    : [];
  return xmlResponse(sitemapDocument([
    { loc: canonicalUrl('/denomination') },
    ...families.map((row) => ({ loc: canonicalUrl(`/denomination/${row.slug}`) })),
    ...bodies.map((row) => ({ loc: canonicalUrl(`/denomination/${row.family_slug}/${row.slug}`) })),
  ]));
};
