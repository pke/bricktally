#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, cpSync } from 'fs';
import { resolve as pathResolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES = ['en', 'de', 'fr', 'es', 'nl', 'da', 'ja', 'ko', 'ru', 'zh-CN', 'zh-TW'];
const ROOT = pathResolve(__dirname, '..');
const DIST = join(ROOT, 'dist');

// Clean dist
if (existsSync(DIST)) {
    rmSync(DIST, { recursive: true });
}
mkdirSync(DIST, { recursive: true });

// Read template
let template = readFileSync(join(ROOT, 'index.html'), 'utf8');

// Stamp the deployed commit hash into the footer version link. The post-commit
// hook stamps only the version — a commit cannot contain its own hash — so the
// hash is added here at build time, when HEAD is final.
let commitSha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);
if (!commitSha) {
    try {
        commitSha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim();
    } catch (e) {
        commitSha = ''; // no git available — leave the footer as committed
    }
}
if (commitSha) {
    template = template.replace(
        /(id="versionInfo"[^>]*>v[\d.]+)(?: \([^)]*\))?(?=<)/,
        '$1 (' + commitSha + ')'
    );
}

// Helper: resolve nested key like "landing.heading" from translations object
function resolveKey(obj, keyPath) {
    return keyPath.split('.').reduce((o, k) => o && o[k] !== undefined ? o[k] : null, obj);
}

// Helper: replace data-i18n attributes in HTML
// Processes line by line to avoid cross-element regex issues
function translateStaticHTML(html, translations) {
    const lines = html.split('\n');
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const i18nMatch = line.match(/data-i18n="([^"]+)"/);
        if (!i18nMatch) {
            result.push(line);
            continue;
        }

        const i18nValue = i18nMatch[1];
        const parts = i18nValue.split(';');

        for (const part of parts) {
            const trimmed = part.trim();
            const attrMatch = trimmed.match(/^\[([^\]]+)\](.+)$/);
            if (attrMatch) {
                const attr = attrMatch[1];
                const key = attrMatch[2];
                const value = resolveKey(translations, key);
                if (value === null) continue;

                if (attr === 'html') {
                    // Replace innerHTML: content between > and </
                    line = line.replace(/(>)([\s\S]*?)(<\/)/, '$1' + value + '$3');
                } else {
                    // Replace attribute value
                    const attrRegex = new RegExp('(' + attr + '=")([^"]*)(")');
                    line = line.replace(attrRegex, '$1' + value + '$3');
                }
            } else {
                // Plain key — replace text content between > and </
                const value = resolveKey(translations, trimmed);
                if (value !== null) {
                    line = line.replace(/(>)([^<]*)(<\/)/, '$1' + value + '$3');
                }
            }
        }

        result.push(line);
    }

    return result.join('\n');
}

// Helper: replace meta tags
function translateMeta(html, translations) {
    const t = translations;

    if (t.meta && t.meta.title) {
        html = html.replace(/<title>[^<]*<\/title>/, '<title>' + t.meta.title + '</title>');
        html = html.replace(/(property="og:title"\s+content=")[^"]*"/, '$1' + t.meta.title + '"');
        html = html.replace(/(name="twitter:title"\s+content=")[^"]*"/, '$1' + t.meta.title + '"');
    }
    if (t.meta && t.meta.description) {
        html = html.replace(/(name="description"[\s\S]*?content=")[^"]*"/, '$1' + t.meta.description + '"');
    }
    if (t.meta && t.meta.ogDescription) {
        html = html.replace(/(property="og:description"[\s\S]*?content=")[^"]*"/, '$1' + t.meta.ogDescription + '"');
        html = html.replace(/(name="twitter:description"[\s\S]*?content=")[^"]*"/, '$1' + t.meta.ogDescription + '"');
    }
    if (t.meta && t.meta.keywords) {
        html = html.replace(/(name="keywords"[\s\S]*?content=")[^"]*"/, '$1' + t.meta.keywords + '"');
    }

    return html;
}

// Build each locale
const BASE_URL = 'https://bricktally.app';

LOCALES.forEach(function(locale) {
    console.log('Building locale: ' + locale);

    const localeFile = join(ROOT, 'locales', locale + '.json');
    if (!existsSync(localeFile)) {
        console.warn('  Warning: ' + localeFile + ' not found, skipping');
        return;
    }

    const translations = JSON.parse(readFileSync(localeFile, 'utf8'));
    let output = template;

    // 1. Replace <html lang="en">
    output = output.replace(/<html lang="[^"]*"/, '<html lang="' + locale + '"');

    // 2. Translate meta tags
    output = translateMeta(output, translations);

    // 3. Translate static HTML via data-i18n attributes
    output = translateStaticHTML(output, translations);

    // 4. Update canonical URL for this locale
    const localePrefix = locale === 'en' ? '' : '/' + locale;
    output = output.replace(
        /(<link rel="canonical" href=")[^"]*(")/,
        '$1' + BASE_URL + localePrefix + '/$2'
    );

    // 5. Add hreflang alternate links for SEO
    let hreflangLinks = LOCALES.map(function(l) {
        const prefix = l === 'en' ? '' : '/' + l;
        return '<link rel="alternate" hreflang="' + l + '" href="' + BASE_URL + prefix + '/">';
    }).join('\n    ');
    hreflangLinks += '\n    <link rel="alternate" hreflang="x-default" href="' + BASE_URL + '/">';
    output = output.replace('</head>', '    ' + hreflangLinks + '\n</head>');

    // 6. Embed translations for runtime i18next
    const embedScript = '<script>window.__LOCALE__="' + locale + '";window.__TRANSLATIONS__=' +
        JSON.stringify(translations) + ';</script>';
    output = output.replace('</head>', embedScript + '\n</head>');

    // Write locale output
    const localeDir = join(DIST, locale);
    mkdirSync(localeDir, { recursive: true });
    writeFileSync(join(localeDir, 'index.html'), output);
});

// Copy English as default root index.html
const enIndex = join(DIST, 'en', 'index.html');
if (existsSync(enIndex)) {
    copyFileSync(enIndex, join(DIST, 'index.html'));
}

// Copy static assets
const assetsToCopy = ['styles.css', 'sw.js', 'changelog.html', 'changelog.json'];
const dirsToCopy = ['js', 'assets', 'locales', 'data'];

assetsToCopy.forEach(function(file) {
    const src = join(ROOT, file);
    if (existsSync(src)) {
        copyFileSync(src, join(DIST, file));
    }
});

dirsToCopy.forEach(function(dir) {
    const src = join(ROOT, dir);
    if (existsSync(src)) {
        cpSync(src, join(DIST, dir), { recursive: true });
    }
});

// Copy api/ directory (Vercel serverless functions)
const apiSrc = join(ROOT, 'api');
if (existsSync(apiSrc)) {
    cpSync(apiSrc, join(DIST, 'api'), { recursive: true });
}

console.log('Build complete: ' + LOCALES.length + ' locales');
