---
name: Find a Church
description: A Sunday-morning photograph, white cards, and a service time you can check.
colors:
  paper: "#f6f3ee"
  paper-deep: "#efeae2"
  surface: "#ffffff"
  ink: "#1c2430"
  ink-soft: "#5c564e"
  line: "#e4dfd6"
  line-strong: "#cfc6b8"
  inset: "#f4f1eb"
  photo-ink: "#f7f4ee"
  danger: "#8f2d2a"
  danger-soft: "#f8eceb"
  placeholder: "#5e574f"
  bronze: "#8a5a2b"
typography:
  display:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino, serif"
    fontSize: "3.7rem"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Source Sans 3, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
  caption:
    fontFamily: "Source Sans 3, Segoe UI, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.14em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  button: "10px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "40px"
  section: "72px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "9px 17px"
  button-primary-hover:
    backgroundColor: "#121820"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "9px 17px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "23px"
  inset:
    backgroundColor: "{colors.inset}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 15px"
---

# Design

The visual system for Find a Church. Component notes are in `docs/DESIGN-SYSTEM.md`. Product truth is in `PRODUCT.md` and `docs/PRD.md`.

## Overview

A bright Sunday morning. The home page is a photograph of a white country church on green hills, with the earliest service in a white card. Later pages keep the same serif, the same cards, and a short band of that photograph over warm paper.

## Colors

Ink `#1c2430` on white and on paper `#f6f3ee`. Secondary text is `#5c564e`. Borders are warm stone, not green. The photograph supplies the color. Bronze `#8a5a2b` is only the selected map stop. Danger stays `#8f2d2a` on `#f8eceb`.

Light theme only.

## Typography

Source Serif 4 for the wordmark, headings, church names, and Sunday times, weight 500. Source Sans 3 for navigation, body, labels, and buttons. Both faces are self-hosted. Small caps sit under a time, never above a heading.

## Layout

The home header is transparent on the photograph: wordmark left, navigation centered, “Add a church” right, hairline underneath. The headline and search sit left. The service card sits right. “More Sunday times” is a row of cards still on the photograph. Interior pages put a short photo band under a solid warm header, then the title on paper.

## Elevation & Depth

Cards on the photograph use a soft offset shadow: `0 18px 44px rgba(48, 36, 18, 0.14)`. Listing cards use a full border and a lighter shadow. A light wash protects the headline. A darker wash protects the light type at the bottom of the photograph. The service-time box is a tint, not another floating card.

## Shapes

Corners are 18px on cards, 12px on fields and insets, 10px on buttons, 8px on badges. The favicon is a circle on a stem inside an 8px-radius ink square.

## Components

Outlined buttons for “Open the listing” and “Search the map”. Filled ink buttons for a form submit and the selected desk tab. Chips, tables, and charts use a full border or a full track. Map pins are ink circles.

## Do's and Don'ts

- Do keep the church’s own words and the date they were checked.
- Do keep text on the sky dark, and light type only over the bottom wash.
- Do not use a colored left or side border on a card, callout, chart, or table.
- Do not use an em dash in interface copy.
- Do not put an eyebrow above a heading.
- Do not bring back the spruce header, the green buttons, or a terracotta brochure.
- Do not use the design mockup, a cross, a dove, or stained glass as decoration.
