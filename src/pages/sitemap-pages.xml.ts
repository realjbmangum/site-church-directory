import type { APIRoute } from 'astro';
import { canonicalUrl, sitemapDocument, xmlResponse, type SitemapUrl } from '../lib/site';

const PATHS = ['/', '/charlotte', '/map', '/denomination', '/analytics', '/about', '/submit'];

export const GET: APIRoute = () => {
  const urls: SitemapUrl[] = PATHS.map((path) => ({ loc: canonicalUrl(path) }));
  return xmlResponse(sitemapDocument(urls));
};
