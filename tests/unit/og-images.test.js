import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const build = readFileSync(new URL('../../scripts/build-i18n.js', import.meta.url), 'utf8');
const locales = [...build.match(/const LOCALES = \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);

test('the build publishes proposal 04 for every locale and references the matching PNG', () => {
    execFileSync(process.execPath, ['scripts/build-i18n.js'], { cwd: root, stdio: 'pipe' });
    for (const locale of locales) {
        const html = readFileSync(new URL(`../../dist/${locale}/index.html`, import.meta.url), 'utf8');
        const imagePath = `assets/og/04-sorting-table-${locale}.png`;
        const imageUrl = `https://bricktally.app/${imagePath}`;
        assert.ok(html.includes(`<meta property="og:image" content="${imageUrl}">`), `${locale}: Open Graph image`);
        assert.ok(html.includes(`<meta name="twitter:image" content="${imageUrl}">`), `${locale}: Twitter image`);
        assert.ok(html.includes(`"image": "${imageUrl}"`), `${locale}: structured image`);
        assert.ok(html.includes('<meta property="og:image:width" content="1200">'));
        assert.ok(html.includes('<meta property="og:image:height" content="630">'));
        const png = readFileSync(new URL(`../../dist/${imagePath}`, import.meta.url));
        const original = readFileSync(new URL(`../../design/og-image-concepts-2026-10-15/final/${locale}/04-sorting-table-og.png`, import.meta.url));
        assert.deepEqual(png, original, `${locale}: approved rendering is unchanged`);
        assert.equal(png.readUInt32BE(16), 1200);
        assert.equal(png.readUInt32BE(20), 630);
        assert.ok(!html.includes('https://bricktally.app/assets/og-image.png'));
    }
    assert.equal(readFileSync(new URL('../../dist/index.html', import.meta.url), 'utf8'),
        readFileSync(new URL('../../dist/en/index.html', import.meta.url), 'utf8'));
});
