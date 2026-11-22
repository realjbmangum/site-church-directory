# Design

The visual system for Find a Church. The longer component notes are in `docs/DESIGN-SYSTEM.md`. Product truth is in `PRODUCT.md` and `docs/PRD.md`.

## World

A Sunday timetable. Spruce destination band, cool paper page, white panels with full borders. Familjen Grotesk for titles and times. Atkinson Hyperlegible for reading. No cream brochure, no terracotta, no church clip art, no side accent bars.

## Tokens

```css
:root {
  --paper: #f2f4f1;
  --surface: #ffffff;
  --ink: #14211c;
  --ink-soft: #3a4a43;
  --line: #d3dad5;
  --line-strong: #b7c2bb;
  --spruce: #0d4f3c;
  --spruce-deep: #08382b;
  --spruce-soft: #e7f3ee;
  --on-spruce: #f4faf7;
  --on-spruce-soft: #d7efe6;
  --danger: #8f2d2a;
  --danger-soft: #f8eceb;
  --focus: #0d4f3c;
  --shadow: 0 10px 28px rgba(20, 33, 28, 0.1);
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --font-display: "Familjen Grotesk", "Avenir Next", "Segoe UI", sans-serif;
  --font-text: "Atkinson Hyperlegible", "Segoe UI", sans-serif;
}
```

Source of the variables: `src/styles/global.css`. Tailwind `primary` and `cream` point at the same palette in `tailwind.config.mjs`.

## Rules that are not optional

- Full borders, tints, or space. Never a colored left or side border on a card, callout, chart, or table.
- No em dashes in interface text.
- No eyebrow above a heading.
- Light theme only.
