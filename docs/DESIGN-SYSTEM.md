# Find a Church design system

The public site is a Sunday morning you can check. A photograph of a white country church at sunrise carries the home page. White cards hold the search and the earliest service. Warm paper carries the pages underneath.

The same type, cards, and buttons run through the map, church, denomination, city, analytics, submit, correction, and about pages. Those pages use a short band of the same photograph, then warm paper. They do not repeat the full hero.

The review desk uses the same type and ink, on paper, without the photograph.

Hard rules:

- No colored left or side accent borders on cards, callouts, charts, or tables. Use a full border, a subtle background, or space.
- No em dashes in interface text.
- No eyebrow label above a heading. A small-caps caption may sit under a time.
- Do not guess a program, a theology, or a stance in order to decorate a card.
- Do not ship the design mockup as the hero. The photograph is generated for this site and is credited on About. It is not a picture of a listed congregation.

## Color

All pairs below are body text or controls on their surface. Each one clears WCAG AA (4.5:1 for text, 3:1 for large text and controls).

| Token | Hex | Role |
| --- | --- | --- |
| `--paper` | `#f6f3ee` | Page background under the photograph |
| `--paper-deep` | `#efeae2` | Chart tracks, hover tints |
| `--surface` | `#ffffff` | Cards, forms, tables |
| `--ink` | `#1c2430` | Primary text, filled buttons, chart fill. 14.8:1 on white, 14.2:1 on paper |
| `--ink-soft` | `#5c564e` | Secondary text. 7.2:1 on white, 6.8:1 on paper |
| `--line` | `#e4dfd6` | Full borders and rules |
| `--line-strong` | `#cfc6b8` | Input borders |
| `--inset` | `#f4f1eb` | Service-time box and quotes |
| `--photo-ink` | `#f7f4ee` | “More Sunday times” on the darkened grass |
| `--danger` | `#8f2d2a` | Error text. 8.2:1 on white |
| `--danger-soft` | `#f8eceb` | Error notice background |
| `--ok-line` | `#d9c7a4` | Success notice border |
| `--placeholder` | `#5e574f` | Placeholder text. 7.0:1 on white |

`--spruce`, `--spruce-deep`, and `--spruce-soft` remain as aliases so older markup resolves: spruce is ink, spruce-soft is the warm inset. Do not paint a green header or a green button.

Map stops are ink. The selected stop is a sunrise bronze (`#8a5a2b`) so the selection is visible. Proof strength is a sentence, not a colored bar.

The theme is light only. The scene is a bright morning outdoors, then a warm room for reading. A dark theme is not part of this system.

Tailwind `primary` and `cream` point at this palette. New CSS should use the variables.

## Type

| Role | Family | Use |
| --- | --- | --- |
| Display | Source Serif 4 | Wordmark, headings, church names, Sunday times |
| Text | Source Sans 3 | Body, navigation, labels, buttons, meta, map popups |

Source Serif 4 is a transitional serif, set at weight 500 for headlines and times. Source Sans 3 is the reading face. Both are self-hosted from `public/fonts` as variable WOFF2 files. Do not load a font stylesheet from a third-party host.

Scale:

- Home title: `clamp(2.7rem, 5vw, 4.7rem)`, weight 500, tracking -0.025em, max about 12ch
- Interior title: `clamp(2.15rem, 3.6vw, 3.35rem)`
- Section title: `clamp(1.6rem, 2.3vw, 2.15rem)`
- Featured Sunday time: `clamp(2.8rem, 4vw, 3.7rem)`
- Body: 1.0625rem / 1.55
- Lede: 1.125rem, max about 68 characters per line
- Small caps caption: 0.72rem, tracking 0.14em, under the time, not above a heading

Headings use `text-wrap: balance`. Body copy uses `text-wrap: pretty`. Times and counts use `font-variant-numeric: tabular-nums`.

## Space, radius, elevation

Spacing steps are 4, 8, 12, 16, 24, 32, 40, and 72. A section sits 4.5rem under the one before it. A heading has more space above it than below it.

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 8px | Badges |
| `--radius-md` | 12px | Inputs, photos, insets |
| `--radius-lg` | 18px | Cards, map, panels |
| Button radius | 10px | Outlined and filled buttons |
| `--shadow` | `0 18px 44px rgba(48, 36, 18, 0.14), 0 2px 8px rgba(48, 36, 18, 0.06)` | Home cards and map popup |

The shadow is offset and soft. Listing cards on later pages use a full border and a lighter shadow. Do not stack a floating card inside a floating card. The service-time inset is a tint, not a second card.

## Photography

The hero is a full-bleed cover image: `public/hero/church-800|1280|1920` in AVIF and WebP, with a JPEG fallback. Interior pages use the sky crop `band-960` and `band-1600`. A light wash sits behind the headline. A darker wash sits behind “More Sunday times” so the light type stays readable. Neither wash is a solid color block behind the text.

`object-position` keeps the church near the middle. Text sits on the sky. The right-hand card sits beside the church.

Credit lives on the About page and in `public/hero/credit.json`.

## Iconography

One drawn mark: a circle on a stem, the map stop, in ink and warm white. It is the favicon. Do not add crosses, doves, stained glass, or emoji. Do not put an icon tile above a heading. Charts use a full track and an ink fill, with the count in text so color is not the only signal.

## Components

**Header.** On the home page the header is transparent over the photograph: serif wordmark at the left, sans navigation centered, “Add a church” as text at the right, and a thin light rule underneath. On other pages the header is warm white, sticky, with the same type and a hairline. The mobile menu opens as a white rounded panel.

**Search card.** White, 18px radius, soft shadow. Labels above the fields. An outlined “Search the map” button submits to `/map`.

**Featured service.** White card on the photograph. The Sunday time is the heading. A small-caps caption sits under it. Then the church name, place and family, a tinted inset of the church’s own service times, the last-checked date, and an outlined “Open the listing” button.

**Time cards.** A row of white cards still on the photograph. Each one shows a time and a church name, and the whole card is the link.

**Filter chips.** Full border, 8px radius, at least 44px tall. The active desk tab fills with ink. Do not use a pill with a colored dash on one side.

**Denomination badges.** Warm inset background, ink text, 8px radius. A closed listing uses the danger colors. The badge is a label, not a rank.

**Church card.** Two columns: the Sunday time, then the name, place, and tradition. Full border. The whole card is the link. A photo, when one exists, spans the top.

**Map pin and popup.** Ink circle markers. The selected pin is sunrise bronze. Hover or focus on a list row enlarges that pin. The popup names the church, the family, the Sunday time, and links to the listing.

**Data table.** Full-width rules under each row, inside a rounded full border. Header buttons sort. Filters have visible labels. The table scrolls sideways on a narrow screen.

**Charts.** A label and a count, then a rounded track. The fill is ink on a warm track. No side stripe on the chart card.

**Forms.** Labels above fields. Errors and success use a full border and a tinted background (`role="alert"` or `role="status"`). The honeypot stays off screen. The submit button is filled ink. Secondary actions are outlined.

**Empty states.** One sentence and, when there is a next step, one link.

**Interior band.** A short crop of the same photograph, fading into the paper, above the page title.

**Admin desk rows.** Same card, badge, and buttons as the public site. The desk has no photograph. Queue counts are the work, so they can be numbers. Public pages do not lead with a row of statistics.

## Motion

One entrance: the home service card moves 10px into place and its shadow settles, with a quick ease-out. It is visible the whole time. Hover on cards, chips, and buttons changes border or background in 160ms. `prefers-reduced-motion: reduce` removes both.

## Accessibility

- Contrast pairs in the table above stay as specified. Do not lighten `--ink-soft` to a decorative gray.
- The headline and lede on the photograph stay dark ink. Light type is only used low on the image, over the dark wash.
- Visible focus: 2px ink outline, 3px offset.
- Skip link, one h1, landmarks, breadcrumb nav, and labels on inputs.
- Buttons and fields are at least 44px tall. Chips that are links meet the same height.
- Placeholder text uses `--placeholder`, darker than a hint gray so it clears 4.5:1.
- Selection, caret, and scrollbar use the ink and warm-paper palette.
- Language of service is a filter and a set of links, not an icon-only cue.
- The historically Black tradition label is text, from the denomination record.

## Voice

Plain English. Name the action: “Search the map”, “Open the listing”, “Suggest a correction”. Say when something was checked. Do not use an em dash. Do not use a slogan that one tradition would recognize as its own.
