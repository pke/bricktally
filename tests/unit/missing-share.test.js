import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pako from 'pako';
import {
  MAX_FILE_BYTES, MAX_LINK_LENGTH, createSnapshot, normalizeSnapshot, serializeSnapshot,
  parseSnapshotFile, encodeSnapshot, decodeSnapshot, shareResult, snapshotCsv, rebrickableCsv, catalogImageUrl
} from '../../js/missing-codec.js';

const sample = () => ({
  format: 'bricktally-missing', version: 1,
  set: { number: '31058-1', name: 'Dinosaurier 🦖' }, createdAt: '2026-10-15T12:00:00.000Z',
  items: [{ type: 'part', partNum: '3001', name: 'Stein "groß", 2 × 4', color: 'Red', colorId: 5, quantity: 2 },
    { type: 'minifig', partNum: 'fig-001234', name: 'Figur', color: '', colorId: 0, quantity: 1 }]
});

test('snapshot accounts for counted spares, quantity-two figures and over-counts', () => {
  const parts = [
    { id: 'a', type: 'part', partNum: '3001', name: 'Brick', color: 'Red', colorId: 5, quantity: 5 },
    { id: 's', type: 'part', partNum: '3001', name: 'Spare', color: 'Red', colorId: 5, quantity: 2, isSpare: true },
    { id: 'b', type: 'part', partNum: '3004', name: 'Brick', color: 'Blue', colorId: 1, quantity: 1 },
    { id: 'f', type: 'minifig', partNum: 'fig-1', name: 'Figure', color: '', colorId: 0, quantity: 2 }
  ];
  const result = createSnapshot(sample().set, parts, { a: 1, a_s: 2, b: 9, f: 1 }, part => part.id,
    new Date('2026-10-15T12:00:00Z'));
  assert.deepEqual(result.items.map(item => [item.partNum, item.quantity]), [['3001', 2], ['fig-1', 1]]);
});

test('compressed links and files round-trip Unicode, commas and quotes', () => {
  const data = sample();
  assert.deepEqual(decodeSnapshot(encodeSnapshot(data, pako), pako), data);
  assert.deepEqual(parseSnapshotFile('\uFEFF' + serializeSnapshot(data)), data);
  assert.match(snapshotCsv(data), /"Stein ""groß"", 2 × 4"/);
});

test('only the explicit share fields survive, including on file imports', () => {
  const data = sample();
  data.notes = 'PRIVATE';
  data.progress = 'PRIVATE';
  data.set.notes = 'PRIVATE';
  data.items[0].imageUrl = 'PRIVATE';
  assert.ok(!serializeSnapshot(data).includes('PRIVATE'));
  assert.ok(!JSON.stringify(normalizeSnapshot(data)).includes('PRIVATE'));
});

test('catalog images survive links and files; arbitrary URLs and paths never become image sources', () => {
  const data = sample();
  data.items[0].image = '/media/parts/elements/300421.jpg';
  data.items[1].image = '/media/sets/fig-010121/111577.jpg';
  assert.deepEqual(decodeSnapshot(encodeSnapshot(data, pako), pako), data);
  assert.deepEqual(parseSnapshotFile(serializeSnapshot(data)), data);
  assert.equal(catalogImageUrl(data.items[0]), 'https://cdn.rebrickable.com/media/parts/elements/300421.jpg');
  for (const image of ['https://attacker.test/a.jpg', '//attacker.test/a.jpg', '/media/parts/../../a.jpg', '/media/parts/a.svg', '/media/parts/a.jpg?token=secret']) {
    data.items[0].image = image;
    assert.equal(catalogImageUrl(data.items[0]), null);
    assert.equal(normalizeSnapshot(data).items[0].image, undefined);
  }
  const part = {id:'a', type:'part', partNum:'3004', name:'Brick', color:'Red', colorId:4, quantity:3,
    imageUrl:'https://cdn.rebrickable.com/media/parts/elements/300421.jpg'};
  assert.equal(createSnapshot(data.set, [part], {}, p => p.id).items[0].image, '/media/parts/elements/300421.jpg');
  part.imageUrl = 'https://attacker.test/media/parts/a.jpg';
  assert.equal(createSnapshot(data.set, [part], {}, p => p.id).items[0].image, undefined);
});

test('link limit includes the entire URL, with a file fallback one character over', () => {
  const base = 'https://example.test/de/';
  const short = shareResult(sample(), base, pako);
  assert.equal(short.kind, 'link');
  const fullBase = base + 'a'.repeat(MAX_LINK_LENGTH - short.url.length);
  const exact = shareResult(sample(), fullBase, pako);
  assert.equal(exact.kind, 'link');
  assert.equal(exact.url.length, MAX_LINK_LENGTH);
  assert.equal(shareResult(sample(), fullBase + 'a', pako).kind, 'file');
});

test('large normal lists become a full, importable file and preserve the timestamp', () => {
  const data = sample();
  data.items = Array.from({ length: 250 }, (_, i) => ({
    type: 'part', partNum: String(i + 1), name: randomBytes(80).toString('hex'),
    color: 'Blue', colorId: 1, quantity: 1
  }));
  const result = shareResult(data, 'https://example.test/', pako);
  assert.equal(result.kind, 'file');
  assert.deepEqual(parseSnapshotFile(result.json), data);
});

test('share URLs discard editor queries and use a fragment for the payload', () => {
  const result = shareResult(sample(), 'https://example.test/de/?set=31058-1#old', pako);
  const url = new URL(result.url);
  assert.equal(url.pathname, '/de/');
  assert.equal(url.search, '');
  assert.ok(url.hash.startsWith('#missing='));
});

test('unsupported versions, malformed identifiers, dates and quantities are rejected', () => {
  for (const change of [
    data => { data.version = 2; }, data => { data.set.number = '../../file'; },
    data => { data.createdAt = 'not-a-date'; }, data => { data.items[0].quantity = -1; },
    data => { data.items[0].quantity = 1.5; }, data => { data.items[0].colorId = -1; },
    data => { data.items[0].name = '\0'; }, data => { data.items[0].type = 'script'; }
  ]) {
    const data = sample();
    change(data);
    assert.throws(() => normalizeSnapshot(data));
  }
});

test('bounded inflation rejects compressed data that expands beyond the file limit', () => {
  const token = Buffer.from(pako.deflate('a'.repeat(MAX_FILE_BYTES + 100000))).toString('base64url');
  assert.throws(() => decodeSnapshot(token, pako), /Expanded data too large/);
});

test('corrupt, truncated and oversized payloads fail before rendering', () => {
  assert.throws(() => decodeSnapshot('<script>', pako));
  const token = encodeSnapshot(sample(), pako);
  assert.throws(() => decodeSnapshot(token.slice(0, -8), pako));
  assert.throws(() => parseSnapshotFile('x'.repeat(MAX_FILE_BYTES + 1)), /File too large/);
  assert.throws(() => parseSnapshotFile('€'.repeat(Math.floor(MAX_FILE_BYTES / 3) + 1)), /File too large/);
});

test('CSV labels cannot become spreadsheet formulas; figures remain in the general CSV', () => {
  const data = sample();
  data.items[0].name = '=2+2';
  data.items[0].color = '+Red';
  const csv = snapshotCsv(data);
  assert.ok(csv.includes(",'=2+2,'+Red,"));
  assert.ok(csv.includes('minifig,fig-001234'));
  assert.equal(rebrickableCsv(data), 'Part,Color,Quantity\r\n3001,5,2\r\n');
});
