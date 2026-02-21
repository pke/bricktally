#!/usr/bin/env node

// Compare binary pack vs compressed JSON for LEGO set progress storage
// Usage: REBRICKABLE_API_KEY=xxx node scripts/compare-compression.js 75192

import pako from 'pako';

const API_KEY = process.env.REBRICKABLE_API_KEY;
if (!API_KEY) {
  console.error('Missing REBRICKABLE_API_KEY environment variable');
  process.exit(1);
}

const setNumber = process.argv[2];
if (!setNumber) {
  console.error('Usage: node scripts/compare-compression.js <set-number>');
  console.error('Example: node scripts/compare-compression.js 75192');
  process.exit(1);
}

const BASE_URL = 'https://rebrickable.com/api/v3';

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: { Authorization: `key ${API_KEY}` }
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchAllParts(setNum) {
  const parts = [];
  let url = `${BASE_URL}/lego/sets/${setNum}/parts/?page_size=1000`;
  while (url) {
    const data = await fetchJSON(url);
    parts.push(...data.results);
    url = data.next;
  }
  return parts;
}

async function fetchAllMinifigs(setNum) {
  const figs = [];
  let url = `${BASE_URL}/lego/sets/${setNum}/minifigs/?page_size=1000`;
  while (url) {
    const data = await fetchJSON(url);
    figs.push(...data.results);
    url = data.next;
  }
  return figs;
}

// Simulate picked counts at a given completion percentage
function simulatePicked(parts, minifigs, pct) {
  const simParts = parts.map(p => {
    const qty = p.quantity;
    let picked;
    if (pct >= 1.0) {
      picked = qty;
    } else {
      // Each lot independently has `pct` chance of being fully picked,
      // otherwise partial random count
      picked = Math.random() < pct
        ? qty
        : Math.floor(Math.random() * qty);
    }
    return { ...p, _picked: picked };
  });
  const simMinifigs = minifigs.map(m => {
    const picked = Math.random() < pct ? m.quantity : 0;
    return { ...m, _picked: picked };
  });
  return { simParts, simMinifigs };
}

// --- Current format: "partNum_Color:count,..." (only picked > 0) ---

function buildCurrentFormat(parts, minifigs) {
  const entries = [];
  for (const p of parts) {
    if (p._picked <= 0) continue;
    const color = p.color?.name || 'Unknown';
    const partNum = p.part?.part_num || '0';
    const key = p.is_spare ? `${partNum}_${color}_s` : `${partNum}_${color}`;
    entries.push(`${key}:${p._picked}`);
  }
  for (const m of minifigs) {
    if (m._picked <= 0) continue;
    entries.push(`fig_${m.set_num}:${m._picked}`);
  }
  return entries.join(',');
}

// --- Binary pack ---

const VERSION = 1;

function encodeBinary(parts, minifigs) {
  const entries = [];
  for (const p of parts) {
    if (p._picked <= 0) continue;
    entries.push({
      partNum: p.part?.part_num || '0',
      colorId: p.color?.id || 0,
      picked: p._picked,
      isSpare: p.is_spare || false,
      type: 'part'
    });
  }
  for (const m of minifigs) {
    if (m._picked <= 0) continue;
    entries.push({ partNum: m.set_num, colorId: 0, picked: m._picked, isSpare: false, type: 'minifig' });
  }

  // version(1) + per entry: type(1) + partNumLen(1) + partNum(N) + colorId(2) + picked(2)
  let size = 1;
  for (const e of entries) {
    size += 1 + 1 + e.partNum.length + 2 + 2;
  }

  const buf = new ArrayBuffer(size);
  const view = new DataView(buf);
  let offset = 0;

  view.setUint8(offset, VERSION);
  offset += 1;

  for (const e of entries) {
    view.setUint8(offset, e.type === 'minifig' ? 2 : (e.isSpare ? 1 : 0));
    offset += 1;

    view.setUint8(offset, e.partNum.length);
    offset += 1;
    for (let i = 0; i < e.partNum.length; i++) {
      view.setUint8(offset + i, e.partNum.charCodeAt(i));
    }
    offset += e.partNum.length;

    view.setUint16(offset, e.colorId);
    offset += 2;

    view.setUint16(offset, e.picked);
    offset += 2;
  }

  const raw = new Uint8Array(buf);
  const compressed = pako.deflate(raw, { level: 9 });
  const base64 = btoa(String.fromCharCode(...compressed))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { rawLen: raw.length, deflateLen: compressed.length, base64Len: base64.length };
}

// --- JSON array: [version, ["partNum", colorId, count, type], ...] ---

function encodeJSONArray(parts, minifigs) {
  const arr = [VERSION];
  for (const p of parts) {
    if (p._picked <= 0) continue;
    arr.push([p.part?.part_num || '0', p.color?.id || 0, p._picked, p.is_spare ? 1 : 0]);
  }
  for (const m of minifigs) {
    if (m._picked <= 0) continue;
    arr.push([m.set_num, 0, m._picked, 2]);
  }

  const json = JSON.stringify(arr);
  const compressed = pako.deflate(json, { level: 9 });
  const base64 = btoa(String.fromCharCode(...compressed))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { rawLen: json.length, deflateLen: compressed.length, base64Len: base64.length };
}

// --- JSON flipped: store picked or remaining, whichever is smaller ---
// Format: [version, mode, [...entries]]
//   mode 0 = entries are picked counts
//   mode 1 = entries are remaining counts (qty - picked)

function encodeJSONFlipped(parts, minifigs) {
  // Build both lists
  const pickedEntries = [];
  const remainingEntries = [];

  for (const p of parts) {
    const partNum = p.part?.part_num || '0';
    const colorId = p.color?.id || 0;
    const type = p.is_spare ? 1 : 0;
    if (p._picked > 0) {
      pickedEntries.push([partNum, colorId, p._picked, type]);
    }
    const remaining = p.quantity - p._picked;
    if (remaining > 0) {
      remainingEntries.push([partNum, colorId, remaining, type]);
    }
  }
  for (const m of minifigs) {
    if (m._picked > 0) {
      pickedEntries.push([m.set_num, 0, m._picked, 2]);
    }
    const remaining = m.quantity - m._picked;
    if (remaining > 0) {
      remainingEntries.push([m.set_num, 0, remaining, 2]);
    }
  }

  // Pick the smaller list
  const usePicked = pickedEntries.length <= remainingEntries.length;
  const mode = usePicked ? 0 : 1;
  const entries = usePicked ? pickedEntries : remainingEntries;

  const arr = [VERSION, mode, ...entries];
  const json = JSON.stringify(arr);
  const compressed = pako.deflate(json, { level: 9 });
  const base64 = btoa(String.fromCharCode(...compressed))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return {
    rawLen: json.length,
    deflateLen: compressed.length,
    base64Len: base64.length,
    mode: usePicked ? 'picked' : 'remaining',
    entryCount: entries.length
  };
}

// --- Display ---

function printTable(label, scenarios) {
  const W = 26; // format column width
  console.log(`\n  ${label}`);
  console.log(`  ┌${'─'.repeat(W + 2)}┬──────────┬───────────┬───────────┐`);
  console.log(`  │ ${'Format'.padEnd(W)} │ Raw      │ Deflated  │ Base64    │`);
  console.log(`  ├${'─'.repeat(W + 2)}┼──────────┼───────────┼───────────┤`);

  const pad = (s, n) => String(s).padStart(n);

  for (const s of scenarios) {
    if (s.deflateLen === null) {
      console.log(`  │ ${s.label.padEnd(W)} │ ${pad(s.rawLen, 7)}B │       n/a │       n/a │`);
    } else {
      console.log(`  │ ${s.label.padEnd(W)} │ ${pad(s.rawLen, 7)}B │ ${pad(s.deflateLen, 8)}B │ ${pad(s.base64Len, 8)}B │`);
    }
  }

  console.log(`  └${'─'.repeat(W + 2)}┴──────────┴───────────┴───────────┘`);

  const current = scenarios[0];
  for (let i = 1; i < scenarios.length; i++) {
    const s = scenarios[i];
    const ratio = ((1 - s.base64Len / current.rawLen) * 100).toFixed(1);
    console.log(`  ${s.label} vs current: ${ratio}% smaller`);
  }
}

// --- Main ---

async function main() {
  let fullSetNum = setNumber;
  if (!fullSetNum.includes('-')) fullSetNum += '-1';

  console.log(`\nFetching set ${fullSetNum} from Rebrickable...`);

  const [setInfo, parts, minifigs] = await Promise.all([
    fetchJSON(`${BASE_URL}/lego/sets/${fullSetNum}/`),
    fetchAllParts(fullSetNum),
    fetchAllMinifigs(fullSetNum)
  ]);

  console.log(`Set: ${setInfo.name}`);
  console.log(`Parts: ${setInfo.num_parts} (${parts.length} lots, ${minifigs.length} minifigs)`);

  const scenarios = [
    { pct: 0.25, label: '25% complete' },
    { pct: 0.50, label: '50% complete' },
    { pct: 0.75, label: '75% complete' },
    { pct: 0.90, label: '90% complete' },
    { pct: 1.00, label: '100% complete' }
  ];

  for (const scenario of scenarios) {
    const { simParts, simMinifigs } = simulatePicked(parts, minifigs, scenario.pct);

    const currentStr = buildCurrentFormat(simParts, simMinifigs);
    const binary = encodeBinary(simParts, simMinifigs);
    const jsonArr = encodeJSONArray(simParts, simMinifigs);
    const jsonFlipped = encodeJSONFlipped(simParts, simMinifigs);

    printTable(`${scenario.label}`, [
      { label: 'Current string', rawLen: currentStr.length, deflateLen: null, base64Len: null },
      { label: 'Binary pack', ...binary },
      { label: 'JSON array (picked)', ...jsonArr },
      { label: `JSON flipped (${jsonFlipped.mode})`, ...jsonFlipped }
    ]);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
