/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    cfUser?: { email?: string };
  }
}

interface Env {
  DB: D1Database;
  ASSETS_BUCKET: R2Bucket;
  CF_ACCESS_TEAM_DOMAIN?: string;
  ADMIN_DEV_BYPASS?: string;
}
