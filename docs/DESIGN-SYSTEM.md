# Find a Church design system

The public site is a Sunday timetable, not a church brochure. Spruce is the destination color. Cool paper is the reading surface. A listing leads with a service time, then the church’s own words and the date we checked them.

Warmth comes from the green and the plain language, not from cream paper, terracotta, or clip-art crosses. The same system covers every tradition in the taxonomy.

Hard rules:

- No colored left or side accent borders on cards, callouts, charts, or tables. Use a full border, a subtle background, or space.
- No em dashes in interface text.
- No eyebrow label above a heading.
- Do not guess a program, a theology, or a stance in order to decorate a card.

## Color

All pairs below are body text or controls on their surface. Each one clears WCAG AA (4.5:1 for text, 3:1 for controls).

| Token | Hex | Role |
| --- | --- | --- |
| `--paper` | `#f2f4f1` | Page background |
| `--surface` | `#ffffff` | Cards, forms, tables |
| `--ink` | `#14211c` | Primary text. 15.0:1 on paper, 16.6:1 on white |
| `--ink-soft` | `#3a4a43` | Secondary text. 8.5:1 on paper, 9.4:1 on white |
| `--line` | `#d3dad5` | Full borders and rules |
| `--line-strong` | `#b7c2bb` | Input borders |
| `--spruce` | `#0d4f3c` | Header, primary button, chart fill, focus |
| `--spruce-deep` | `#08382b` | Hover, large times, links |
| `--spruce-soft` | `#e7f3ee` | Badges, chart tracks, success notices |
| `--on-spruce` | `#f4faf7` | Text on spruce. 9.0:1 |
| `--on-spruce-soft` | `#d7efe6` | Secondary text on spruce. 7.9:1 |
| `--danger` | `#8f2d2a` | Error text. 8.2:1 on white |
| `--danger-soft` | `#f8eceb` | Error notice background |
| `--ok-line` | `#b7d9cb` | Success notice border |

Do not put gray text on the spruce header. Secondary copy there uses `--on-spruce-soft`, which is a light tint of the same green.

Map stops use spruce. There is no second pin color. Proof strength is a sentence, not a colored bar.

The theme is light only. The scene is a bright room or a sidewalk in the afternoon. A dark theme is not part of this system.

Tailwind `primary` and `cream` are mapped to these values so older utilities stay on the palette. New CSS should use the variables.

## Type

| Role | Family | Use |
| --- | --- | --- |
| Display | Familjen Grotesk | Headings, times, navigation, buttons, table headers |
| Text | Atkinson Hyperlegible | Body, quotes, form values, map popups |

Atkinson Hyperlegible is the reading face because listings are something people scan and then read closely. Familjen Grotesk is the timetable face: the Sunday time is set large, bold, and tabular.

Scale:

- Page title: `clamp(2.15rem, 4.2vw, 3.4rem)`, weight 700, tracking -0.03em
- Section title: `clamp(1.45rem, 2vw, 1.85rem)`
- Card title: 1.2rem
- Featured Sunday time: `clamp(2.4rem, 4vw, 3.2rem)`
- Body: 1.0625rem / 1.55
- Lede: 1.125rem, max 68 characters per line

Headings use `text-wrap: balance`. Body copy uses `text-wrap: pretty`. Times and counts use `font-variant-numeric: tabular-nums`.

Load only the weights in use: Familjen 500, 600, 700, and Atkinson 400 and 700, plus italics.

## Space, radius, elevation

Spacing steps are 4, 8, 12, 16, 24, 32, 40, and 72. A section sits 4.5rem under the one before it. A heading has more space above it than below it.

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 6px | Badges |
| `--radius-md` | 8px | Inputs, buttons, photos |
| `--radius-lg` | 12px | Cards, map, panels |
| `--shadow` | `0 10px 28px rgba(20, 33, 28, 0.1)` | Home proof card and map popup only |

Cards on listing pages use a border, not a shadow. Do not stack a card inside a card.

## Iconography

One drawn mark: a circle on a stem, the map stop, in spruce and off-white. It is the favicon. Do not add crosses, doves, stained glass, or emoji. Do not put an icon tile above a heading. Charts use a full track and a spruce fill, with the count in text so color is not the only signal.

## Components

**Search bar.** White panel, full border, labels above the fields, spruce button at the end. On the home page it sits in the spruce band and submits to `/map`.

**Filter chips.** Full border, 6px radius, at least 44px tall. The active desk tab fills with spruce. Do not use a pill with a colored dash on one side.

**Denomination badges.** Spruce-soft background, spruce-deep text, 6px radius. A closed listing uses the danger colors instead. The badge is a label, not a rank.

**Church card.** Two columns: the Sunday time, then the name, place, and tradition. Full border. The whole card is the link. A photo, when one exists, spans the top.

**Map pin and popup.** Spruce circle markers. Hover or focus on a list row enlarges that pin. The popup names the church, the family, the Sunday time, and links to the listing. The list row repeats the time, name, and place.

**Data table.** Full-width rules under each row. Header buttons sort. Filters have visible labels. The table scrolls sideways on a narrow screen instead of squeezing columns to unreadability.

**Charts.** A label and a count, then a rounded track. The fill is spruce on a spruce-soft track. No side stripe on the chart card.

**Forms.** Labels above fields. Errors and success use a full border and a tinted background (`role="alert"` or `role="status"`). The honeypot stays off screen.

**Empty states.** One sentence and, when there is a next step, one link. Examples: a family with no churches yet, a missing database, a page that is not in the directory.

**Admin desk rows.** Same card, badge, and buttons as the public site. The desk header is paper, not the spruce marketing band. Queue counts are the work, so they can be numbers. Public pages do not lead with a row of statistics.

## Motion

One entrance: the home proof card moves 8px into place with a quick ease-out. It is visible the whole time. Hover on cards, chips, and buttons changes border or background in 160ms. `prefers-reduced-motion: reduce` removes both.

## Accessibility

- Contrast pairs in the table above stay as specified. Do not lighten `--ink-soft` to a decorative gray.
- Visible focus: 2px spruce outline, 3px offset.
- Skip link, one h1, landmarks, breadcrumb nav, and labels on inputs.
- Buttons and fields are at least 44px tall. Chips that are links meet the same height.
- Placeholder text uses `--placeholder` (`#5d6e66`), 5.4:1 on white, lighter than body text so a hint does not look filled in.
- Selection, caret, and scrollbar use the spruce and paper palette.
- Language of service is a filter and a set of links, not an icon-only cue.
- The historically Black tradition label is text, from the denomination record.

## Voice

Plain English. Name the action: “Search the map”, “Open the listing”, “Suggest a correction”. Say when something was checked. Do not use an em dash. Do not use a slogan that one tradition would recognize as its own.
