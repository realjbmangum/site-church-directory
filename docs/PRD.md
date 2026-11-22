# Find a Church: product requirements

Charlotte is the pilot of a church directory. The public site is an Astro app on Cloudflare Workers. Listings live in D1. Photos and logos, when a reviewer approves them, live in R2. This document is the product brief for the pilot and for the room we keep as it grows.

## Audience

People who need a church they can actually visit, mostly in and around Charlotte.

- Someone who just moved and is comparing churches before Sunday.
- Families who care whether there is something for kids or youth.
- Young adults looking for people their own age.
- Spanish speakers, and speakers of other languages, looking for a service they can follow.
- Anyone who already knows the tradition they want, from a broad family such as Baptist down to a specific body such as a diocese or convention.

A small review desk is the other audience. Submissions, corrections, photos, and listing checks do not change the public site until someone approves them.

## Jobs to be done

1. Find a church that matches the tradition I am looking for.
2. See which of those churches are near me, in my town or ZIP.
3. Know when I can show up, in the church’s own words, with a date for when that was checked.
4. Tell whether a service is in my language.
5. Leave a correction, or add a church that is missing, without publishing it myself.
6. For the people running the directory: see what the pilot contains, and approve or reject a change without losing a closed church from the record.

## Search intent

Source: `data/charlotte/search_intent_categories.csv`. Ranks mix Reddit threads, Google autocomplete, review language, and what other church finders already filter on.

Required, and how the pilot treats them:

| Rank | What people search | What the pilot does |
| --- | --- | --- |
| 1 | Denomination and tradition | Map filters go family first, then the specific body. Hubs exist for both. |
| 2 | Location and distance | Map, city pages, ZIP and city text, Charlotte metro page. |
| 3 | Kids and youth | Column exists. Empty until the church states it. Not a live filter. |
| 4 | Worship style | Column exists. Empty until the church states it. Not a live filter. |
| 5 | Service times and days | Sunday time buckets on the map and on church pages. |
| 6 | Language of service | Language filter on the map. Home links to non-English languages. |

Optional, kept as listing fields rather than guessed labels:

| Rank | Topic | Rule |
| --- | --- | --- |
| 7 | Theology, conservative to progressive | Link the church’s own statement later. Do not score a church on a scale. |
| 8 | Outreach and serving | Listing field, only from the church’s own words. |
| 9 | Young adults and singles | Filter flag later, only when stated. |
| 10 | LGBTQ stance | Only when the church says so in public. Never inferred. |

Lower ranks (sacraments, small groups, livestream, size, accessibility, recovery) stay off the filters until a source exists. Welcome, preaching quality, and music quality are skipped as filters because they are opinions. Politics, prosperity teaching, and dress code are not labels we apply.

The historically Black tradition tag comes from the denomination body, not from a guess about who attends.

## Page inventory

| Page | Route | Job |
| --- | --- | --- |
| Home | `/` | Search, and show that a listing is checked. |
| Metro | `/charlotte` | The pilot’s towns and a sample of churches. |
| Map | `/map` | Family filter, then body, then place, language, and Sunday time. Leaflet map and a list. |
| Church | `/church/[slug]` | Times, proof quote, last verified date, denomination, languages, visit details. |
| Correction | `/church/[slug]/suggest` | A review row. The public listing does not change here. |
| Denomination index | `/denomination` | Families, including ones with no Charlotte church yet. |
| Family hub | `/denomination/[family]` | Bodies in that family, then churches. |
| Body hub | `/denomination/[family]/[body]` | Churches in one body. |
| City hub | `/city/[slug]` | Churches in one town. |
| Analytics | `/analytics` | Counts by family, city, language, and Sunday time, plus the search-intent table. |
| Submit | `/submit` | Add a missing church. Review before it appears. |
| About | `/about` | How a check works, and what we do not guess. |
| Admin desk | `/admin` | Submissions, edits, checks, inbox. Closed unless Cloudflare Access is in front of it in production. |

Sitemaps, canonical URLs, and Church JSON-LD stay in place. Closed church pages stay reachable and are marked noindex.

## SEO and AEO

Search: each public page has one clear topic, a title, a description, and a canonical URL. Church pages are `Church` structured data with address, geo, phone, and the denomination we actually know. Hubs exist for the queries people type: denomination, city, and the metro.

Answer engines: a listing should be quotable without a scrape of the church site. The page says the service time, the tradition, the town, and that the quote was copied on a specific date. About states the rule in plain language: we do not infer theology, stance, or programs.

Filtered map URLs are noindex so combinations do not compete with the hubs.

## Trust model

Every checked listing shows three things together:

1. A short quote copied from the church’s own page.
2. A link to that page.
3. The date of the check.

Proof strength is visible. “Strong” means the quote matches a service time on the church site. “Needs another look” means a person should read the source again. A listing that arrived through the desk without a quote says it has not been checked yet.

A form does not publish itself. Approve writes the listing. Reject or dismiss does not. A closed church stays in the database and drops off the map and the open lists. The page says it is marked closed.

## Money path (room to keep, not built)

Nothing on the pilot is for sale. The layout and data model should still leave room for two later offers:

- Featured or claimed listings. A church can claim its page and, if we ever charge, pay to be marked as claimed or to add a photo the desk still has to approve. A paid flag never replaces the proof quote or the last-verified date, and it never changes sort order inside a denomination filter without a label a visitor can see.
- Church Pro. A tie-in to church back-office software (members, giving, check-in). The directory sends a church to that product. It does not become the product. The public page stays a listing.

No prices, checkout, or accounts are in this pilot.

## Success metrics

For the Charlotte pilot:

- Share of open churches with a proof URL and a last-checked date. The seed started with checks on the verified file.
- Searches that use a denomination family, then a body. That is the top intent.
- Map filters that lead to a church page, then to directions or the church’s site.
- Correction and submission volume, and the share the desk approves. A flood of rejects means the form is unclear or the data is being gamed.
- Time from a public correction to a new check date on that listing.
- Zero public listings whose kids, worship, theology, young adult, LGBTQ, or outreach fields were filled without a source sentence.

Later, if the directory is a business: claimed pages, and Church Pro referrals that a church actually starts. Those are not pilot goals.

## National rollout

Charlotte proves the loop: import, check against the church site, publish with a quote and a date, accept corrections through a desk.

A next city copies that loop. It does not copy Charlotte’s church list.

1. Pick a metro with a definable set of towns, the way this pilot names Matthews, Mint Hill, Huntersville, Cornelius, Davidson, and Pineville.
2. Reuse the denomination taxonomy. Families with zero churches stay in the list so the next city does not invent a second set of names.
3. Load churches only with a source. Empty optional columns stay empty.
4. Geocode, then open the same page types: metro, map, church, family, body, city, analytics.
5. Keep one desk. Access stays in front of `/admin`.
6. Add the city to the sitemap index. Do not claim a national directory until more than one metro is checked the same way.

The domain, remote database, and production deploy stay with Brian. This repository does not attach a domain or write to remote D1.
