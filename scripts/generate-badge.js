#!/usr/bin/env node

/**
 * Generate a BrickTally badge PNG from the command line using Playwright
 *
 * This script uses the actual BrickTally website to generate badges,
 * ensuring consistency between CLI and web app output.
 *
 * Usage:
 *   ./scripts/generate-badge.js [options]
 *
 * Options:
 *   --set-id <id>        Set number (e.g., 10294 or 10294-1) - default: random popular set
 *   --missing <n>        Missing pieces count (default: random 0-10%)
 *   --output <file>      Output file path (default: auto-generated like app)
 *   --help               Show this help
 *
 * Examples:
 *   ./scripts/generate-badge.js
 *   ./scripts/generate-badge.js --set-id 10294
 *   ./scripts/generate-badge.js --set-id 10294-1 --missing 3
 *   ./scripts/generate-badge.js --set-id 42100 --output my-badge.png
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find a free port
async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

// Start vercel dev server on a random free port
async function startDevServer() {
  const port = await getFreePort();

  console.log(`Starting vercel dev server on port ${port}...`);
  const serverProcess = spawn('npx', ['vercel', 'dev', '--listen', port.toString()], {
    cwd: path.resolve(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });

  // Wait for server to be ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 30000);

    const checkReady = () => {
      const check = net.createConnection({ port }, () => {
        check.destroy();
        clearTimeout(timeout);
        resolve();
      });
      check.on('error', () => {
        setTimeout(checkReady, 500);
      });
    };

    serverProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    checkReady();
  });

  console.log('Server ready.');
  return { process: serverProcess, port };
}

// Popular LEGO sets to use as random defaults
const POPULAR_SETS = [
  '10294',  // Titanic
  '42100',  // Liebherr R 9800 Excavator
  '75192',  // Millennium Falcon
  '10276',  // Colosseum
  '71043',  // Hogwarts Castle
  '10307',  // Eiffel Tower
  '42131',  // CAT D11 Bulldozer
  '10300',  // Back to the Future Time Machine
  '76240',  // Batmobile Tumbler
  '21054',  // The White House
];

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    setId: null,
    missing: null,  // null means random, 0 means complete
    output: null   // Will be auto-generated if not provided
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--set-id':
        options.setId = args[++i];
        break;
      case '--missing':
        options.missing = parseInt(args[++i], 10);
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--help':
        console.log(`
BrickTally Badge Generator

Usage:
  ./scripts/generate-badge.js [options]

Options:
  --set-id <id>        Set number (e.g., 10294 or 10294-1) - default: random popular set
  --missing <n>        Missing pieces count (default: random 0-10%, use 0 for complete)
  --output <file>      Output file path (default: bricktally-<set-id>-<set-name>-<missing>.png)
  --help               Show this help

Examples:
  ./scripts/generate-badge.js
  ./scripts/generate-badge.js --set-id 10294
  ./scripts/generate-badge.js --set-id 10294-1 --missing 3
  ./scripts/generate-badge.js --set-id 42100 --output my-badge.png
`);
        process.exit(0);
    }
  }

  // Pick a random popular set if none provided
  if (!options.setId) {
    options.setId = POPULAR_SETS[Math.floor(Math.random() * POPULAR_SETS.length)];
  }

  return options;
}

// Main
async function main() {
  const options = parseArgs();

  // Start dev server
  const server = await startDevServer();

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();


  try {
    // Navigate to BrickTally
    const url = `http://localhost:${server.port}`;
    console.log(`Opening ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Enter set number and load
    console.log(`Loading set ${options.setId}...`);

    // The input is type="number", so we need to handle hyphens properly
    await page.locator('#setNumber').evaluate(el => { el.type = 'text'; });
    await page.fill('#setNumber', options.setId);
    await page.click('#loadButton');

    // Wait for loading indicator to appear and disappear, or for set info to show
    await page.waitForFunction(() => {
      const loading = document.querySelector('#loading');
      const setInfo = document.querySelector('#setInfo');
      const versionModal = document.querySelector('#versionModal');
      const error = document.querySelector('#error');

      // Either loading is done (hidden) and setInfo is visible, or we have an error or version modal
      const loadingHidden = loading && loading.classList.contains('hide');
      const setInfoVisible = setInfo && !setInfo.classList.contains('hide');
      const versionVisible = versionModal && !versionModal.classList.contains('hide');
      const errorVisible = error && !error.classList.contains('hide');

      return (loadingHidden && setInfoVisible) || versionVisible || errorVisible;
    }, { timeout: 60000 });

    // Check for error
    const hasError = await page.evaluate(() => {
      const error = document.querySelector('#error');
      return error && !error.classList.contains('hide') ? error.textContent : null;
    });
    if (hasError) {
      throw new Error(`Failed to load set: ${hasError}`);
    }

    // If version selector appears, pick the first version
    const versionVisible = await page.evaluate(() => {
      const modal = document.querySelector('#versionModal');
      return modal && !modal.classList.contains('hide');
    });
    if (versionVisible) {
      console.log('Multiple versions found, selecting first...');
      await page.click('#versionModal .version-option:first-child');
      await page.waitForFunction(() => {
        const setInfo = document.querySelector('#setInfo');
        return setInfo && !setInfo.classList.contains('hide');
      }, { timeout: 30000 });
    }

    // Wait for parts to load - look for table rows with part-card class or table rows in tableContainer
    await page.waitForFunction(() => {
      const partsData = window.partsData;
      return partsData && partsData.length > 0;
    }, { timeout: 30000 });

    // Get set info from the page
    const setInfo = await page.evaluate(() => {
      const setName = document.querySelector('#setName')?.textContent || 'Unknown Set';
      const setNumber = document.querySelector('#setNumber')?.value || '';
      // Only count non-spare parts for totalPieces
      const totalPieces = window.partsData?.filter(p => !p.isSpare).reduce((sum, p) => sum + p.quantity, 0) || 0;
      const totalMinifigs = window.minifigsData?.length || 0;
      return { setName, setNumber, totalPieces, totalMinifigs, totalItems: totalPieces + totalMinifigs };
    });

    console.log(`  Set: ${setInfo.setNumber} - ${setInfo.setName}`);
    console.log(`  Total pieces: ${setInfo.totalPieces}`);
    if (setInfo.totalMinifigs > 0) {
      console.log(`  Total minifigs: ${setInfo.totalMinifigs}`);
    }

    // Determine how many pieces to mark as found (completed)
    let targetMissing = options.missing;
    if (targetMissing === null) {
      // Random missing: 0-10% of total items
      const maxMissing = Math.max(1, Math.floor(setInfo.totalItems * 0.1));
      targetMissing = Math.floor(Math.random() * (maxMissing + 1));
    }
    const targetCompleted = setInfo.totalItems - targetMissing;

    console.log(`  Target missing: ${targetMissing}${options.missing === null ? ' (random)' : ''}`);

    // Mark parts as found by directly setting userCounts object
    console.log('Marking parts as found...');

    const markedCount = await page.evaluate((targetCompleted) => {
      let currentCompleted = 0;

      // Fill regular parts first
      for (const part of window.partsData || []) {
        if (part.isSpare) continue;
        if (currentCompleted >= targetCompleted) break;

        const key = window.getPartKey(part);
        const qtyToMark = Math.min(part.quantity, targetCompleted - currentCompleted);
        window.userCounts[key] = qtyToMark;
        currentCompleted += qtyToMark;
      }

      // Fill minifigs if needed
      for (const minifig of window.minifigsData || []) {
        if (currentCompleted >= targetCompleted) break;

        const key = window.getPartKey(minifig);
        window.userCounts[key] = 1;
        currentCompleted++;
      }

      // Trigger UI update
      window.updateStats();
      window.renderTable();
      window.saveState();

      return currentCompleted;
    }, targetCompleted);

    console.log(`  Marked ${markedCount} items as found`);

    // Get actual completion stats from the progress bar data attributes
    const stats = await page.evaluate(() => {
      const progressBar = document.querySelector('#progressBar');
      const completedSpan = document.querySelector('#completedPieces');
      const totalSpan = document.querySelector('#totalPieces');

      const completed = completedSpan ? parseInt(completedSpan.textContent, 10) : 0;
      const total = totalSpan ? parseInt(totalSpan.textContent, 10) : 0;
      const percentage = progressBar ? progressBar.getAttribute('data-percentage') : '0%';

      return { completed, total, percentage };
    });

    const actualMissing = stats.total - stats.completed;
    const percentage = stats.total > 0 ? Math.floor((stats.completed / stats.total) * 100) : 0;

    console.log(`  Actual: ${stats.completed}/${stats.total} (${percentage}%)`);
    console.log(`  Missing: ${actualMissing}`);

    // Wait for set image to load (for badge generation)
    // Note: Image may still show "No Image" due to CORS restrictions on canvas
    try {
      await page.waitForFunction(() => {
        const img = document.querySelector('#setDetails img');
        return img && img.complete && img.naturalWidth > 0;
      }, { timeout: 5000 });
    } catch {
      // Image may not load, continue anyway
    }

    // Open Export section and click Generate Badge
    console.log('Generating badge...');

    // Click to expand export section
    await page.click('#exportFilterHeader');
    await page.waitForTimeout(300);

    // Wait for export section to be visible
    await page.waitForSelector('#exportFilterSection button.export-btn', { state: 'visible', timeout: 5000 });

    // Click Generate Badge button (the first export button with green background)
    await page.click('button[onclick="generateBadge()"]');

    // Wait for badge modal to appear - look for the badge header
    await page.waitForSelector('text=BrickTally Badge', { timeout: 15000 });
    await page.waitForTimeout(500); // Wait for badge image to render

    // Get the badge image - could be data URL or hosted URL depending on site version
    const badgeInfo = await page.evaluate(() => {
      // Find all images on the page
      const imgs = document.querySelectorAll('img');
      for (const img of imgs) {
        // Skip tiny images (likely icons) and part images
        if (img.width < 200 || img.height < 100) continue;

        // Check if it's a badge image (data URL or contains badge-related URL)
        const src = img.src || '';
        if (src.includes('data:image/png;base64,')) {
          return { type: 'dataUrl', src };
        }
        if (src.includes('badge') || src.includes('bricktally')) {
          return { type: 'url', src };
        }
      }

      // Fallback: find image by alt text
      const badgeImg = document.querySelector('img[alt*="Badge"], img[alt*="badge"]');
      if (badgeImg && badgeImg.src) {
        const src = badgeImg.src;
        if (src.includes('data:image')) {
          return { type: 'dataUrl', src };
        }
        return { type: 'url', src };
      }

      return null;
    });

    if (!badgeInfo) {
      await page.screenshot({ path: '/tmp/badge-debug2.png', fullPage: true });
      console.log('  Debug screenshot saved to /tmp/badge-debug2.png');
      throw new Error('Could not find badge image in modal');
    }

    let badgeDataUrl;
    if (badgeInfo.type === 'dataUrl') {
      badgeDataUrl = badgeInfo.src;
    } else {
      // Fetch the image URL and convert to data URL
      console.log(`  Fetching badge from: ${badgeInfo.src.substring(0, 60)}...`);
      const response = await fetch(badgeInfo.src);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      badgeDataUrl = `data:image/png;base64,${base64}`;
    }

    // Get the suggested filename - try different selectors for local vs remote
    const suggestedFilename = await page.evaluate(() => {
      // Try the download link first (local version)
      let link = document.querySelector('#badgeDownload');
      if (link) return link.getAttribute('download');

      // Try looking for any download link with .png filename
      const links = document.querySelectorAll('a[download]');
      for (const l of links) {
        const dl = l.getAttribute('download');
        if (dl && dl.endsWith('.png')) return dl;
      }
      return null;
    });

    // Determine output path
    const outputFile = options.output || './' + (suggestedFilename || `bricktally-${options.setId}-${actualMissing}-missing.png`);

    // Extract base64 data and save as PNG
    const base64Data = badgeDataUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const outputPath = path.resolve(outputFile);
    fs.writeFileSync(outputPath, imageBuffer);

    console.log(`\nBadge saved to: ${outputPath}`);

  } finally {
    await browser.close();

    // Kill the dev server
    process.kill(-server.process.pid);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
