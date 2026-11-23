# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro 5 on Cloudflare Workers, Tailwind CSS, Leaflet, Cloudflare D1 (`church-directory`), R2 for photos and logos. Public site is live at https://church-directory.bmangum1.workers.dev. Canonical domain is not attached. Do not deploy, change secrets, or change the domain from this work.

## Users

Inferred from the task brief and the Charlotte search-intent file, not from a live interview.

Primary: people moving to Charlotte who need a church they can actually visit. They compare denomination, distance, service time, and whether the listing is trustworthy.

Also: families looking for kids and youth programs; young adults; Spanish and other language speakers; people searching by denomination family or a specific body.

Operators: a small review desk that approves submissions, corrections, photos, and listing checks. Nothing a visitor types becomes public until that desk approves it.

## Product Purpose

A church directory that shows only what a church states on its own site, with the quote and the date of the check on every listing. Charlotte is the pilot (158 verified open churches). Success means a newcomer can find a fitting church, trust the service time, and the same model can roll out to other cities without guessing theology or stance.

## Positioning

Neighboring finders filter churches. This one keeps a copied sentence from the church’s own page, the URL it came from, and the last-verified date. Closed churches stay in the record. Empty filter columns stay empty until the church states the fact.

## Operating Context

Visitors search the map (denomination family, then specific body, then language, place, Sunday time), open a church page, and follow directions or the church site. They can submit a missing church or suggest a correction. Reviewers work the admin desk. Analytics shows how the pilot breaks down. Search intent research lives in `data/charlotte/search_intent_categories.csv`.

## Capabilities and Constraints

- Routes that must keep working: home, `/charlotte`, `/map`, `/church/[slug]`, `/church/[slug]/suggest`, `/denomination`, `/denomination/[family]`, `/denomination/[family]/[body]`, `/city/[slug]`, `/analytics`, `/submit`, `/about`, `/admin` and admin APIs, sitemaps, media.
- D1 bindings, SEO (canonical, JSON-LD, sitemaps), and form posts stay as they are.
- Required filters now: denomination (family then body), location, service time, language. Kids and youth, worship style, theology, young adults, LGBTQ stance, and outreach are columns ready for later. Fill them only from the church’s own words.
- Trust: every listing shows proof and a last-verified date when a check exists.
- Voice: plain English. No em dashes in interface text. No churchy clip art. No colored left or side accent borders on cards, callouts, charts, or tables.
- Money path is room to keep, not a live checkout: featured or claimed listings, and a Church Pro tie-in to church back-office software.
- National rollout comes after Charlotte holds.

## Brand Commitments

Name: Find a Church. Warm, trustworthy, and welcoming across traditions. Not the stationery of one denomination. Not clip-art crosses, stained glass, or doves. The public look is a Sunday-morning photograph: golden light, white cards, Source Serif 4 for titles, Source Sans 3 for reading. The spruce timetable and the terracotta brochure are both retired.

## Evidence on Hand

- `data/charlotte/churches_verified.csv` and D1 seed: 158 verified churches, 15 denomination families, 67 bodies.
- `data/charlotte/search_intent_categories.csv`: denomination ranks first, then location, kids and youth, worship style, service times, language.
- Proof quotes, proof URLs, proof strength, and `date_checked` on listings.
- No customer logos, testimonials, or pricing pages. Do not invent them.

## Product Principles

1. Show the church’s words, then the date they were checked.
2. Denomination is the first cut, place is the second, and a guess is not a filter.
3. A closed church stays findable as a record. A form does not publish itself.
4. The directory should feel usable by any tradition, including people who are new to church language.
5. Charlotte is a real city pilot, not a national claim.

## Accessibility & Inclusion

WCAG AA contrast for text and controls. Keyboard access, visible focus, labeled forms, and a skip link. Motion must respect reduced-motion. Language of service is a first-class filter, not a footnote. Historically Black tradition is a denomination tag, not a guess about who attends.
