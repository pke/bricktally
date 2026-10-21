// The shared format contains no inventory state or notes. Images use catalog paths only.
export const MAX_LINK_LENGTH = 2048;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_COMPRESSED_BYTES = 128 * 1024;
const MAX_ITEMS = 5000;

function imagePath(value) {
    return typeof value === 'string' && value.length <= 240 &&
        /^\/media\/(?:parts|sets)\/[A-Za-z0-9_/-]+\.(?:jpg|jpeg|png|webp)$/i.test(value) ? value : undefined;
}
function imageFromUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && ['cdn.rebrickable.com', 'rebrickable.com'].includes(url.hostname) &&
            !url.username && !url.password && !url.port && !url.search && !url.hash ? imagePath(url.pathname) : undefined;
    } catch { return undefined; }
}
export function catalogImageUrl(item) {
    const path = imagePath(item.image);
    return path ? 'https://cdn.rebrickable.com' + path : null;
}

function text(value, max, empty = false) {
    if (typeof value !== 'string' || value.length > max) throw new Error('Invalid text');
    const clean = value.replace(/[\x00-\x1f\x7f]/g, ' ').trim();
    if (!empty && !clean) throw new Error('Invalid text');
    return clean;
}
function identifier(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value)) throw new Error('Invalid identifier');
    return value;
}
export function normalizeSnapshot(value) {
    if (!value || value.format !== 'bricktally-missing' || value.version !== 1 ||
        !value.set || !Array.isArray(value.items) || value.items.length > MAX_ITEMS) throw new Error('Invalid format');
    const number = identifier(value.set.number);
    if (!/-\d+$/.test(number)) throw new Error('Missing set version');
    const date = text(value.createdAt, 40);
    if (!Number.isFinite(Date.parse(date))) throw new Error('Invalid date');
    let total = 0;
    const items = value.items.map(item => {
        if (!item || !['part', 'minifig'].includes(item.type) ||
            !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100000 ||
            !Number.isInteger(item.colorId) || item.colorId < 0 || item.colorId > 1000000) throw new Error('Invalid item');
        total += item.quantity;
        if (total > 10000000) throw new Error('Invalid total');
        const normalized = {
            type: item.type, partNum: identifier(item.partNum), name: text(item.name, 512),
            color: text(item.color, 80, true), colorId: item.colorId, quantity: item.quantity
        };
        const image = imagePath(item.image);
        if (image) normalized.image = image;
        return normalized;
    });
    return {
        format: 'bricktally-missing', version: 1,
        set: { number, name: text(value.set.name, 200) },
        createdAt: new Date(date).toISOString(), items
    };
}
export function createSnapshot(set, parts, counts, getKey, now = new Date()) {
    const items = [];
    for (const part of parts) {
        if (part.isSpare) continue;
        const key = getKey(part);
        const count = Math.max(0, counts[key] || 0) + (part.type === 'minifig' ? 0 : Math.max(0, counts[key + '_s'] || 0));
        const quantity = Math.max(0, part.quantity - count);
        if (!quantity) continue;
        items.push({
            type: part.type === 'minifig' ? 'minifig' : 'part', partNum: part.partNum,
            name: part.name, color: part.color || '', colorId: part.colorId || 0, quantity,
            image: imageFromUrl(part.imageUrl)
        });
    }
    return normalizeSnapshot({ format: 'bricktally-missing', version: 1, set, createdAt: now.toISOString(), items });
}
export function serializeSnapshot(snapshot) {
    const json = JSON.stringify(normalizeSnapshot(snapshot));
    if (new TextEncoder().encode(json).length > MAX_FILE_BYTES) throw new Error('File too large');
    return json;
}
export function parseSnapshotFile(json) {
    if (typeof json !== 'string' || new TextEncoder().encode(json).length > MAX_FILE_BYTES) throw new Error('File too large');
    return normalizeSnapshot(JSON.parse(json.replace(/^\uFEFF/, '')));
}
export function encodeSnapshot(snapshot, pako) {
    const compressed = pako.deflate(serializeSnapshot(snapshot), { level: 9 });
    // Larger compressed payloads remain shareable as files.
    let binary = '';
    for (const byte of compressed) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeSnapshot(token, pako) {
    if (typeof token !== 'string' || token.length > Math.ceil(MAX_COMPRESSED_BYTES * 4 / 3) || !/^[A-Za-z0-9_-]+$/.test(token)) {
        throw new Error('Invalid link');
    }
    const binary = atob(token.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - token.length % 4) % 4));
    const compressed = Uint8Array.from(binary, char => char.charCodeAt(0));
    const chunks = [];
    let bytes = 0;
    const inflater = new pako.Inflate({ to: 'string', chunkSize: 16384 });
    inflater.onData = chunk => {
        bytes += new TextEncoder().encode(chunk).length;
        if (bytes > MAX_FILE_BYTES) throw new Error('Expanded data too large');
        chunks.push(chunk);
    };
    inflater.push(compressed, true);
    if (inflater.err || !inflater.ended) throw new Error('Invalid compressed data');
    return parseSnapshotFile(chunks.join(''));
}
export function shareResult(snapshot, baseUrl, pako) {
    const json = serializeSnapshot(snapshot);
    const url = new URL(baseUrl);
    url.search = '';
    url.hash = 'missing=' + encodeSnapshot(snapshot, pako);
    return url.href.length <= MAX_LINK_LENGTH
        ? { kind: 'link', url: url.href }
        : { kind: 'file', json };
}
function csvCell(value) {
    let string = String(value);
    // Spreadsheet programs must treat imported labels as text, never formulas.
    if (/^[=+\-@\t\r]/.test(string)) string = "'" + string;
    return /[",\r\n]/.test(string) ? '"' + string.replace(/"/g, '""') + '"' : string;
}
export function snapshotCsv(snapshot) {
    const data = normalizeSnapshot(snapshot);
    return [['Type', 'Part', 'Name', 'Color', 'Color ID', 'Quantity'],
        ...data.items.map(item => [item.type, item.partNum, item.name, item.color, item.colorId, item.quantity])]
        .map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
export function rebrickableCsv(snapshot) {
    const data = normalizeSnapshot(snapshot);
    return 'Part,Color,Quantity\r\n' + data.items.filter(item => item.type === 'part')
        .map(item => [item.partNum, item.colorId, item.quantity].join(',')).join('\r\n') + '\r\n';
}
