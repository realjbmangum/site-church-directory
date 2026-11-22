# Find a Church

Charlotte pilot of a church directory. Astro on Cloudflare Pages, with D1 for the review desk and a separate email worker. Public pages are built from the CSVs in `data/charlotte/`. A church changes only when a desk row is approved.

The site host in `astro.config.mjs` is a placeholder. Do not buy or attach a domain from this repo.

## Run it locally

```bash
npm install
npm test
npm run dev
```

Open http://localhost:4321. The dev server reads `data/charlotte/*.csv` and `data/charlotte/geocodes.json`. You do not need Cloudflare credentials for the public pages.

Geocodes were filled with the free US Census Bureau geocoder, and OpenStreetMap Nominatim for the few addresses Census missed. To refresh them:

```bash
npm run geocode
```

That script does not call a paid API.

## Local database and desk

The desk and the two public forms write to D1. Local only:

```bash
cp .dev.vars.example .dev.vars
npm run db:setup
npm run build
npm run pages:dev
```

`db:setup` applies `migrations/0001_init.sql` to a **local** D1 database and loads the CSV seed. It does not create a remote database.

`ADMIN_DEV_BYPASS=1` in `.dev.vars` opens `/api/admin` on localhost only. Leave that variable off the Cloudflare project.

Then:

- http://localhost:8788/submit creates a submission row
- http://localhost:8788/suggest-edit creates an edit row
- http://localhost:8788/admin approves or rejects those rows

Approving a submission inserts a church. Approving an edit or a listing check writes the stored fields. Rejecting does not. Churches are not deleted. The public HTML updates on the next `npm run build`.

## What has to be provisioned before this is live

Nothing here creates production Cloudflare resources.

1. **D1 database** named `church-directory-db`. Put its id in `wrangler.jsonc` and in `workers/email-inbox/wrangler.jsonc`. The ids in those files are placeholders. Do not point them at the potty or record store databases. Apply `migrations/0001_init.sql` to that database, then load `data/build/seed.sql` from `npm run seed`.
2. **Pages project** for this repo, with the `DB` binding on production and preview, and `CF_ACCESS_TEAM_DOMAIN` set to the Access team host (for example `yourteam.cloudflareaccess.com`). Do not set `ADMIN_DEV_BYPASS` there.
3. **Cloudflare Access** application covering `/admin` and `/api/admin`.
4. **Domain**, when you want one. Change `site` in `astro.config.mjs` and the Sitemap line in `public/robots.txt`. This repo does not register or attach a domain.
5. **Email Routing**, later. `workers/email-inbox/` stores mail in `inbox_messages` and does not update churches. Run `npm install` in that folder before a deploy. The route is staged in `email-routing.rule.json` and is not applied. Set `BACKUP_FORWARD_TO` to a verified destination before turning the route on. Deploy that worker yourself when you are ready. Do not add a routing address list to its Wrangler config before that.

Optional later: Turnstile, and a mail provider if you want the desk to send email. Forms work without either. They only store the desk row.

## Layout

- `data/charlotte/` seed CSVs and geocodes
- `shared/` directory builder, filters, and the field allowlists
- `migrations/0001_init.sql` D1 schema
- `src/pages/` public pages, including the map, analytics, and church pages
- `functions/` submit, suggest-edit, and the admin API
- `workers/email-inbox/` inbound mail worker with its own table
