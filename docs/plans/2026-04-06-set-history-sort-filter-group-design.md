# Set History: Sorting, Filtering & Grouping

## Overview

Add sorting, filtering, and grouping controls to the BrickTally set history page so users can organize their sets by name, number, year, last worked on, completion status, and LEGO theme.

## Data Layer

### Theme Lookup Table

Ship a static `data/themes.json` file mapping Rebrickable `theme_id` to `{ name, parent_id }`. ~700 entries (~15KB). Loaded once via `fetch('/data/themes.json')` on page init and cached in a global `themeMap` variable.

A one-time `scripts/fetch-themes.js` script downloads the theme list from Rebrickable's API and generates the JSON file. Run manually when we want to refresh the theme list.

### Storing theme_id

Extend `saveSetInfo()` to persist `theme_id` from the Rebrickable API response (already returned by `/lego/sets/{id}/`, just not saved currently).

### Backfilling Existing Sets

When `displaySetHistory()` runs and finds sets without `theme_id`, fire sequential API calls to `/api/rebrickable?endpoint=/lego/sets/{set_num}/` to fetch the missing theme IDs. Save each result back to localStorage. Render the list immediately, then re-render once backfill completes (only matters if grouping by theme is active).

## UI Controls

A new row below the existing backup/restore toolbar:

```
[Sort by: ▼ Last worked on] [▲▼]    [Filter: ▼ All sets]    [Group by: ▼ None]
```

### Sort By

`<select>` with options:
- Last worked on (default)
- Set name
- Set number
- Year

### Direction Toggle

A button showing ▲ or ▼ next to the sort dropdown. Clicks flip ascending/descending. Sensible defaults per sort option:
- Last worked on: descending (most recent first)
- Set name: ascending (A→Z)
- Set number: ascending (low→high)
- Year: descending (newest first)

### Filter

`<select>` with options:
- All sets (default)
- Complete (100%)
- In Progress (1–99%)
- Not Started (0%)

### Group By

`<select>` with options:
- None (default)
- Theme

### Persistence

Save selected sort, direction, filter, and group preferences to `localStorage` so they persist across sessions.

## Rendering Logic

### Sorting

Replace the hardcoded `lastAccessed` sort in `getSetHistory()` with a configurable comparator:
- Last worked on: `lastAccessed` timestamp
- Set name: `name` string comparison (locale-aware via `localeCompare`)
- Set number: numeric parse of `number`
- Year: `year` numeric

### Filtering

Applied before rendering. Completion status derived from `calculateProgressFromString()`:
- Complete: `percentage === 100`
- In Progress: `percentage > 0 && percentage < 100`
- Not Started: `percentage === 0` or empty progress string

### Grouping by Theme

When "Theme" grouping is active:
1. Look up each set's `theme_id` in the theme map
2. Walk `parent_id` up to the root theme (e.g. "Ultimate Collector Series" → parent "Star Wars" → group under "Star Wars")
3. Sort groups alphabetically
4. Within each group, sort sets by the active sort option
5. Render an `<h3>` group header between groups
6. Sets without `theme_id` (backfill pending/failed) appear ungrouped at the bottom

### Empty State

If the active filter yields zero results, show "No sets match this filter" instead of the landing page.

## Theme Resolution

Helper function `getRootThemeName(themeId)` walks the `parent_id` chain in the theme map until reaching a root theme (no parent). Returns the root theme's name for grouping.
