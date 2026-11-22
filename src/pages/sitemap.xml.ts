import type { APIRoute } from 'astro';
import { canonicalUrl, sitemapIndex, xmlResponse } from '../lib/site';

export const GET: APIRoute = () => {
  return xmlResponse(sitemapIndex([
    canonicalUrl('/sitemap-pages.xml'),
    canonicalUrl('/sitemap-churches.xml'),
    canonicalUrl('/sitemap-cities.xml'),
    canonicalUrl('/sitemap-denominations.xml'),
  ]));
};
