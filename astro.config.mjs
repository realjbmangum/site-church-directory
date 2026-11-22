import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// TODO(brian): This host is a placeholder. Do not buy or attach a domain from
// this repo. When you choose the live domain, change `site` and redeploy.
const site = 'https://findachurch.directory';

export default defineConfig({
  site,
  trailingSlash: 'never',
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/+$/, '') || '/';
        if (path === '/admin' || path.startsWith('/admin/')) return false;
        if (path.startsWith('/api')) return false;
        if (path === '/404') return false;
        return true;
      },
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/\/+$/, '') || '/';
        if (path === '/') {
          item.priority = 1;
          item.changefreq = 'weekly';
        } else if (path.startsWith('/churches/')) {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        } else if (path.startsWith('/denominations') || path.startsWith('/cities') || path === '/charlotte') {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        }
        return item;
      },
    }),
  ],
});
