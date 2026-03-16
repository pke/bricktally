# i18n Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add internationalization to BrickTally with 11 locales (en, de, fr, es, nl, da, ja, ko, ru, zh-CN, zh-TW) using i18next, with pre-translated HTML at build time and runtime translation for dynamic JS strings.

**Architecture:** Hybrid build-time + runtime approach. A Node.js build script reads `index.html` as a template, replaces static content with translations per locale, and embeds the locale JSON for runtime i18next. Vercel serves from `dist/` with locale path prefixes. See `docs/plans/2026-03-16-i18n-design.md` for full design.

**Tech Stack:** i18next (vendored, ~6 KB), Node.js build script, Vercel static hosting with rewrites

---

## Chunk 1: Foundation — i18next, English locale file, runtime init

### Task 1: Vendor i18next library

**Files:**
- Create: `js/i18next.min.js`

- [ ] **Step 1: Download i18next UMD bundle**

```bash
curl -o js/i18next.min.js https://cdn.jsdelivr.net/npm/i18next@24/i18next.min.js
```

Verify the file is ~6 KB minified and exposes `window.i18next`.

- [ ] **Step 2: Verify it loads in browser**

Add temporarily to index.html before closing `</body>`:
```html
<script src="/js/i18next.min.js"></script>
```

Open in browser, check `typeof window.i18next` in console → should be `"object"`.

- [ ] **Step 3: Commit**

```bash
git add js/i18next.min.js
git commit -m "chore: vendor i18next v24 UMD bundle"
```

---

### Task 2: Create English locale file with all ~95 keys

**Files:**
- Create: `locales/en.json`

- [ ] **Step 1: Create the English locale file**

Create `locales/en.json` with all translation keys organized by namespace. Every user-facing string in `index.html` must have a corresponding key here. Use i18next conventions: `{{var}}` for interpolation, `_one`/`_other` suffixes for pluralization.

```json
{
  "meta": {
    "title": "BrickTally - Every Brick Counts",
    "description": "Verify your LEGO® sets are complete before selling or storing. Count every piece and track multiple sets with BrickTally.",
    "ogDescription": "Check if your LEGO® sets have all pieces before selling or storing. Count every brick to confirm 100% completeness.",
    "keywords": "LEGO®, set verification, brick counting, complete set checker, LEGO® inventory, sell LEGO®, used LEGO® sets"
  },
  "button": {
    "cancel": "Cancel",
    "delete": "Delete",
    "backupAndDelete": "Backup & Delete",
    "resetProgress": "Reset progress",
    "restore": "📥 Restore",
    "restoreBackup": "📥 Restore a backup",
    "restoreSelected": "Restore Selected",
    "backupAll": "📤 Backup All",
    "backupSelected": "📤 Backup Selected",
    "backupSet": "Backup set",
    "deleteSet": "Delete set",
    "hideComplete": "Hide complete",
    "hideCompleteParts": "Hide Complete Parts",
    "generateBadge": "🏷️ Generate Badge",
    "exportBrickLink": "📦 BrickLink XML",
    "exportPickABrick": "🧱 Pick a Brick CSV",
    "exportTextList": "📄 Text List",
    "exportPartlist": "🧩 Export partlist",
    "downloadBadge": "Download Badge (PNG)",
    "close": "Close",
    "updateNow": "Update Now",
    "maybeLater": "Maybe Later",
    "awesome": "Awesome!",
    "playAgain": "Play Again",
    "toggleFullscreen": "Toggle fullscreen",
    "toggleDarkMode": "Toggle dark mode"
  },
  "input": {
    "setNumberPlaceholder": "Enter set number…",
    "setNumberLabel": "LEGO set number"
  },
  "section": {
    "parts": "Parts",
    "spareParts": "Spare Parts",
    "extraSpareParts": "Extra Spare Parts",
    "minifigures": "Minifigures",
    "colours": "Colours",
    "columns": "Columns",
    "export": "Export"
  },
  "column": {
    "color": "Color",
    "name": "Name",
    "partNumber": "Part Number"
  },
  "landing": {
    "heading": "Verify Your LEGO Sets Are Complete",
    "description": "BrickTally helps you count every piece in your LEGO® sets before selling, storing, or building. Enter a set number to get a full parts checklist powered by the <a href=\"https://rebrickable.com/\" target=\"_blank\" rel=\"noopener\">Rebrickable</a> database.",
    "featureTrack": "Track parts, spare parts, and minifigures separately",
    "featureFilter": "Filter by colour to focus on one group at a time",
    "featureExport": "Export missing parts to BrickLink, Pick a Brick, Rebrickable, or as a plain text list",
    "featureBadge": "Generate a completion badge for eBay or marketplace listings",
    "featureMobile": "Optimised for tablets and phones — always at your fingertips when sorting pieces",
    "featurePwa": "Works offline as a PWA — install it on your device",
    "featureBackup": "Backup and restore your progress across devices"
  },
  "display": {
    "pieces": "{{completed}}/{{total}} pieces",
    "piecesChecked": "pieces checked",
    "setYear": "Set {{number}} ({{year}})",
    "setDetails": "Set Number: {{number}} | Year: {{year}} | Parts: {{parts}}",
    "setDetailsVersioned": "Set Number: {{number}} [Version {{version}}] | Year: {{year}} | Parts: {{parts}}",
    "percentage": "{{value}}%",
    "noImage": "No Image",
    "loading": "Loading set data…",
    "preview": "PREVIEW"
  },
  "history": {
    "noSets": "No sets worked on yet",
    "getStarted": "Enter a set number above to get started"
  },
  "modal": {
    "restoreTitle": "Restore Sets",
    "deleteTitle": "Delete Set?",
    "deleteSetTitle": "Delete \"{{name}}\" (Set {{number}})?",
    "deleteSafe": "✅ Safe to delete — backed up {{date}} ({{percentage}}% complete)",
    "deleteOutdated": "⚠️ Backup is outdated — backed up {{date}} at {{backupPercentage}}% ({{backupPieces}} pieces), now {{currentPercentage}}% ({{currentPieces}} pieces)",
    "deleteNeverBackedUp": "⚠️ This set has never been backed up!",
    "versionsTitle": "Multiple Set Versions Found",
    "versionsDescription": "This set has {{count}} versions. Please select one:",
    "whatsNewTitle": "✨ What's New in BrickTally",
    "whatsNewFallback": "A new version is available.",
    "whatsNewChangelog": "See full changelog →",
    "badgeTitle": "BrickTally Badge",
    "badgeDescription": "Download this badge to share on eBay, Facebook Marketplace, or other platforms as proof of your set's completeness."
  },
  "restore": {
    "keepLocal": "Keep local",
    "overwrite": "Overwrite",
    "localProgress": "Local: {{percentage}}% ({{date}})",
    "restoreProgress": "Restore: {{percentage}}% ({{date}})"
  },
  "error": {
    "noSetLoaded": "Please load a set first",
    "setNumberRequired": "Please enter a set number",
    "loadFailed": "Error loading set data. Please try again.",
    "invalidFormat": "Invalid .bricktally file: does not match expected format.",
    "invalidJson": "Invalid .bricktally file: could not parse JSON.",
    "invalidFile": "Invalid .bricktally file",
    "noSetsSelected": "No sets selected for backup.",
    "noPartsCounted": "No parts counted yet."
  },
  "confirm": {
    "resetSet": "Are you sure you want to reset all progress for this set?"
  },
  "export": {
    "noMissingPieces": "No missing pieces! Your set is complete.",
    "brickLinkInstructions": "BrickLink XML file downloaded!\n\nTo use:\n1. Go to BrickLink.com\n2. Navigate to \"Want\" > \"Upload\"\n3. Select \"BrickLink XML\" format\n4. Upload the downloaded file",
    "pickABrickInstructions": "Pick a Brick CSV file downloaded!\n\nNote: This is a reference list. You'll need to manually search and add items on LEGO.com/pick-a-brick as they don't support bulk import.",
    "textHeader": "Missing Pieces for Set {{number}}",
    "textParts": "PARTS:",
    "textMinifigures": "MINIFIGURES:",
    "textTotalParts": "Total unique parts missing: {{count}}",
    "textTotalMinifigs": "Total unique minifigs missing: {{count}}",
    "textTotalPieces": "Total pieces missing: {{count}}",
    "csvNote": "# Note: Minifigures excluded (not available via Pick a Brick)",
    "csvHeader": "Element ID,Design ID,Colour,Quantity,Name"
  },
  "badge": {
    "missingPieces_one": "Missing {{count}} piece:",
    "missingPieces_other": "Missing {{count}} pieces:",
    "moreItems_one": "… and {{count}} more missing piece",
    "moreItems_other": "… and {{count}} more missing pieces",
    "minifig": "(minifig)",
    "watermark": "bricktally.app"
  },
  "tooltip": {
    "fillQuantity": "Click to mark all as counted",
    "restoreBackup": "Restore a previous backup",
    "backupAll": "Backup all sets",
    "backupSelected": "Backup selected sets",
    "cancelBackup": "Cancel backup",
    "restoreSets": "Restore sets"
  },
  "footer": {
    "tagline": "Made with ❤️ between building sessions for LEGO® enthusiasts",
    "disclaimer": "LEGO® is a trademark of the LEGO Group, which does not sponsor, authorise, or endorse this app."
  },
  "game": {
    "title": "🧠 Memory Game",
    "moves": "Moves:",
    "youWon": "🎉 You won!",
    "stats": "{{pairs}} pairs in {{moves}} moves",
    "playAgain": "Play Again",
    "partAlt": "Part"
  },
  "celebration": {
    "title": "🎉 Complete!",
    "message": "All pieces accounted for!",
    "button": "Awesome!"
  },
  "filter": {
    "all": "All ({{count}})"
  },
  "languagePicker": {
    "label": "Language"
  }
}
```

- [ ] **Step 2: Validate JSON syntax**

```bash
node -e "JSON.parse(require('fs').readFileSync('locales/en.json', 'utf8')); console.log('Valid JSON')"
```

Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add locales/en.json
git commit -m "feat(i18n): add English locale file with all translation keys"
```

---

### Task 3: Initialize i18next at runtime

**Files:**
- Modify: `index.html` (script tag + initialization block)

- [ ] **Step 1: Add i18next script tag**

In `index.html`, add the i18next script tag before the existing inline `<script>` block (before the line that starts the main app script):

```html
<script src="/js/i18next.min.js"></script>
```

- [ ] **Step 2: Add i18next initialization at the top of the inline script**

At the very beginning of the inline `<script>` block in `index.html` (before any other app code), add:

```javascript
// i18n initialization — translations embedded at build time, fallback to fetch
(function initI18n() {
    var locale = window.__LOCALE__ || 'en';
    var translations = window.__TRANSLATIONS__;

    if (translations) {
        var resources = {};
        resources[locale] = { translation: translations };
        i18next.init({
            lng: locale,
            fallbackLng: 'en',
            resources: resources,
            interpolation: { escapeValue: false }
        });
    } else {
        // Dev mode: fetch locale file
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/locales/' + locale + '.json', false); // synchronous
        xhr.send();
        if (xhr.status === 200) {
            var resources = {};
            resources[locale] = { translation: JSON.parse(xhr.responseText) };
            i18next.init({
                lng: locale,
                fallbackLng: 'en',
                resources: resources,
                interpolation: { escapeValue: false }
            });
        }
    }
})();
var t = i18next.t.bind(i18next);
```

Note: `interpolation.escapeValue: false` because we already handle escaping via the `html` tagged template literal. i18next's default escaping would double-escape.

- [ ] **Step 3: Verify initialization works locally**

Open the app in browser. In console run:
```javascript
t('button.cancel') // → "Cancel"
t('display.pieces', { completed: 5, total: 10 }) // → "5/10 pieces"
t('badge.missingPieces', { count: 1 }) // → "Missing 1 piece:"
t('badge.missingPieces', { count: 3 }) // → "Missing 3 pieces:"
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(i18n): initialize i18next runtime with embedded or fetched translations"
```

---

## Chunk 2: Replace all hardcoded strings with t() calls

### Task 4: Replace alert/confirm strings with t() calls

**Files:**
- Modify: `index.html` — all `alert()` and `confirm()` calls

These are the simplest replacements — direct string-to-key swaps.

- [ ] **Step 1: Replace "Please load a set first" (5 occurrences)**

Find all `alert('Please load a set first')` calls (lines ~2821, ~3235, ~3320, ~3381, ~3468) and replace with:
```javascript
alert(t('error.noSetLoaded'));
```

- [ ] **Step 2: Replace "No missing pieces" (3 occurrences)**

Find all `alert('No missing pieces! Your set is complete.')` (lines ~3276, ~3351, ~3422) and replace with:
```javascript
alert(t('export.noMissingPieces'));
```

- [ ] **Step 3: Replace "Are you sure you want to reset" (2 occurrences)**

Find both `confirm('Are you sure you want to reset all progress for this set?')` (lines ~932, ~2776) and replace with:
```javascript
confirm(t('confirm.resetSet'))
```

- [ ] **Step 4: Replace remaining alert/confirm strings**

Each of these appears once:

```javascript
// Line ~1031 and ~2031:
alert(t('error.setNumberRequired'));

// Line ~1095:
alert(t('error.noSetsSelected'));

// Line ~1115:
alert(t('error.invalidFormat'));

// Line ~1120:
alert(t('error.invalidJson'));

// Line ~1218:
alert(t('error.invalidFile'));

// Line ~3493:
alert(t('error.noPartsCounted'));

// Line ~3315 (BrickLink instructions):
alert(t('export.brickLinkInstructions'));

// Line ~3376 (Pick a Brick instructions):
alert(t('export.pickABrickInstructions'));
```

- [ ] **Step 5: Run existing tests to verify no breakage**

```bash
npx playwright test tests/e2e/backup-restore.spec.js --project chromium
```

Expected: All tests pass (alerts still show English text via i18next).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(i18n): replace all alert/confirm strings with t() calls"
```

---

### Task 5: Replace dynamic innerHTML strings with t() calls

**Files:**
- Modify: `index.html` — all `html` tagged template literals and innerHTML assignments

- [ ] **Step 1: Replace set history item template (displaySetHistory function)**

In `displaySetHistory()` (~line 807), the `html` template builds set history cards. Replace hardcoded strings:

```javascript
// "Set {number} ({year})" → t('display.setYear', { number: ..., year: ... })
// "{completed} / {total} pieces" → t('display.pieces', { completed: ..., total: ... })
// title="Backup set" → title="${t('button.backupSet')}"
// title="Reset progress" → title="${t('button.resetProgress')}"
// title="Delete set" → title="${t('button.deleteSet')}"
```

- [ ] **Step 2: Replace delete modal content (showDeleteModal function)**

In the delete modal builder (~line 861), replace:
```javascript
// Modal title: t('modal.deleteSetTitle', { name: ..., number: ... })
// Safe message: t('modal.deleteSafe', { date: ..., percentage: ... })
// Outdated message: t('modal.deleteOutdated', { date: ..., backupPercentage: ..., backupPieces: ..., currentPercentage: ..., currentPieces: ... })
// Never backed up: t('modal.deleteNeverBackedUp')
// "Delete" button: t('button.delete')
// "Backup & Delete" button: t('button.backupAndDelete')
// "Cancel" button: t('button.cancel')
```

- [ ] **Step 3: Replace restore dialog content**

In the restore dialog builder (~line 1153), replace:
```javascript
// "Keep local" → t('restore.keepLocal')
// "Overwrite" → t('restore.overwrite')
// Progress text → t('restore.localProgress', { percentage: ..., date: ... })
// Progress text → t('restore.restoreProgress', { percentage: ..., date: ... })
```

- [ ] **Step 4: Replace version selector modal**

In the version selector (~line 2100), replace:
```javascript
// "Multiple Set Versions Found" → t('modal.versionsTitle')
// Description → t('modal.versionsDescription', { count: versions.length })
// "Cancel" → t('button.cancel')
```

- [ ] **Step 5: Replace set details display**

In the set info display (~line 2201), replace the "Set Number: X | Year: Y | Parts: Z" string with:
```javascript
t('display.setDetails', { number: ..., year: ..., parts: ... })
// or for versioned:
t('display.setDetailsVersioned', { number: ..., version: ..., year: ..., parts: ... })
```

- [ ] **Step 6: Replace What's New modal strings**

In `showWhatsNewModal()` (~line 360), replace:
```javascript
// "✨ What's New in BrickTally" → t('modal.whatsNewTitle')
// "See full changelog →" → t('modal.whatsNewChangelog')
// "A new version is available." → t('modal.whatsNewFallback')
// "Update Now" → t('button.updateNow')
// "Maybe Later" → t('button.maybeLater')
```

- [ ] **Step 7: Replace completion celebration**

In the celebration dialog (~line 3578), replace:
```javascript
// "🎉 Complete!" → t('celebration.title')
// "All pieces accounted for!" → t('celebration.message')
// "Awesome!" → t('celebration.button')
```

- [ ] **Step 8: Replace badge generation strings**

In `generateBadge()` (~line 3079), replace:
```javascript
// "Missing X piece(s):" → t('badge.missingPieces', { count: missingCount })
// "(minifig)" → t('badge.minifig')
// "… and X more missing pieces" → t('badge.moreItems', { count: remaining })
// "bricktally.app" → t('badge.watermark')
```

In the badge modal (~line 3215), replace:
```javascript
// "BrickTally Badge" → t('modal.badgeTitle')
// Description → t('modal.badgeDescription')
// "Download Badge (PNG)" → t('button.downloadBadge')
// "Close" → t('button.close')
```

- [ ] **Step 9: Replace memory game strings**

In the memory game code (~line 1684), replace:
```javascript
// "🧠 Memory Game" → t('game.title')
// "Moves:" → t('game.moves')
// "🎉 You won!" → t('game.youWon')
// Stats → t('game.stats', { pairs: ..., moves: ... })
// "Play Again" → t('game.playAgain')
// alt="Part" → alt="${t('game.partAlt')}"
```

- [ ] **Step 10: Replace export text strings**

In text export functions, replace:
```javascript
// "Missing Pieces for Set X" → t('export.textHeader', { number: ... })
// "PARTS:" → t('export.textParts')
// "MINIFIGURES:" → t('export.textMinifigures')
// "Total unique parts missing: X" → t('export.textTotalParts', { count: ... })
// "Total unique minifigs missing: X" → t('export.textTotalMinifigs', { count: ... })
// "Total pieces missing: X" → t('export.textTotalPieces', { count: ... })
// CSV note and header → t('export.csvNote'), t('export.csvHeader')
```

- [ ] **Step 11: Replace misc dynamic strings**

```javascript
// "Loading set data…" → t('display.loading')
// "PREVIEW" → t('display.preview')
// "No Image" → t('display.noImage')
// "Click to mark all as counted" → t('tooltip.fillQuantity')
// Color filter "All (X)" → t('filter.all', { count: ... })
// "pieces checked" label → t('display.piecesChecked')
```

- [ ] **Step 12: Run full test suite**

```bash
npx playwright test
```

Expected: All tests pass (still English via i18next).

- [ ] **Step 13: Commit**

```bash
git add index.html
git commit -m "feat(i18n): replace all dynamic JS strings with i18next t() calls"
```

---

### Task 6: Add data-i18n attributes to static HTML

**Files:**
- Modify: `index.html` — static HTML elements

Static HTML elements that the build script will pre-translate. Add `data-i18n` attributes so the build script knows which keys to use.

- [ ] **Step 1: Add data-i18n to landing content**

```html
<h2 data-i18n="landing.heading">Verify Your LEGO Sets Are Complete</h2>
<p data-i18n="[html]landing.description">BrickTally helps you count...</p>
<li data-i18n="landing.featureTrack">Track parts, spare parts...</li>
<li data-i18n="landing.featureFilter">Filter by colour...</li>
<li data-i18n="landing.featureExport">Export missing parts...</li>
<li data-i18n="landing.featureBadge">Generate a completion badge...</li>
<li data-i18n="landing.featureMobile">Optimised for tablets...</li>
<li data-i18n="landing.featurePwa">Works offline as a PWA...</li>
<li data-i18n="landing.featureBackup">Backup and restore...</li>
```

Note: `[html]` prefix tells the build script to set innerHTML instead of textContent (needed for the description which contains an `<a>` tag).

- [ ] **Step 2: Add data-i18n to buttons and tooltips**

```html
<button data-i18n="[title]button.toggleFullscreen" title="Toggle fullscreen">⛶</button>
<button data-i18n="[title]button.toggleDarkMode" title="Toggle dark mode">...</button>
<input data-i18n="[placeholder]input.setNumberPlaceholder;[aria-label]input.setNumberLabel" placeholder="Enter set number…" aria-label="LEGO set number">
<button data-i18n="[title]button.restoreBackup" title="Restore a previous backup">📥 Restore a backup</button>
```

For buttons with visible text:
```html
<button data-i18n="button.restore" ...>📥 Restore</button>
<button data-i18n="button.backupAll" ...>📤 Backup All</button>
<button data-i18n="button.backupSelected" ...>📤 Backup Selected</button>
<button data-i18n="button.cancel" ...>Cancel</button>
<button data-i18n="button.restoreSelected" ...>Restore Selected</button>
```

- [ ] **Step 3: Add data-i18n to section headers and filters**

```html
<div data-i18n="section.colours">Colours</div>
<div data-i18n="section.columns">Columns</div>
<div data-i18n="section.export">Export</div>
```

Column toggle labels:
```html
<label data-i18n="column.color">Color</label>
<label data-i18n="column.name">Name</label>
<label data-i18n="column.partNumber">Part Number</label>
```

Export buttons:
```html
<button data-i18n="button.generateBadge">🏷️ Generate Badge</button>
<button data-i18n="button.exportBrickLink">📦 BrickLink XML</button>
<button data-i18n="button.exportPickABrick">🧱 Pick a Brick CSV</button>
<button data-i18n="button.exportTextList">📄 Text List</button>
<button data-i18n="button.exportPartlist">🧩 Export partlist</button>
```

- [ ] **Step 4: Add data-i18n to footer**

```html
<span data-i18n="footer.tagline">Made with ❤️ between building sessions for LEGO® enthusiasts</span>
<span data-i18n="footer.disclaimer">LEGO® is a trademark of the LEGO Group...</span>
```

- [ ] **Step 5: Add data-i18n to empty state**

```html
<p data-i18n="history.noSets">No sets worked on yet</p>
<p data-i18n="history.getStarted">Enter a set number above to get started</p>
```

- [ ] **Step 6: Add data-i18n to hide complete toggle**

```html
<div data-i18n="button.hideComplete">Hide complete</div>
```

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat(i18n): add data-i18n attributes to all static HTML elements"
```

---

## Chunk 3: Build script and Vercel integration

### Task 7: Create the build script

**Files:**
- Create: `scripts/build-i18n.js`

- [ ] **Step 1: Write the build script**

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOCALES = ['en', 'de', 'fr', 'es', 'nl', 'da', 'ja', 'ko', 'ru', 'zh-CN', 'zh-TW'];
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Clean dist
if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
}
fs.mkdirSync(DIST, { recursive: true });

// Read template
const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Helper: resolve nested key like "landing.heading" from translations object
function resolve(obj, keyPath) {
    return keyPath.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}

// Helper: replace data-i18n attributes in HTML
// Uses a two-pass approach to avoid regex issues with nested HTML elements:
// Pass 1: Handle self-closing/void elements and attribute-only translations
// Pass 2: Handle elements with content, using tag-name-aware matching
function translateStaticHTML(html, translations) {
    // For each data-i18n occurrence, find the element and replace appropriately
    // We process line by line to avoid cross-element regex matching issues

    var lines = html.split('\n');
    var result = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var i18nMatch = line.match(/data-i18n="([^"]+)"/);
        if (!i18nMatch) {
            result.push(line);
            continue;
        }

        var i18nValue = i18nMatch[1];
        var parts = i18nValue.split(';');

        parts.forEach(function(part) {
            part = part.trim();
            var attrMatch = part.match(/^\[([^\]]+)\](.+)$/);
            if (attrMatch) {
                var attr = attrMatch[1];
                var key = attrMatch[2];
                var value = resolve(translations, key);
                if (value === null) return;

                if (attr === 'html') {
                    // Replace innerHTML: content between > and </
                    line = line.replace(/(>)([\s\S]*?)(<\/)/, '$1' + value + '$3');
                } else {
                    // Replace attribute value
                    var attrRegex = new RegExp('(' + attr + '=")([^"]*)(")');
                    line = line.replace(attrRegex, '$1' + value + '$3');
                }
            } else {
                // Plain key — replace text content between > and </
                var value = resolve(translations, part);
                if (value !== null) {
                    line = line.replace(/(>)([^<]*)(<\/)/, '$1' + value + '$3');
                }
            }
        });

        result.push(line);
    }

    return result.join('\n');
}

// IMPORTANT: This line-by-line approach requires that each data-i18n element
// with plain text content fits on a single line. For the landing description
// (which spans multiple lines and contains child elements), use [html] prefix
// and ensure the opening tag, content, and closing tag are on the same line,
// OR handle it as a special case in translateMeta().

// Helper: replace meta tags
function translateMeta(html, translations) {
    // <html lang="en"> → <html lang="de">
    // <title>...</title> → translated title
    // <meta name="description" content="..."> → translated
    // <meta property="og:title" content="..."> → translated
    // <meta property="og:description" content="..."> → translated
    // <meta name="twitter:title" content="..."> → translated
    // <meta name="twitter:description" content="..."> → translated
    // <meta name="keywords" content="..."> → translated

    var t = translations;

    if (t.meta && t.meta.title) {
        html = html.replace(/<title>[^<]*<\/title>/, '<title>' + t.meta.title + '</title>');
        html = html.replace(/(property="og:title"\s+content=")[^"]*"/, '$1' + t.meta.title + '"');
        html = html.replace(/(name="twitter:title"\s+content=")[^"]*"/, '$1' + t.meta.title + '"');
    }
    if (t.meta && t.meta.description) {
        html = html.replace(/(name="description"\s+content=")[^"]*"/, '$1' + t.meta.description + '"');
    }
    if (t.meta && t.meta.ogDescription) {
        html = html.replace(/(property="og:description"\s+content=")[^"]*"/, '$1' + t.meta.ogDescription + '"');
        html = html.replace(/(name="twitter:description"\s+content=")[^"]*"/, '$1' + t.meta.ogDescription + '"');
    }
    if (t.meta && t.meta.keywords) {
        html = html.replace(/(name="keywords"\s+content=")[^"]*"/, '$1' + t.meta.keywords + '"');
    }

    return html;
}

// Build each locale
LOCALES.forEach(function(locale) {
    console.log('Building locale: ' + locale);

    var localeFile = path.join(ROOT, 'locales', locale + '.json');
    if (!fs.existsSync(localeFile)) {
        console.warn('  Warning: ' + localeFile + ' not found, skipping');
        return;
    }

    var translations = JSON.parse(fs.readFileSync(localeFile, 'utf8'));
    var output = template;

    // 1. Replace <html lang="en">
    output = output.replace(/<html lang="[^"]*"/, '<html lang="' + locale + '"');

    // 2. Translate meta tags
    output = translateMeta(output, translations);

    // 3. Translate static HTML via data-i18n attributes
    output = translateStaticHTML(output, translations);

    // 4. Update canonical URL for this locale
    var BASE_URL = 'https://bricktally.app';
    var localePrefix = locale === 'en' ? '' : '/' + locale;
    output = output.replace(
        /(<link rel="canonical" href=")[^"]*(")/,
        '$1' + BASE_URL + localePrefix + '/$2'
    );

    // 5. Add hreflang alternate links for SEO
    var hreflangLinks = LOCALES.map(function(l) {
        var prefix = l === 'en' ? '' : '/' + l;
        return '<link rel="alternate" hreflang="' + l + '" href="' + BASE_URL + prefix + '/">';
    }).join('\n    ');
    hreflangLinks += '\n    <link rel="alternate" hreflang="x-default" href="' + BASE_URL + '/">';
    output = output.replace('</head>', '    ' + hreflangLinks + '\n</head>');

    // 6. Embed translations for runtime i18next
    var embedScript = '<script>window.__LOCALE__="' + locale + '";window.__TRANSLATIONS__=' +
        JSON.stringify(translations) + ';</script>';
    output = output.replace('</head>', embedScript + '\n</head>');

    // Write locale output
    var localeDir = path.join(DIST, locale);
    fs.mkdirSync(localeDir, { recursive: true });
    fs.writeFileSync(path.join(localeDir, 'index.html'), output);
});

// Copy English as default root index.html
var enIndex = path.join(DIST, 'en', 'index.html');
if (fs.existsSync(enIndex)) {
    fs.copyFileSync(enIndex, path.join(DIST, 'index.html'));
}

// Copy static assets
var assetsToCopy = ['styles.css', 'sw.js', 'changelog.html', 'changelog.json'];
var dirsToCopy = ['js', 'assets'];

assetsToCopy.forEach(function(file) {
    var src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(DIST, file));
    }
});

dirsToCopy.forEach(function(dir) {
    var src = path.join(ROOT, dir);
    if (fs.existsSync(src)) {
        fs.cpSync(src, path.join(DIST, dir), { recursive: true });
    }
});

// Copy api/ directory (Vercel serverless functions stay at root, but copy for local dev)
var apiSrc = path.join(ROOT, 'api');
if (fs.existsSync(apiSrc)) {
    fs.cpSync(apiSrc, path.join(DIST, 'api'), { recursive: true });
}

console.log('Build complete: ' + LOCALES.length + ' locales');
```

- [ ] **Step 2: Test the build script**

```bash
node scripts/build-i18n.js
```

Expected output:
```
Building locale: en
Building locale: de
  Warning: locales/de.json not found, skipping
...
Build complete: 11 locales
```

Verify `dist/en/index.html` exists and has:
- `<html lang="en">`
- `window.__LOCALE__="en"` embedded
- `window.__TRANSLATIONS__={...}` embedded
- `data-i18n` elements still present (with English content)
- `dist/index.html` is a copy of `dist/en/index.html`

- [ ] **Step 3: Commit**

```bash
git add scripts/build-i18n.js
git commit -m "feat(i18n): add build script to generate per-locale HTML"
```

---

### Task 8: Update Vercel configuration and gitignore

**Files:**
- Modify: `vercel.json`
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Add dist/ to .gitignore FIRST (before running any builds)**

Append to `.gitignore`:
```
dist/
```

This prevents accidentally committing build output.

- [ ] **Step 2: Update vercel.json**

```json
{
  "buildCommand": "node scripts/build-i18n.js",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=604800" }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/manifest.json",
      "destination": "/api/manifest"
    },
    {
      "source": "/:locale(de|fr|es|nl|da|ja|ko|ru|zh-CN|zh-TW)/changelog",
      "destination": "/changelog.html"
    }
  ]
}
```

- [ ] **Step 3: Add build script to package.json**

Add to the `"scripts"` section of `package.json`:
```json
"build": "node scripts/build-i18n.js"
```

- [ ] **Step 4: Verify vercel dev works**

```bash
npx vercel dev --listen 8080
```

Visit `http://localhost:8080/` — should serve the built English page.
Visit `http://localhost:8080/en/` — should serve the English page.

- [ ] **Step 5: Commit**

```bash
git add vercel.json .gitignore package.json
git commit -m "chore(i18n): configure Vercel build and output, add dist/ to gitignore"
```

---

### Task 9: Update service worker precache list

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: Handle locale pages in service worker caching**

Do NOT precache all 11 locale index files — that would add ~1.6 MB to the install payload. Instead, use the existing network-first strategy for HTML pages, which will cache the user's locale page on first visit.

In `sw.js`, ensure the `STATIC_FILES` array includes only the root `index.html` (English default):

```javascript
var STATIC_FILES = [
    '/',
    '/index.html',
    // ... existing entries (styles.css, js/*, assets/*, etc.) ...
];
```

The service worker's existing fetch handler already uses network-first for HTML pages, so locale pages like `/de/index.html` will be cached on first visit and served from cache when offline. No additional precache entries needed.

- [ ] **Step 2: Commit**

```bash
git add sw.js
git commit -m "feat(i18n): add locale index files to service worker precache"
```

---

## Chunk 4: Language switcher and remaining locale files

### Task 10: Add language switcher to footer

**Files:**
- Modify: `index.html` (footer HTML + JS)
- Modify: `styles.css` (language picker styles)

- [ ] **Step 1: Add language picker HTML to footer**

In the `<footer>` section of `index.html`, add a language selector after the disclaimer:

```html
<div class="language-picker">
    <label data-i18n="languagePicker.label" for="languageSelect">Language</label>
    <select id="languageSelect" onchange="switchLanguage(this.value)">
        <option value="en">English</option>
        <option value="de">Deutsch</option>
        <option value="fr">Français</option>
        <option value="es">Español</option>
        <option value="nl">Nederlands</option>
        <option value="da">Dansk</option>
        <option value="ja">日本語</option>
        <option value="ko">한국어</option>
        <option value="ru">Русский</option>
        <option value="zh-CN">简体中文</option>
        <option value="zh-TW">繁體中文</option>
    </select>
</div>
```

- [ ] **Step 2: Add switchLanguage function**

In the inline JS, add:

```javascript
window.switchLanguage = function(locale) {
    localStorage.setItem('locale', locale);
    var currentPath = window.location.pathname;
    // Remove existing locale prefix
    var stripped = currentPath.replace(/^\/(en|de|fr|es|nl|da|ja|ko|ru|zh-CN|zh-TW)(\/|$)/, '/');
    // Navigate to new locale path
    if (locale === 'en') {
        window.location.href = stripped;
    } else {
        window.location.href = '/' + locale + stripped;
    }
};

// On page load: redirect to saved locale preference if not already on it
(function() {
    var saved = localStorage.getItem('locale');
    var current = window.__LOCALE__ || 'en';
    if (saved && saved !== current) {
        var currentPath = window.location.pathname;
        var stripped = currentPath.replace(/^\/(en|de|fr|es|nl|da|ja|ko|ru|zh-CN|zh-TW)(\/|$)/, '/');
        var target = saved === 'en' ? stripped : '/' + saved + stripped;
        if (window.location.pathname !== target) {
            window.location.replace(target); // replace, not push, to avoid back-button loop
            return;
        }
    }
    // Set selected language in dropdown
    var select = document.getElementById('languageSelect');
    if (select) {
        select.value = current;
    }
})();
```

- [ ] **Step 3: Add CSS for language picker**

In `styles.css`, add:

```css
.language-picker {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
}

.language-picker label {
    font-size: 12px;
    color: var(--text-secondary);
}

.language-picker select {
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: var(--bg-secondary);
    color: var(--text-primary);
    cursor: pointer;
}
```

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat(i18n): add language switcher dropdown in footer"
```

---

### Task 11: Create remaining locale files (10 files)

**Files:**
- Create: `locales/de.json`, `locales/fr.json`, `locales/es.json`, `locales/nl.json`, `locales/da.json`, `locales/ja.json`, `locales/ko.json`, `locales/ru.json`, `locales/zh-CN.json`, `locales/zh-TW.json`

- [ ] **Step 1: Create all 10 locale files**

Each file has the same key structure as `locales/en.json` but with translated values. Start with the structure from `en.json` and translate every value.

These must be accurate, native-quality translations — not machine-translated placeholders. Key considerations:
- Pluralization rules differ by language (e.g., Russian has 3 plural forms: `_one`, `_few`, `_many`, `_other`)
- Japanese/Korean/Chinese have no plural forms (only `_other` needed)
- Keep emoji prefixes unchanged (🏷️, 📦, 🧱, etc.)
- Keep brand names unchanged: BrickTally, Rebrickable, BrickLink, Pick a Brick, LEGO®
- Landing description contains HTML (`<a>` tag) — preserve the markup
- `\n` in multiline strings (export instructions) must be preserved

For Russian, add extra plural forms:
```json
{
  "badge": {
    "missingPieces_one": "Не хватает {{count}} детали:",
    "missingPieces_few": "Не хватает {{count}} деталей:",
    "missingPieces_many": "Не хватает {{count}} деталей:",
    "missingPieces_other": "Не хватает {{count}} деталей:"
  }
}
```

- [ ] **Step 2: Validate all JSON files**

```bash
for f in locales/*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'));console.log('OK: $f')"; done
```

Expected: `OK` for all 11 files.

- [ ] **Step 3: Verify all locale files have the same nested keys as en.json**

The validation must check ALL nested keys, not just top-level. A locale with `"button": {}` but missing `button.cancel` must be caught.

```bash
node -e "
function flatKeys(obj, prefix) {
    prefix = prefix || '';
    var keys = [];
    Object.keys(obj).forEach(function(k) {
        var path = prefix ? prefix + '.' + k : k;
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            keys = keys.concat(flatKeys(obj[k], path));
        } else {
            keys.push(path);
        }
    });
    return keys;
}
var enKeys = flatKeys(JSON.parse(require('fs').readFileSync('locales/en.json','utf8')));
var files = require('fs').readdirSync('locales').filter(function(f) { return f.endsWith('.json') && f !== 'en.json'; });
var ok = true;
files.forEach(function(f) {
    var otherKeys = flatKeys(JSON.parse(require('fs').readFileSync('locales/' + f,'utf8')));
    var missing = enKeys.filter(function(k) { return otherKeys.indexOf(k) === -1; });
    // Extra keys are OK (e.g. Russian _few/_many plural forms)
    if (missing.length) { console.log(f + ' MISSING: ' + missing.join(', ')); ok = false; }
    else console.log(f + ' OK (' + otherKeys.length + ' keys)');
});
if (!ok) process.exit(1);
"
```

- [ ] **Step 4: Commit**

```bash
git add locales/
git commit -m "feat(i18n): add translations for de, fr, es, nl, da, ja, ko, ru, zh-CN, zh-TW"
```

---

## Chunk 5: Build verification, tests, and hooks

### Task 12: Run full build and verify all locales

**Files:** None (verification only)

- [ ] **Step 1: Run the build**

```bash
node scripts/build-i18n.js
```

Expected: `Build complete: 11 locales`

- [ ] **Step 2: Verify each locale output**

```bash
# Check all locale dirs exist
ls dist/*/index.html

# Verify German has correct lang and embedded translations
grep 'lang="de"' dist/de/index.html
grep '__LOCALE__="de"' dist/de/index.html

# Verify Japanese has correct lang
grep 'lang="ja"' dist/ja/index.html

# Verify default index.html is English
grep 'lang="en"' dist/index.html
```

- [ ] **Step 3: Verify static HTML is translated in non-English locales**

Open `dist/de/index.html` in a text editor and verify:
- The landing `<h2>` contains German text, not "Verify Your LEGO Sets Are Complete"
- The footer tagline is in German
- The meta description is in German
- Button text inside `data-i18n` elements is in German

- [ ] **Step 4: Verify runtime translations work**

```bash
npx vercel dev --listen 8080
```

Visit `http://localhost:8080/de/` and verify:
- Static content is in German (no flash)
- Dynamic elements (load a set, trigger modals) show German strings
- Language picker shows "Deutsch" selected

---

### Task 13: Update e2e tests for i18n

**Files:**
- Modify: `tests/e2e/backup-restore.spec.js`
- Modify: `tests/e2e/deep-links.spec.js`
- Modify: `tests/e2e/exports-badges.spec.js`
- Modify: other test files as needed

Tests currently check for English text. Since the test server serves from `dist/` with the build, and tests access `/` (which is the English default), tests should continue to pass without changes. However:

- [ ] **Step 1: Verify all existing tests pass against the built output**

```bash
npx playwright test
```

Expected: All tests pass (same as before, since `/` serves English).

- [ ] **Step 2: Add a basic i18n smoke test**

Create `tests/e2e/i18n.spec.js`:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Category 18: Internationalization', () => {

  test('18.1: Default page is English', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#landingContent h2')).toContainText('Verify Your LEGO Sets Are Complete');
  });

  test('18.2: Language switcher navigates to locale', async ({ page }) => {
    await page.goto('/');
    // Switch to German
    await page.selectOption('#languageSelect', 'de');
    // waitForURL: /de/ with optional trailing path
    await page.waitForURL(/\/de(\/|$)/);
    // Verify German content
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });

  test('18.3: Direct locale URL serves translated page', async ({ page }) => {
    await page.goto('/de/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.locator('#languageSelect')).toHaveValue('de');
  });

  test('18.4: Locale preference persists via localStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('locale', 'fr'));
    await page.goto('/');
    // Should redirect to /fr/
    await page.waitForURL(/\/fr(\/|$)/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

});
```

- [ ] **Step 3: Run the new test**

```bash
npx playwright test tests/e2e/i18n.spec.js
```

- [ ] **Step 4: Commit**

```bash
git add tests/
git commit -m "test(i18n): add language switcher smoke test"
```

---

### Task 14: Update git hooks for dist output

**Files:**
- Modify: `.git/hooks/post-commit` (or equivalent hook script)

- [ ] **Step 1: Check current post-commit hook**

Read the post-commit hook to understand how it stamps version info into `index.html`. It needs to also stamp into `dist/*/index.html` if they exist, or the build needs to run after the stamp.

Since the build runs on Vercel (not locally), the post-commit hook should continue stamping the source `index.html`. The Vercel build script reads the stamped `index.html` as its template, so all locale outputs inherit the version stamp automatically.

**Note:** The design spec says "Post-commit version stamp: needs update to stamp all `dist/*/index.html` copies." This is NOT needed because `dist/` is a build artifact generated on Vercel from the already-stamped source. The post-commit hook stamps `index.html` → Vercel build reads it → all locale pages get the stamp. No hook changes needed.

- [ ] **Step 2: Verify the pre-commit hook**

The pre-commit hook bumps `CACHE_VERSION` in `sw.js`. Since `sw.js` is copied to `dist/` during build, this works automatically. Verify no changes needed.

- [ ] **Step 3: Commit (if any changes were needed)**

---

### Task 15: Update changelog and final commit

**Files:**
- Modify: `changelog.json`

- [ ] **Step 1: Add changelog entry**

Add an entry to `changelog.json`:
```json
{
  "version": "1.26.0",
  "date": "2026-03-16",
  "title": "Now in 11 Languages!",
  "entries": [
    "BrickTally now speaks your language! Choose from English, German, French, Spanish, Dutch, Danish, Japanese, Korean, Russian, Simplified Chinese, and Traditional Chinese",
    "Pick your language from the footer — your choice is remembered across visits"
  ]
}
```

- [ ] **Step 2: Regenerate changelog HTML**

```bash
node scripts/generate-changelog.js
```

- [ ] **Step 3: Commit**

```bash
git add changelog.json changelog.html
git commit -m "feat(i18n): add changelog entry for i18n support"
```
