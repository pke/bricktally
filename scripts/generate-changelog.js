#!/usr/bin/env node

/**
 * Generate changelog.html from changelog.json
 *
 * Usage:
 *   node scripts/generate-changelog.js
 *
 * Reads changelog.json and produces a static changelog.html with all
 * release entries pre-rendered. No client-side fetch needed.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const changelog = JSON.parse(readFileSync(join(rootDir, 'changelog.json'), 'utf-8'));

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReleaseHtml(release) {
  const entries = release.entries
    .map(e => `        <li>${escapeHtml(e)}</li>`)
    .join('\n');

  return `    <div class="changelog-release">
      <div class="changelog-release-header">
        <span class="changelog-version">v${escapeHtml(release.version)}</span>
        <span class="changelog-date">${escapeHtml(release.date)}</span>
      </div>
      <h2 class="changelog-release-title">${escapeHtml(release.title)}</h2>
      <ul class="changelog-entries">
${entries}
      </ul>
    </div>`;
}

const releasesHtml = changelog
  .map((release) => buildReleaseHtml(release))
  .join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Changelog - BrickTally</title>
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">

  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json">

  <!-- Mobile Web App Meta Tags -->
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="BrickTally">

  <link rel="stylesheet" href="/styles.css">
</head>

<body class="changelog-page">
  <div class="container">
    <button class="theme-toggle" id="themeToggle" onclick="toggleDarkMode()">
      <span id="themeIcon">\uD83C\uDF19</span>
    </button>

    <h1 class="changelog-title">What\u2019s New in BrickTally</h1>
    <p class="changelog-subtitle">Every brick-counting improvement, one release at a time.</p>

    <div id="changelogContent">
${releasesHtml}
    </div>

    <a href="/" class="back-link">\u2190 Back to BrickTally</a>
  </div>

  <script>
    function loadDarkMode() {
      var darkMode = localStorage.getItem('darkMode');
      if (darkMode === 'true') {
        document.body.classList.add('dark-mode');
        updateThemeIcon();
      }
    }

    function toggleDarkMode() {
      document.body.classList.toggle('dark-mode');
      var isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('darkMode', isDark);
      updateThemeIcon();
    }

    function updateThemeIcon() {
      var icon = document.getElementById('themeIcon');
      if (icon) {
        icon.textContent = document.body.classList.contains('dark-mode') ? '\u2600\uFE0F' : '\uD83C\uDF19';
      }
    }

    loadDarkMode();
  </script>
</body>

</html>
`;

writeFileSync(join(rootDir, 'changelog.html'), html);
console.log(`Generated changelog.html with ${changelog.length} releases`);
