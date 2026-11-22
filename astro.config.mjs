import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://findachurch.directory',
  trailingSlash: 'never',
  output: 'server',
  // A memory driver keeps Astro from requiring a KV namespace this project does not have.
  // The site does not read or write sessions.
  session: {
    driver: 'memory',
  },
  redirects: {
    '/churches': '/map',
    '/denominations': '/denomination',
    '/add-church': '/submit',
  },
  integrations: [tailwind()],
  adapter: cloudflare({
    imageService: 'passthrough',
    workerEntryPoint: {
      path: 'src/worker.ts',
      namedExports: ['createExports'],
    },
    platformProxy: {
      enabled: true,
      configPath: './wrangler.jsonc',
      // Wrangler CLI stores local D1 under .wrangler/state/v3. Point the dev proxy at that same root.
      persist: { path: '.wrangler/state/v3' },
    },
  }),
  vite: {
    resolve: {
      alias: {
        '@shared': new URL('./shared', import.meta.url).pathname,
      },
    },
  },
});
