#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, cpSync } from 'fs';
import { resolve as pathResolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES = ['en', 'de', 'fr', 'es', 'nl', 'da', 'ja', 'ko', 'ru', 'zh-CN', 'zh-TW'];
const ROOT = pathResolve(__dirname, '..');
const DIST = join(ROOT, 'dist');
const OG_RENDERINGS = join(ROOT, 'design', 'og-image-concepts-2026-10-15', 'final');
const OG_IMAGE_BASE = 'https://bricktally.app/assets/og/04-sorting-table-';

// Publish the approved, pre-rendered images without image-generation dependencies.
// Validate every locale before replacing the existing build output.
LOCALES.forEach(locale => {
    const source = join(OG_RENDERINGS, locale, '04-sorting-table-og.png');
    if (!existsSync(source)) throw new Error('Missing approved Open Graph image: ' + source);
});

// Clean dist
if (existsSync(DIST)) {
    rmSync(DIST, { recursive: true });
}
mkdirSync(DIST, { recursive: true });

// Read template
let template = readFileSync(join(ROOT, 'index.html'), 'utf8');
const versionedAssets = ['styles.css', 'js/ui.js', 'js/landing.js', 'js/missing-share.js', 'js/missing-codec.js'];
const assetHash = createHash('sha256');
[...versionedAssets, 'data/example-set.json', 'assets/examples/31109-1.jpg', 'assets/examples/3004-red.jpg']
    .forEach(file => assetHash.update(file).update(readFileSync(join(ROOT, file))));
const assetVersion = assetHash.digest('hex').slice(0, 12);
// Even an older service worker must fetch CSS/JS that matches the new HTML.
template = template.replace(/((?:href|src)=")(\/?(?:styles\.css|js\/(?:ui|landing|missing-share)\.js))"/g,
    '$1$2?v=' + assetVersion + '"');

// Build provenance belongs to the build, not the source commit itself.
const buildDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
let commitSha = process.env.VERCEL_GIT_COMMIT_SHA || '';
let localChanges = false;
if (!commitSha) {
    try {
        commitSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim();
        localChanges = !!execFileSync('git', ['status', '--porcelain'], { cwd: ROOT }).toString().trim();
    } catch (e) {
        commitSha = ''; // no git available — leave the footer as committed
    }
}
if (!/^[a-f0-9]{7,40}$/i.test(commitSha)) commitSha = '';
template = template.replace(
    /(id="versionInfo"[^>]*>v[\d.]+)(?: \([^)]*\))?(?=<)/, '$1'
).replace('id="versionInfo"', 'id="versionInfo" data-build-date="' + buildDate +
    '" data-commit="' + commitSha + '" data-local-changes="' + localChanges + '"');

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
                    // Match the translated element's closing tag, not a nested
                    // link's closing tag, so no original text remains behind.
                    const element = line.match(/<([a-z][\w:-]*)\b[^>]*\bdata-i18n=/i);
                    if (element) {
                        const start = line.indexOf('>', element.index) + 1;
                        const end = line.lastIndexOf('</' + element[1] + '>');
                        if (start > 0 && end >= start) line = line.slice(0, start) + value + line.slice(end);
                    }
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
    output = output.replaceAll(OG_IMAGE_BASE + 'en.png', OG_IMAGE_BASE + locale + '.png');

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
        if (file === 'sw.js') {
            const versioned = versionedAssets.map(asset => "    '/" + asset + '?v=' + assetVersion + "',").join('\n');
            const worker = readFileSync(src, 'utf8')
                .replace(/(const CACHE_VERSION = '[^']*)';/, '$1-' + assetVersion + "';")
                .replace('const STATIC_ASSETS = [', 'const STATIC_ASSETS = [\n' + versioned);
            writeFileSync(join(DIST, file), worker);
        } else copyFileSync(src, join(DIST, file));
    }
});

dirsToCopy.forEach(function(dir) {
    const src = join(ROOT, dir);
    if (existsSync(src)) {
        cpSync(src, join(DIST, dir), { recursive: true });
    }
});

const ogOutput = join(DIST, 'assets', 'og');
mkdirSync(ogOutput, { recursive: true });
LOCALES.forEach(locale => {
    copyFileSync(join(OG_RENDERINGS, locale, '04-sorting-table-og.png'),
        join(ogOutput, '04-sorting-table-' + locale + '.png'));
});

const shareModule = readFileSync(join(ROOT, 'js', 'missing-share.js'), 'utf8')
    .replace("from './missing-codec.js'", "from './missing-codec.js?v=" + assetVersion + "'");
writeFileSync(join(DIST, 'js', 'missing-share.js'), shareModule);

// Copy api/ directory (Vercel serverless functions)
const apiSrc = join(ROOT, 'api');
if (existsSync(apiSrc)) {
    cpSync(apiSrc, join(DIST, 'api'), { recursive: true });
}

console.log('Build complete: ' + LOCALES.length + ' locales');
