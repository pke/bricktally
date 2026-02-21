# BrickTally Progress Format

> How I store set completion progress in localStorage — and why a 9,090-piece Titanic at 95% completion fits in 222 bytes.

## The Problem

LEGO sets can be enormous. The Millennium Falcon (75192) has **726 unique part lots**. The Titanic (10294) has **755 lots** totalling 9,090 pieces. Storing progress for these sets in `localStorage` — which has a ~5 MB limit shared across the entire origin — demands a compact format.

The original plain-text format stored entries like `3001_Red:5,3004_Blue:3` — human-readable, but bloated. A half-complete Millennium Falcon consumed **~8 KB** of localStorage for progress alone. With multiple large sets tracked simultaneously, this becomes a real constraint.

## Format Overview

Progress is stored as a single string in the `progress` field of the consolidated `set_<number>` JSON object in localStorage:

```
localStorage["set_75192-1"] = {
  "number": "75192",
  "fullNumber": "75192-1",
  "name": "Millennium Falcon",
  "numParts": 7541,
  "progress": "izbUMdCJVjI2MDBU0jEFQoPYWA...",   ← this is what this doc is about
  ...
}
```

### Three Possible States

```
""                          → 0% complete (nothing picked)
"izbUMdCJ..."              → partially complete (compressed binary)
"3001_Red:5,3004_Blue:3"   → legacy plain format (auto-migrated)
```

## The Clever Bit: Flipped Perspective

The key insight is that progress data is **symmetric**. At any point, I can describe the state as either:

- **What you've picked** (mode 0) — useful when you've checked few parts
- **What's remaining** (mode 1) — useful when you're nearly done

I always store whichever list is **shorter**:

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  0%          25%          50%          75%         100%        │
│  ├───────────┼────────────┼────────────┼───────────┤           │
│                                                                │
│  ◄── mode 0: store picked ──►◄── mode 1: store remaining ──►   │
│      (fewer entries)              (fewer entries)              │
│                                                                │
│  "" (empty)                                        [1,1]       │
│  0 bytes                                           10 bytes    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

This creates a **symmetric compression curve** — storage is smallest at 0% and 100%, largest at 50%:

```
Storage size vs. completion (726 lots, Millennium Falcon scale)

    2.0 KB ┤
           │                    ╭──────╮
    1.5 KB ┤                 ╭──╯      ╰──╮
           │              ╭──╯             ╰──╮
    1.0 KB ┤           ╭──╯                   ╰──╮
           │        ╭──╯                          ╰──╮
    0.5 KB ┤     ╭──╯                                ╰──╮
           │  ╭──╯                                       ╰──╮
      0  B ┤──╯                                              ╰──
           └──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──
              0%     10%    25%    50%    75%    90%    95%   100%

           mode 0 (picked)  ─────►│◄─────  mode 1 (remaining)
```

## Binary Format

### Encoding Pipeline

```
                ┌─────────────────────────────────────────┐
                │           In-Memory State               │
                │                                         │
                │  partsData[]  ──► part definitions      │
                │  userCounts{} ──► picked quantities     │
                └─────────────────┬───────────────────────┘
                                  │
                           compressProgress()
                                  │
                                  ▼
                ┌─────────────────────────────────────────┐
                │           JSON Array                    │
                │                                         │
                │  [version, mode, ...entries]            │
                │  [1, 0, ["3001",5,3,0], ...]            │
                └─────────────────┬───────────────────────┘
                                  │
                          pako.deflateRaw()
                           (DEFLATE level 9)
                                  │
                                  ▼
                ┌─────────────────────────────────────────┐
                │           Compressed Bytes              │
                │                                         │
                │  Raw DEFLATE output (Uint8Array)        │
                └─────────────────┬───────────────────────┘
                                  │
                            base64url encode
                     (no padding, URL-safe alphabet)
                                  │
                                  ▼
                ┌─────────────────────────────────────────┐
                │           Progress String               │
                │                                         │
                │  "izbUMdCJVjI2MDBU0jEFQoPYWA"           │
                │  Alphabet: [A-Za-z0-9_-]                │
                │  No ':' character (key for format       │
                │  detection vs legacy format)            │
                └─────────────────────────────────────────┘
```

### JSON Array Structure

```json
[version, mode, [partNum, colorId, count, type], ...]
```

| Field | Type | Description |
|---|---|---|
| `version` | `number` | Format version, currently `1` |
| `mode` | `number` | `0` = entries are **picked** counts, `1` = entries are **remaining** counts |
| `partNum` | `string` | Rebrickable part number (e.g. `"3001"`) |
| `colorId` | `number` | Rebrickable numeric color ID (e.g. `5` for Red, `0` for minifigs) |
| `count` | `number` | Piece count (picked or remaining, depending on mode) |
| `type` | `number` | `0` = regular part, `1` = spare part, `2` = minifigure |

**Why numeric color IDs?** The old format used color names (`Red`, `Blue`) which are verbose strings. Rebrickable's numeric color IDs (e.g. `5` for Red, `11` for Blue) are **stable identifiers** — they don't change across API versions or over time. Using them instead of names produces a shorter JSON source stream before compression, which compounds into significant savings at scale. The mapping back to color names happens through `partsData[]` at decompression time.

### Special Cases

| State | Stored Value | Reason |
|---|---|---|
| 0% complete | `""` (empty string) | Mode 0 with zero entries — nothing to encode |
| 100% complete | `base64url([1,1])` ≈ 10 chars | Mode 1 with zero entries — everything complete, nothing remaining |
| Partially complete | `base64url(deflate([1, mode, ...entries]))` | Whichever mode produces fewer entries |

### Entry Omission Rules

Entries are only stored for parts with **non-trivial state**:

| Mode | Entry stored when | Entry omitted when | Omitted means |
|---|---|---|---|
| 0 (picked) | `picked > 0` | `picked === 0` | Nothing picked for this part |
| 1 (remaining) | `remaining > 0` | `remaining === 0` | Part is fully complete |

This is why 100% complete in mode 1 has **zero entries** — every part has 0 remaining.

## Format Detection

The decoder identifies the format by inspecting the string:

```
                    ┌──────────────────┐
                    │  progress string │
                    └────────┬─────────┘
                             │
                     ┌───────▼────────┐
                     │  empty string?  │──── yes ──► 0% complete
                     └───────┬────────┘
                             │ no
                     ┌───────▼────────┐
                     │ contains ':'?  │──── yes ──► Legacy plain format
                     └───────┬────────┘              "3001_Red:5,3004_Blue:3"
                             │ no                    Parse with split(',') and split(':')
                     ┌───────▼────────┐
                     │  base64url     │──── Compressed format
                     │  deflate       │     Decode → inflate → JSON.parse
                     │  JSON parse    │
                     └────────────────┘
```

**Why this works**: The base64url alphabet is `[A-Za-z0-9_-]` which **never contains `:`**. The legacy format always contains `:` as the key-value separator. This makes detection unambiguous.

## Decompression: Rebuilding Counts

Decompression requires **both** the progress string and the current `partsData[]` (the set's part definitions loaded from the API):

```
decompressProgress(progressString, partsData)

    ┌──────────────────────────────────────────────────────────────┐
    │                                                              │
    │  1. Inflate + JSON.parse → [version, mode, ...entries]       │
    │                                                              │
    │  2. Build lookup from partsData:                             │
    │     "3001|5|0" → { key: "3001_Red", quantity: 5 }            │
    │     "3004|11|0" → { key: "3004_Blue", quantity: 3 }          │
    │     "fig-001234|0|2" → { key: "fig-001234", quantity: 1 }    │
    │                                                              │
    │  3. For each entry [partNum, colorId, count, type]:          │
    │                                                              │
    │     Mode 0 (picked):                                         │
    │       counts[key] = count                                    │
    │                                                              │
    │     Mode 1 (remaining):                                      │
    │       counts[key] = quantity - count                         │
    │                                                              │
    │  4. Mode 1 only — parts NOT in entry list:                   │
    │       counts[key] = quantity   (fully complete)              │
    │                                                              │
    └──────────────────────────────────────────────────────────────┘
```

The lookup table maps `partNum|colorId|type` → the in-app part key (e.g. `"3001_Red"`) and required quantity. This is how numeric color IDs in the compressed format reconnect with the color-name-based keys used in `userCounts`.

## Migration from Legacy Format

The released app stored progress as plain text with color **names**: `"3001_Red:5,3004_Blue:3"`. Converting to the new format requires color **IDs**, which are only available from the Rebrickable API response.

Migration happens **lazily** — not during a bulk migration step, but on each set load:

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  User opens a set                                                │
│       │                                                          │
│       ▼                                                          │
│  API returns parts with color.id ──► processParts() builds       │
│                                       partsData[] with colorId   │
│       │                                                          │
│       ▼                                                          │
│  loadState() reads data.progress                                 │
│       │                                                          │
│       ├── contains ':'? ──► Legacy format                        │
│       │   Parse "3001_Red:5" → userCounts["3001_Red"] = 5        │
│       │                                                          │
│       └── no ':' ──► Compressed format                           │
│           Inflate + lookup → userCounts["3001_Red"] = 5          │
│       │                                                          │
│       ▼                                                          │
│  User interacts (or auto-save triggers)                          │
│       │                                                          │
│       ▼                                                          │
│  saveState() calls compressProgress(partsData, userCounts)       │
│       │                                                          │
│       ▼                                                          │
│  Progress now stored as compressed format                        │
│  (color IDs from partsData, not color names)                     │
│                                                                  │
│  ═══════════════════════════════════════════════════════════════ │
│  Legacy format is gone. Future loads use compressed path.        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Why lazy?** A bulk migration during `migrateLocalStorage()` would need to call the Rebrickable API for every saved set to get color IDs — impractical and slow. Instead, each set self-migrates the first time it's loaded after the update.

## Storage Comparison

### By Set Size

| Part Lots | Old Format | Compressed | Savings |
|---|---|---|---|
| 1 | 17 B | 30 B | -76% (overhead for tiny sets) |
| 3 | 53 B | 51 B | 4% |
| 10 | 181 B | 74 B | 59% |
| 50 | 958 B | 300 B | 69% |
| 100 | 1,928 B | 571 B | 70% |
| 500 | 10,089 B | 3,072 B | 70% |

### Millennium Falcon (726 lots) by Completion

| Completion | Mode | Entries | Compressed | Old Format | Savings |
|---|---|---|---|---|---|
| 0% | 0 | 0 | 0 B | 0 B | — |
| 10% | 0 | 73 | 411 B | 1,085 B | 62% |
| 25% | 0 | 182 | 1,058 B | 2,762 B | 62% |
| 50% | 0 | 363 | 2,011 B | 5,519 B | 64% |
| 75% | 1 | 181 | 1,056 B | 8,291 B | 87% |
| 90% | 1 | 73 | 414 B | 9,953 B | 96% |
| 95% | 1 | 36 | 222 B | 10,508 B | 98% |
| 100% | 1 | 0 | 10 B | 11,075 B | 99.9% |

The flipped perspective is most impactful at high completion — exactly where users have invested the most time and the data matters most.

## Implementation

### Functions

| Function | Purpose | Sync? |
|---|---|---|
| `compressProgress(partsData, userCounts)` | Encode counts → progress string | Yes |
| `decompressProgress(progressString, partsData)` | Decode progress string → `{key: count}` | Yes |
| `calculateProgressCompressed(numParts, progressString)` | Quick stats without partsData (for history display) | Yes |
| `calculateProgressFromString(numParts, progressString)` | Format-detecting wrapper (legacy + compressed) | Yes |

All functions are **synchronous**. This is why I use [pako](https://github.com/nicedoc/pako) (47 KB, 14 KB gzipped) for DEFLATE instead of the browser's native `CompressionStream` API, which is async/stream-based and would require making `saveState()`, `loadState()`, and the entire click-handler chain async.

### In-Memory Model

The compressed format is **only used at the localStorage boundary**. In memory, the app works with a simple `{key: count}` object:

```
┌────────────────────────────────────────────────────────────┐
│                        In Memory                           │
│                                                            │
│  userCounts = {                                            │
│    "3001_Red": 5,          // regular part                 │
│    "3004_Blue": 1,         // regular part                 │
│    "3001_Red_s": 2,        // spare part (_s suffix)       │
│    "fig-001234": 1         // minifigure                   │
│  }                                                         │
│                                                            │
│  Every button click mutates userCounts directly.           │
│  No compression/decompression during interaction.          │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                    localStorage                            │
│                                                            │
│  saveState() ──► compressProgress() ──► "izbUMdCJ..."      │
│  loadState() ◄── decompressProgress() ◄── "izbUMdCJ..."    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Part Type Encoding

| Type | Value | Part Key Format | Example |
|---|---|---|---|
| Regular part | `0` | `partNum_ColorName` | `3001_Red` |
| Spare part | `1` | `partNum_ColorName_s` | `3001_Red_s` |
| Minifigure | `2` | `fig_num` | `fig-001234` |

Color IDs in the compressed format are numeric Rebrickable API IDs (e.g. `5` for Red, `11` for Blue). Minifigures use `colorId: 0` since they don't have a color. The mapping between numeric IDs and color names happens through `partsData[]` during compression and decompression.

## Dependencies

- **[pako](https://github.com/nicedoc/pako)** — `js/pako.min.js` (47 KB raw, 14 KB gzipped). Provides `pako.deflateRaw()` and `pako.inflateRaw()` for synchronous DEFLATE compression. Listed in `sw.js` STATIC_ASSETS for offline support.

## Test Coverage

Tests in `tests/e2e/compressed-progress.spec.js`:

| Test | Scenario |
|---|---|
| CP.1 | Save stores compressed format (no `:` in progress string) |
| CP.2 | Round-trip: save → reload → counts restored correctly |
| CP.3 | Flipped mode: 100% complete stores less data than partial |
| CP.4 | 100% complete: progress is non-empty (distinguishes from 0%) |
| CP.5 | 0% complete after reset: progress is empty string |
| CP.6 | Spare parts preserved through compression round-trip |
| CP.7 | Minifigures preserved through compression round-trip |
| CP.8 | Legacy plain format in localStorage loads correctly |
| CP.9 | Migration: seed old format → load → save → now compressed |
