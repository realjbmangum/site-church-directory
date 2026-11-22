# Find a Church

Charlotte pilot of a church directory. Listings are checked against each church’s own website. The public site reads Cloudflare D1. Photos and logos go in R2. A review desk is the only way a public listing changes.

This repo does not deploy, attach a domain, or write to the remote database.

## Run it locally

```bash
npm install
npm run db:setup
npm run dev
```

Open http://localhost:4321

`db:setup` applies `migrations/0001_init.sql` to local D1 only, then loads `data/charlotte/`. The dev server reads that same local database (`.wrangler/state/v3`). Coordinates come from `data/charlotte/geocodes.json`, built with the free US Census Bureau geocoder:

```bash
npm run db:geocode
```

The admin desk is open on localhost while `astro dev` is running. A production build does not open it. Cloudflare Access has to sit in front of `/admin` and `/api/admin`, and `CF_ACCESS_TEAM_DOMAIN` has to be set, or those routes stay closed.

## What is in the pilot

- 158 verified churches, 15 denomination families, 67 bodies
- Home, Charlotte metro, map (Leaflet and OpenStreetMap), church pages, denomination hubs, city pages, and an analytics page
- Submit a church and suggest a correction. Both create desk rows.
- Admin desk: submissions, suggested edits, listing checks. Approve writes the listing. Reject or dismiss does not.
- Churches are `open` or `closed`. Rows are not deleted.
- Empty columns for later filters: kids and youth, worship style, theology, young adults, LGBTQ stance, outreach
- Sitemap index, canonical URLs, Church JSON-LD, robots.txt
- A separate email inbox worker at `workers/email-inbox`. It writes only to `inbox_messages`.

## Before this can go live

Brian still has to approve:

1. Apply the D1 migration and seed to the remote `church-directory` database. Do not use `--remote` until then. `scripts/seed.ts` refuses `--remote`.
2. Cloudflare Access policy for `/admin`, `/admin/*`, `/api/admin`, and `/api/admin/*`, plus the `CF_ACCESS_TEAM_DOMAIN` variable.
3. The domain for https://findachurch.directory (or whichever host should be canonical).
4. Email routing for the inbox worker. See `workers/email-inbox/ACTIVATION.md`. Do not deploy that worker until the rule is chosen.
5. A production deploy of the site worker. This pull request does not deploy.

R2 bucket `church-directory-assets` is bound as `ASSETS_BUCKET`. It stays empty until a photo is approved on the desk.
