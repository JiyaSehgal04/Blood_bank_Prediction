# UI Dark Redesign — Design Spec
**Date:** 2026-03-28
**Branch:** feature-ui-dark
**Status:** Approved

## Overview

Full dark-mode reskin of the Blood Bank frontend. Keep all existing logic, routing, and data flows intact. Replace the warm cream/olive/forest-green palette with a Deep Space dark theme (near-black navy + electric cyan). No new pages, no new features — visual polish only.

---

## Color Palette

| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#0a0e1a` | Page background |
| `bg-card` | `#0f1629` | Card, panel backgrounds |
| `bg-sidebar` | `#080c18` | Sidebar, top bar |
| `bg-row-alt` | `#0d1424` | Alternating table rows |
| `border-subtle` | `#1e2d47` | Card borders, dividers |
| `accent` | `#00d4ff` | Primary cyan accent |
| `accent-dim` | `#38bdf8` | Secondary cyan, chart lines |
| `accent-soft` | `#0ea5e9` | Tertiary chart series |
| `text-primary` | `#e2e8f8` | Headings, primary text |
| `text-secondary` | `#6b8cba` | Labels, subtitles |
| `text-muted` | `#3d5275` | Placeholder, timestamps |
| `success` | `#10d48e` | Positive values, inserted count |
| `error` | `#ff4757` | Error, critical alerts |
| `warning` | `#f59e0b` | Medium urgency, warnings |

All colors used inline via Tailwind arbitrary values (no config changes required).

---

## Typography

No font changes. Existing fonts work perfectly in dark mode:
- **Manrope** — headlines (`font-headline`)
- **Inter** — body text
- **JetBrains Mono** — data values (`mono-data`)

Module labels (e.g. `SYSTEM_MODULE / ACCESS_CONTROL`) stay as mono-uppercase, change color to `#00d4ff`.

---

## Components

### Sidebar (`Layout.tsx`)
- Background: `#080c18`
- Logo text: `#e2e8f8`, `HEMA_STRAT` unchanged
- Status pulse dot: keep cyan `#00d4ff` (already greenish, change to pure cyan)
- **Active nav item:** `bg-[#00d4ff]/10` + `border-l-2 border-[#00d4ff]` + `text-[#00d4ff]`
- **Inactive nav item:** `text-[#3d5275]` → `text-[#e2e8f8]` on hover, `hover:bg-[#1e2d47]/40`
- Footer sign-out: `text-[#3d5275]` → `text-[#e2e8f8]` on hover

### Top Bar (`Layout.tsx`)
- Background: `#080c18/90` with `backdrop-blur-md`
- Border bottom: `#1e2d47`
- Notifications icon: `text-[#3d5275]` → `text-[#00d4ff]` on hover
- Avatar circle: `#1e2d47` bg with `#00d4ff` text

### Cards (all pages)
- Background: `#0f1629`
- Border: `border border-[#1e2d47]`
- Hover: `hover:border-[#00d4ff]/30 hover:shadow-[0_0_20px_#00d4ff10]`
- Rounded: keep `rounded` (4px — tight, not bubbly)

### KPI Cards (`Dashboard.tsx`)
- All: `#0f1629` bg with `#1e2d47` border
- Top accent bar: `border-t-2 border-[#00d4ff]` on the featured card (Available Units)
- Accent card (was `#1b1c15`): change to `bg-[#0d1932] border-[#00d4ff]/30`
- Icon color: `#00d4ff`
- Value color: `#e2e8f8`
- Sub-label: `#3d5275`

### Tables (all pages)
- Header bg: `#080c18`
- Header text: `#3d5275` uppercase mono
- Row: `#0f1629` / `#0d1424` alternating
- Row hover: `hover:bg-[#1e2d47]/40`
- Border: `#1e2d47/40`

### Buttons
- **Primary** (submit, upload): `bg-[#00d4ff] text-[#0a0e1a] font-bold` + `hover:shadow-[0_0_16px_#00d4ff40]`
- **Secondary/outlined**: `border border-[#1e2d47] text-[#e2e8f8]` + `hover:border-[#00d4ff] hover:text-[#00d4ff]`
- **Disabled**: `opacity-30`

### Badges (urgency/alerts)
- HIGH: `bg-[#ff4757]/15 text-[#ff4757] border border-[#ff4757]/30`
- MEDIUM: `bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30`
- LOW: `bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20`

### Form Inputs
- Background: `#080c18`
- Border: `#1e2d47`
- Focus: `border-[#00d4ff] ring-2 ring-[#00d4ff]/20`
- Text: `#e2e8f8`, placeholder: `#3d5275`

### Charts (Recharts)
- Background: `#0f1629` card
- Grid lines: `#1e2d4730`
- Axis tick color: `#3d5275`
- Tooltip: `#080c18` bg, `#1e2d47` border, `#e2e8f8` text
- Bar/Area colors: `#00d4ff` primary, `#38bdf8` secondary, `#0ea5e9` tertiary
- Blood group bar colors → replace greens with cyan spectrum:
  `O Pos: #00d4ff`, `A Pos: #38bdf8`, `B Pos: #0ea5e9`, `AB Pos: #7dd3fc`,
  `O Neg: #1e2d47` (distinct dark), `A Neg: #2d4a6e`, `B Neg: #3d5a7e`, `AB Neg: #4d6a8e`

### Loading States
- Replace `animate-pulse text-[#6f7a6e]` with `animate-pulse text-[#00d4ff]`

### Alert/Error Banners
- Error: `bg-[#ff4757]/10 border-[#ff4757]/30 text-[#ff4757]`
- Success: `bg-[#10d48e]/10 border-[#10d48e]/30 text-[#10d48e]`

---

## Page-Specific Notes

### Login (`Login.tsx`)
- Left hero: `#0a0e1a` bg (same feel, already dark)
- Hero headline: keep `text-white`, add `text-[#00d4ff]` to the "Blood Bank" text
- Stats row border-left: `border-[#00d4ff]/30`
- Right form panel: `#0a0e1a` bg
- Input fields: dark style per above

### Dashboard (`Dashboard.tsx`)
- Module label `text-[#00d4ff]`
- KPI accent card: navy variant with cyan top border
- Chart: cyan blood group colors

### Alerts (`Alerts.tsx`)
- Alert type badges use new badge system
- Resolved row: more muted (`text-[#3d5275]`)

### Upload (`Upload.tsx`)
- Drop zone: `border-[#1e2d47]` → `border-[#00d4ff]` when file selected, `bg-[#00d4ff]/5`
- Result banner: `bg-[#10d48e]/10 border-[#10d48e]/30`

### Predictions (`Predictions.tsx`)
- Area chart: cyan gradient fills
- Component selector buttons: dark outlined → cyan active

---

## What Does NOT Change
- All routing, API calls, state management
- Component file structure
- Font families
- Icon set (Material Symbols)
- Responsive breakpoints
- `mono-data` / `font-headline` utility class names
- Any Python/Flask backend code

---

## Implementation Scope

Files to edit (frontend only):
1. `frontend/src/index.css` — update CSS custom properties for dark base
2. `frontend/src/components/Layout.tsx` — sidebar, top bar
3. `frontend/src/pages/Login.tsx`
4. `frontend/src/pages/Dashboard.tsx`
5. `frontend/src/pages/Inventory.tsx`
6. `frontend/src/pages/Allocate.tsx`
7. `frontend/src/pages/Donors.tsx`
8. `frontend/src/pages/Predictions.tsx`
9. `frontend/src/pages/Alerts.tsx`
10. `frontend/src/pages/Upload.tsx`
