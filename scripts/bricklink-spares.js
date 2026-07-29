#!/usr/bin/env node
// Scrape the "Extra Items" (spare parts) of a set from BrickLink's catalog
// inventory page and print a ready-to-paste Rebrickable inventory change
// request, with BrickLink part/color IDs mapped to Rebrickable ones.
//
// Usage: node scripts/bricklink-spares.js <setNumber>   (e.g. 40433 or 40433-1)
//
// Requires REBRICKABLE_API_KEY in .env (same key the API proxy uses).
// Uses the repo's Playwright chromium because BrickLink blocks plain HTTP clients.

import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function getApiKey() {
    const env = readFileSync(join(ROOT, '.env'), 'utf8');
    const match = env.match(/^REBRICKABLE_API_KEY=(.+)$/m);
    if (!match) {
        console.error('REBRICKABLE_API_KEY not found in .env');
        process.exit(1);
    }
    return match[1].trim();
}

const args = process.argv.slice(2);
const noOpen = args.includes('--no-open');
const setArg = args.find((a) => !a.startsWith('--'));
if (!setArg) {
    console.error('Usage: node scripts/bricklink-spares.js <setNumber> [--no-open]');
    process.exit(1);
}
const fullNumber = setArg.includes('-') ? setArg : setArg + '-1';
const API_KEY = getApiKey();

async function rebrickable(path) {
    const res = await fetch('https://rebrickable.com/api/v3' + path, {
        headers: { Authorization: 'key ' + API_KEY }
    });
    if (!res.ok) throw new Error('Rebrickable API ' + res.status + ' for ' + path);
    return res.json();
}

// Small delay between API calls to stay under Rebrickable's rate limit
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scrapeBrickLinkExtras(setNumber) {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        });
        await page.goto('https://www.bricklink.com/catalogItemInv.asp?S=' + setNumber, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        // Cloudflare interstitial resolves itself; wait for the inventory table
        await page.waitForSelector('table', { timeout: 20000 });

        return await page.evaluate(() => {
            // Rows live in one big table; section headers are cells like
            // "Extra Items:" and "Counterparts:". Collect rows in between.
            const rows = Array.from(document.querySelectorAll('tr'));
            const items = [];
            let inExtras = false;
            for (const row of rows) {
                const text = (row.textContent || '').trim();
                if (/^Extra Items:/i.test(text)) { inExtras = true; continue; }
                if (inExtras && /^(Counterparts:|Alternate Items:|Summary:)/i.test(text)) break;
                if (!inExtras) continue;

                // An item row links to the part catalog page: catalogitem.page?P=<no>
                const partLink = row.querySelector('a[href*="catalogitem.page?P="]');
                if (!partLink) continue;
                const href = partLink.getAttribute('href');
                const partNo = new URLSearchParams(href.split('?')[1]).get('P');

                // Color id appears on the colored links in the same row (C= or idColor=)
                let colorId = null;
                for (const a of row.querySelectorAll('a[href]')) {
                    const q = a.getAttribute('href').split('?')[1];
                    if (!q) continue;
                    const params = new URLSearchParams(q);
                    const c = params.get('C') || params.get('idColor');
                    if (c) { colorId = parseInt(c, 10); break; }
                }

                const cells = Array.from(row.querySelectorAll('td')).map((td) => td.textContent.trim());
                const qty = parseInt(cells.find((t) => /^\d+$/.test(t)) || '0', 10);
                const desc = cells.reduce((a, b) => (b.length > a.length ? b : a), '');

                if (partNo && qty > 0) {
                    items.push({ blPartNo: partNo, blColorId: colorId, quantity: qty, description: desc });
                }
            }
            return items;
        });
    } finally {
        await browser.close();
    }
}

async function buildColorMap() {
    // Rebrickable colors carry their BrickLink external ids and names
    const data = await rebrickable('/lego/colors/?page_size=300');
    const byBlId = new Map();
    for (const color of data.results) {
        const bl = color.external_ids && color.external_ids.BrickLink;
        if (!bl || !bl.ext_ids) continue;
        for (const id of bl.ext_ids) {
            if (!byBlId.has(id)) byBlId.set(id, color);
        }
    }
    return byBlId;
}

async function mapPart(blPartNo) {
    const data = await rebrickable('/lego/parts/?bricklink_id=' + encodeURIComponent(blPartNo));
    if (data.results.length > 0) return data.results[0];
    // Fall back to the same part number — most classic parts share ids
    try {
        return await rebrickable('/lego/parts/' + encodeURIComponent(blPartNo) + '/');
    } catch (e) {
        return null;
    }
}

const extras = await scrapeBrickLinkExtras(fullNumber);
if (extras.length === 0) {
    console.log('BrickLink lists no Extra Items for ' + fullNumber + ' (or the page could not be parsed).');
    process.exit(0);
}
console.error('BrickLink Extra Items found: ' + extras.length + ' lots\n');

const colorMap = await buildColorMap();
await sleep(1100);

// Current Rebrickable inventory, to flag extras that are already recorded
const inv = await rebrickable('/lego/sets/' + fullNumber + '/parts/?page_size=1000');
const existingSpares = new Set(
    inv.results.filter((r) => r.is_spare).map((r) => r.part.part_num + ':' + r.color.id)
);

const lines = [];
const unmapped = [];
for (const item of extras) {
    await sleep(1100);
    const part = await mapPart(item.blPartNo);
    const color = item.blColorId !== null ? colorMap.get(item.blColorId) : null;
    if (!part || !color) {
        unmapped.push(item);
        continue;
    }
    const already = existingSpares.has(part.part_num + ':' + color.id);
    lines.push({
        partNum: part.part_num,
        partName: part.name,
        colorId: color.id,
        colorName: color.name,
        quantity: item.quantity,
        already: already
    });
}

const out = [];
out.push('Rebrickable inventory change request for set ' + fullNumber);
out.push('='.repeat(60));
out.push('Change type: Add spare parts (Is Spare = yes)');
out.push('Source: BrickLink confirmed inventory (sealed set contents),');
out.push('        https://www.bricklink.com/catalogItemInv.asp?S=' + fullNumber);
out.push('');
out.push('Qty | Part      | Color (RB id)        | Name');
out.push('----|-----------|----------------------|-----------------------------');
for (const l of lines) {
    const flag = l.already ? '  [already in inventory as spare]' : '';
    out.push(
        String(l.quantity).padStart(3) + ' | ' +
        l.partNum.padEnd(9) + ' | ' +
        (l.colorName + ' (' + l.colorId + ')').padEnd(20) + ' | ' +
        l.partName + flag
    );
}
if (unmapped.length > 0) {
    out.push('');
    out.push('Could not map automatically (add manually):');
    for (const u of unmapped) {
        out.push('  ' + u.quantity + 'x BrickLink ' + u.blPartNo + ' (BL color ' + u.blColorId + ') — ' + u.description);
    }
}

const report = out.join('\n');
const inventoryUrl = 'https://rebrickable.com/inventory/' + fullNumber + '/parts/';
console.log(report);
console.log('\nSubmit at: ' + inventoryUrl + ' → Change Requests');

// Convenience on macOS: put the report on the clipboard and open the
// inventory page so submitting is just paste-and-send
if (process.platform === 'darwin') {
    try {
        execFileSync('pbcopy', { input: report });
        console.error('\n✓ Report copied to clipboard');
        if (!noOpen) {
            execFileSync('open', [inventoryUrl]);
            console.error('✓ Opening ' + inventoryUrl);
        }
    } catch (e) {
        // Clipboard/browser are conveniences — the report is already printed
    }
}
