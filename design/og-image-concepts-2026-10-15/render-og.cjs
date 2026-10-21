#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const DIR = __dirname;
const ROOT = path.resolve(DIR, '../..');
function dependency(name) {
  try { return require(name); } catch (firstError) {
    const roots = [process.env.OG_NODE_MODULES, path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')].filter(Boolean);
    for (const root of roots) { try { return require(path.join(root, name)); } catch {} }
    throw new Error('Missing dependency ' + name + '. Run npm install in ' + DIR + '.', { cause: firstError });
  }
}
const sharp = dependency('sharp');
const { createCanvas, SvgExportFlag, GlobalFonts } = dependency('@napi-rs/canvas');
const escapeXML = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const hash = value => createHash('sha256').update(value).digest('hex');
const normalize = value => value.replace(/\s/gu, '');
const fontCandidates = {
  latin: ['Arial', 'Liberation Sans', 'Noto Sans', 'DejaVu Sans'],
  ja: ['Yu Gothic', 'Noto Sans CJK JP', 'Noto Sans JP', 'Meiryo'],
  ko: ['Malgun Gothic', 'Noto Sans CJK KR', 'Noto Sans KR'],
  'zh-CN': ['DengXian', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Noto Sans SC'],
  'zh-TW': ['Microsoft JhengHei', 'Noto Sans CJK TC', 'Noto Sans TC']
};
function chooseFonts(locale) {
  function choose(key) {
    const family = fontCandidates[key].find(name => GlobalFonts.has(name));
    if (!family) throw new Error('No font for ' + key + '. Install one of: ' + fontCandidates[key].join(', ') + '; or use --font-dir.');
    return family;
  }
  return { brand: choose('latin'), body: choose(fontCandidates[locale] ? locale : 'latin') };
}
function validateCopy(copy, locale) {
  if (!copy || typeof copy !== 'object') throw new Error('Missing copy for ' + locale);
  for (const key of ['language', 'brand', 'claim', 'description']) {
    if (typeof copy[key] !== 'string' || !copy[key].trim() || copy[key].length > 2000) throw new Error(locale + ': invalid ' + key);
  }
  if (!Array.isArray(copy.features) || copy.features.length !== 3 || copy.features.some(text => typeof text !== 'string' || !text.trim() || text.length > 2000)) throw new Error(locale + ': features must contain exactly three nonempty strings.');
}
function setFont(ctx, family, size, weight = 400) { ctx.font = weight + ' ' + size + 'px "' + family + '"'; ctx.letterSpacing = '0px'; }
function wrapText(ctx, input, maxWidth, locale) {
  const lines = [];
  const wordSegmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  const graphemeSegmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
  for (const paragraph of input.split(/\r?\n/)) {
    let line = '';
    const words = [...wordSegmenter.segment(paragraph)].map(item => item.segment);
    const tokens = words.flatMap(word => ctx.measureText(word).width <= maxWidth ? [word] : [...graphemeSegmenter.segment(word)].map(item => item.segment));
    for (const token of tokens) {
      if (!line && /^\s+$/u.test(token)) continue;
      const next = line + token;
      // Keep closing punctuation with the preceding word; a too-wide line
      // causes a smaller font or a clear layout error, never silent clipping.
      if (line && ctx.measureText(next.trimEnd()).width > maxWidth && !/^\s+$/u.test(token) && !/^[、。，．！？：；％%)\]】」』》〉]/u.test(token)) {
        lines.push(line.trimEnd()); line = token.trimStart();
      } else line = next;
    }
    if (line.trim()) lines.push(line.trim());
  }
  // Balance wrapped Latin/Cyrillic paragraphs to avoid an orphaned final
  // word. Percentage values remain a single movable unit.
  for (let index = lines.length - 1; index > 0; index--) {
    while (true) {
      const previous = lines[index - 1], next = lines[index];
      const tail = previous.match(/(?:\d+(?:[.,]\d+)*\s+%|\S+)$/u);
      if (!tail || tail.index === 0) break;
      const shortened = previous.slice(0, tail.index).trimEnd();
      const extended = tail[0] + ' ' + next;
      const oldDifference = Math.abs(ctx.measureText(previous).width - ctx.measureText(next).width);
      const newDifference = Math.abs(ctx.measureText(shortened).width - ctx.measureText(extended).width);
      if (ctx.measureText(extended).width > maxWidth || newDifference >= oldDifference) break;
      lines[index - 1] = shortened; lines[index] = extended;
    }
  }
  if (normalize(lines.join('')) !== normalize(input)) throw new Error('Line wrapping lost copy.');
  return lines;
}
function makeLayout(template, copy, locale, fonts = chooseFonts(locale)) {
  validateCopy(copy, locale);
  const ctx = createCanvas(1200, 630).getContext('2d');
  const { x, width, bottom } = template.textBox;
  for (let pass = 0; pass < 8; pass++) {
    const scale = 1 - pass * 0.025;
    const blocks = [];
    let valid = true;
    function block(key, content, size, weight, baseline, maxLines, family, blockX = x, blockWidth = width) {
      setFont(ctx, family, size, weight);
      const lines = wrapText(ctx, content, blockWidth, locale);
      const lineHeight = size * 1.28;
      if (lines.length > maxLines) valid = false;
      const lineInfo = lines.map((text, i) => {
        const m = ctx.measureText(text);
        if (m.width > blockWidth + 0.05 || blockX + m.actualBoundingBoxRight > x + width + 1 || blockX - m.actualBoundingBoxLeft < x - 1) valid = false;
        return { text, x: blockX, baseline: baseline + i * lineHeight, width: m.width, top: baseline + i * lineHeight - m.actualBoundingBoxAscent, bottom: baseline + i * lineHeight + m.actualBoundingBoxDescent };
      });
      blocks.push({ key, original: content, font: family, size, weight, lineHeight, lines: lineInfo });
      return baseline + (lines.length - 1) * lineHeight;
    }
    const brandSize = 74 * scale;
    let baseline = block('brand', copy.brand, brandSize, 700, 188, 1, fonts.brand);
    baseline = block('claim', copy.claim, 34 * scale, 700, baseline + 56 * scale, 2, fonts.body);
    baseline = block('description', copy.description, 21 * scale, 400, baseline + 52 * scale, 3, fonts.body);
    baseline += 77 * scale;
    for (let i = 0; i < 3; i++) {
      baseline = block('feature' + (i + 1), copy.features[i], 19 * scale, 400, baseline, 3, fonts.body, x + 36, width - 36);
      if (i < 2) baseline += 49 * scale;
    }
    const bounds = blocks.flatMap(b => b.lines);
    if (valid && bounds.every(line => line.top >= 70 && line.bottom <= bottom)) return { scale, fonts, textBox: template.textBox, blocks };
  }
  throw new Error(locale + '/' + template.id + ': copy does not fit the text-safe area at readable sizes. Shorten copy or explicitly edit templates.json; nothing was truncated.');
}
function drawOverlay(template, layout) {
  const canvas = createCanvas(1200, 630, SvgExportFlag.ConvertTextToPaths);
  const ctx = canvas.getContext('2d');
  const dark = template.theme === 'dark';
  const colors = { brand: dark ? '#FFFFFF' : '#112B4B', claim: dark ? '#FFD54F' : '#946000', body: dark ? '#D8E7FA' : '#34506B' };
  // Deliberately no decorative line above the brand.
  for (const b of layout.blocks) {
    setFont(ctx, b.font, b.size, b.weight);
    ctx.fillStyle = colors[b.key] || colors.body;
    for (const line of b.lines) ctx.fillText(line.text, line.x, line.baseline);
    if (b.key.startsWith('feature')) {
      const x = layout.textBox.x, y = b.lines[0].baseline - 7 * layout.scale;
      ctx.beginPath(); ctx.arc(x + 12, y, 12 * layout.scale, 0, Math.PI * 2); ctx.fillStyle = dark ? '#4CAF50' : '#27874C'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 7, y); ctx.lineTo(x + 10.5, y + 3.5); ctx.lineTo(x + 17, y - 3.5); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    }
  }
  return canvas.getContent();
}
async function json(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function supportedLocales() {
  const source = await fs.readFile(path.join(ROOT, 'scripts/build-i18n.js'), 'utf8');
  const literal = source.match(/const\s+LOCALES\s*=\s*\[([^\]]+)\]/);
  if (!literal) throw new Error('Cannot find supported LOCALES in scripts/build-i18n.js.');
  const locales = [...literal[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]);
  if (!locales.length || new Set(locales).size !== locales.length) throw new Error('Invalid supported locales list.');
  for (const locale of locales) if (!existsSync(path.join(ROOT, 'locales', locale + '.json'))) throw new Error('Missing application locale: ' + locale);
  return locales;
}
function parseArgs(argv) {
  const args = { template: 'all', locale: 'en', out: path.join(DIR, 'final'), copy: path.join(DIR, 'copy.json') };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (key === 'help') { args.help = true; continue; }
    if (!['template', 'locale', 'out', 'copy', 'font-dir'].includes(key) || !argv[i].startsWith('--')) throw new Error('Unknown option: ' + argv[i]);
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing value for --' + key);
    args[key] = argv[++i];
  }
  return args;
}
function select(value, allowed, kind) {
  const picked = value === 'all' ? allowed : [...new Set(value.split(','))];
  for (const id of picked) if (!allowed.includes(id)) throw new Error('Unknown ' + kind + ': ' + id + '. Available: ' + allowed.join(', '));
  return picked;
}
async function write(file, data) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, data); }
async function render(args) {
  if (args['font-dir']) GlobalFonts.loadFontsFromDir(path.resolve(args['font-dir']));
  const config = await json(path.join(DIR, 'templates.json'));
  const copy = await json(path.resolve(args.copy));
  if (config.schemaVersion !== 1 || copy.schemaVersion !== 1 || config.width !== 1200 || config.height !== 630) throw new Error('Unsupported config schema or OG dimensions.');
  const locales = select(args.locale, await supportedLocales(), 'locale');
  const selected = select(args.template, config.templates.map(t => t.id), 'template');
  const out = path.resolve(args.out);
  if (out === DIR || path.relative(path.join(DIR, 'renderings'), out).split(path.sep)[0] !== '..') throw new Error('Choose an output directory separate from source assets, e.g. final.');
  const jobs = [];
  // Preflight all selected text before writing anything; no partial locale fallback.
  for (const locale of locales) {
    validateCopy(copy.locales[locale], locale);
    const fonts = chooseFonts(locale);
    for (const id of selected) {
      const template = config.templates.find(t => t.id === id);
      jobs.push({ template, locale, copy: copy.locales[locale], layout: makeLayout(template, copy.locales[locale], locale, fonts) });
    }
  }
  let prior = { images: [] };
  try { prior = await json(path.join(out, 'render-manifest.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const entries = new Map(prior.images.map(image => [image.locale + '/' + image.template, image]));
  const backgrounds = new Map();
  for (const job of jobs) {
    const { template, locale, layout } = job;
    if (!backgrounds.has(template.id)) {
      const input = await fs.readFile(path.join(DIR, template.background));
      backgrounds.set(template.id, { bytes: await sharp(input).resize(1200, 630, { fit: 'cover' }).png().toBuffer(), sha256: hash(input) });
    }
    const background = backgrounds.get(template.id), overlay = drawOverlay(template, layout);
    const filename = template.file;
    const output = await sharp(background.bytes).composite([{ input: overlay }]).png().toBuffer();
    await write(path.join(out, locale, filename), output);
    await write(path.join(out, locale, template.id + '-typography.svg'), overlay);
    await write(path.join(out, locale, template.id + '-layout.json'), JSON.stringify({ locale, template: template.id, copy: job.copy, layout }, null, 2) + '\n');
    entries.set(locale + '/' + template.id, { template: template.id, name: template.name, locale, language: job.copy.language, file: locale + '/' + filename, width: 1200, height: 630, source: template.background, backgroundSHA256: background.sha256, copySHA256: hash(JSON.stringify(job.copy)), imageSHA256: hash(output), fonts: layout.fonts, fontScale: layout.scale, decorativeLine: false });
  }
  const images = [...entries.values()].sort((a, b) => a.locale.localeCompare(b.locale) || a.template.localeCompare(b.template));
  await write(path.join(out, 'render-manifest.json'), JSON.stringify({ schemaVersion: 1, supportedLocales: await supportedLocales(), images }, null, 2) + '\n');
  const { gallery } = require('./render-gallery.cjs');
  await gallery(out, images, { sharp, escapeXML, createCanvas, SvgExportFlag });
  return { generated: jobs.length, totalSaved: images.length, directory: out };
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node render-og.cjs [--template all|04,10] [--locale en|all|de,fr] [--copy file.json] [--out directory] [--font-dir directory]\nDefaults: all ten renderings, English, copy.json, output final/.\nExamples:\n  node render-og.cjs --template all --locale en\n  node render-og.cjs --template 04 --locale all\n  node render-og.cjs --template all --locale de --copy campaign-copy.json --out campaign-output');
    return;
  }
  console.log(JSON.stringify(await render(args), null, 2));
}
module.exports = { dependency, chooseFonts, validateCopy, wrapText, makeLayout, drawOverlay, supportedLocales, parseArgs, select, render, normalize };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
