import type { APIRoute } from 'astro';
import { canonicalUrl, sitemapDocument, xmlResponse } from '../lib/site';
import { getDb } from '../lib/db';
import { listAttributes, toSearchable } from '../lib/attributes';
import { listOpenChurches } from '../lib/queries';
import { churchTypeSlug } from '@shared/church-types';
import { CHURCH_TYPE_ORDER } from '@shared/church-type-data';

export const GET: APIRoute = async ({ locals }) => {
  const db = getDb(locals);
  const churches = db ? await listOpenChurches(db) : [];
  const attributes = db ? await listAttributes(db) : { rows: [], ready: false };
  const byId = new Map(attributes.rows.map((row) => [row.church_id, row]));
  const used = new Set(churches.map((church) => toSearchable(church, byId.get(church.id)).typeSlug));
  const types = CHURCH_TYPE_ORDER.filter((name) => used.has(churchTypeSlug(name)));
  return xmlResponse(sitemapDocument([
    { loc: canonicalUrl('/denomination') },
    ...types.map((name) => ({ loc: canonicalUrl(`/denomination/${churchTypeSlug(name)}`) })),
  ]));
};
