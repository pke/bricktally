import {
    MAX_FILE_BYTES, createSnapshot, normalizeSnapshot, serializeSnapshot, parseSnapshotFile,
    decodeSnapshot, shareResult, snapshotCsv, rebrickableCsv, catalogImageUrl
} from './missing-codec.js';

const defaults = {
    title: 'Missing parts', shareTitle: 'Share missing parts',
    date: 'Created: {{date}}',
    parts_one: '{{count}} missing part', parts_other: '{{count}} missing parts',
    figures_one: '{{count}} figure', figures_other: '{{count}} figures',
    summary: '{{parts}} and {{figures}}',
    copy: 'Copy link', copied: 'Link copied.', selectCopy: 'Select and copy the link above.',
    linkLabel: 'Link for the buyer', file: 'Missing-parts file', csv: 'CSV table', text: 'Text list',
    rebrickable: 'Rebrickable CSV (parts)',
    figuresNote: 'The Rebrickable CSV contains individual parts. Figures are included in the text list, CSV table and missing-parts file.',
    fileFallback: 'The list is too large for a link and has been downloaded as a file. The buyer can open it here using “Open a missing-parts file”.',
    open: 'Open a missing-parts file', home: 'Back to BrickTally',
    invalid: 'This link or file is invalid, too large, or uses an unsupported format.',
    failed: 'The list could not be shared. Please try again.',
    version: 'Set {{number}}', empty: 'No parts are missing from this list.'
};
function message(key, values) {
    return window.t('share.' + key, Object.assign({ defaultValue: defaults[key] }, values));
}
function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}
function button(text, action) {
    const node = element('button', text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
}
function download(snapshot, body, extension, type) {
    const blob = new Blob([body], { type });
    const url = URL.createObjectURL(blob);
    const anchor = element('a');
    anchor.href = url;
    anchor.download = 'bricktally-missing-' + snapshot.set.number + extension;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadSnapshot(snapshot) {
    download(snapshot, serializeSnapshot(snapshot), '.bricktally-missing.json', 'application/json');
}
function reportError(key = 'invalid') {
    const view = window.openBricktallyDialog('missingShareError', message('title'));
    const error = element('p', message(key));
    error.setAttribute('role', 'alert');
    view.content.appendChild(error);
}

window.shareMissingParts = function () {
    try {
        if (!window.currentSetNumber) return;
        const info = window.getSetData(window.currentSetNumber) || {};
        const snapshot = createSnapshot({ number: window.currentSetNumber, name: info.name || window.currentSetNumber },
            window.partsData, window.userCounts, window.getPartKey);
        const result = shareResult(snapshot, window.location.href, window.pako);
        if (result.kind === 'file') downloadSnapshot(snapshot);
        const view = window.openBricktallyDialog('missingShareDialog', message('shareTitle'));
        if (result.kind === 'file') {
            view.content.append(element('p', message('fileFallback')),
                button(message('file'), () => downloadSnapshot(snapshot)));
        } else {
            const label = element('label', message('linkLabel'));
            label.htmlFor = 'missingShareLink';
            const link = element('textarea');
            link.id = 'missingShareLink';
            link.rows = 3;
            link.readOnly = true;
            link.value = result.url;
            const status = element('p');
            status.setAttribute('role', 'status');
            const copy = button(message('copy'), async () => {
                try {
                    await navigator.clipboard.writeText(result.url);
                    status.textContent = message('copied');
                } catch (error) {
                    link.focus();
                    link.select();
                    status.textContent = message('selectCopy');
                }
            });
            view.content.append(label, link, copy, status);
        }
    } catch (error) {
        reportError('failed');
    }
};

const fileInput = element('input');
fileInput.type = 'file';
fileInput.id = 'missingShareFile';
fileInput.accept = '.json,application/json';
fileInput.hidden = true;
document.body.appendChild(fileInput);
window.openMissingFile = function () {
    fileInput.value = '';
    fileInput.click();
};
fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
        if (file.size > MAX_FILE_BYTES) throw new Error('File too large');
        displaySnapshot(parseSnapshotFile(await file.text()));
    } catch (error) {
        reportError();
    }
});

let buyerMode = false;
function leaveBuyer(event) {
    event.preventDefault();
    if (window.location.hash) window.location.hash = '';
    else window.location.reload();
}
function buyerPanel() {
    buyerMode = true;
    // Abandon a pending editor load without touching stored sets or counts.
    window.currentLoadId++;
    document.body.classList.add('missing-share-mode');
    document.body.classList.remove('has-set', 'color-overview-open');
    document.body.removeAttribute('data-collapsed-header');
    if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
    document.getElementById('themeIcon').textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    const brand = document.querySelector('.full-header h1 a');
    brand.removeAttribute('onclick');
    brand.href = window.location.pathname;
    brand.onclick = leaveBuyer;
    let panel = document.getElementById('missingShareSection');
    if (!panel) {
        panel = element('section', undefined, 'missing-share-panel');
        panel.id = 'missingShareSection';
        document.querySelector('.content-area').appendChild(panel);
    }
    panel.replaceChildren();
    const heading = element('h2', message('title'));
    heading.tabIndex = -1;
    const home = element('a', message('home'));
    home.href = window.location.pathname;
    home.addEventListener('click', leaveBuyer);
    panel.append(home, heading);
    heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    return panel;
}
function displaySnapshot(value) {
    const snapshot = normalizeSnapshot(value);
    const panel = buyerPanel();
    panel.append(element('p', snapshot.set.name, 'shared-set-name'),
        element('p', message('version', { number: snapshot.set.number })));
    const date = new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
        dateStyle: 'medium', timeStyle: 'short'
    }).format(new Date(snapshot.createdAt));
    const partCount = snapshot.items.filter(item => item.type === 'part').reduce((sum, item) => sum + item.quantity, 0);
    const figureCount = snapshot.items.filter(item => item.type === 'minifig').reduce((sum, item) => sum + item.quantity, 0);
    const parts = message('parts_' + (partCount === 1 ? 'one' : 'other'), { count: partCount });
    const figures = message('figures_' + (figureCount === 1 ? 'one' : 'other'), { count: figureCount });
    panel.append(element('p', message('date', { date })), element('p', message('summary', { parts, figures }), 'missing-share-summary'));
    const actions = element('div', undefined, 'missing-share-actions');
    const text = [snapshot.set.name + ' (' + snapshot.set.number + ')', snapshot.createdAt, '',
        ...snapshot.items.map(item => item.quantity + ' × ' + item.partNum + ' — ' + item.name +
            (item.color ? ' (' + item.color + ')' : '') + (item.type === 'minifig' ? ' [minifig]' : ''))].join('\n');
    actions.append(button(message('text'), () => download(snapshot, text, '.txt', 'text/plain;charset=utf-8')),
        button(message('csv'), () => download(snapshot, snapshotCsv(snapshot), '.csv', 'text/csv;charset=utf-8')),
        button(message('file'), () => downloadSnapshot(snapshot)),
        button(message('open'), window.openMissingFile));
    if (snapshot.items.some(item => item.type === 'part')) {
        const rb = button(message('rebrickable'), () => download(snapshot, rebrickableCsv(snapshot), '-rebrickable.csv', 'text/csv;charset=utf-8'));
        actions.appendChild(rb);
    }
    panel.appendChild(actions);
    if (snapshot.items.some(item => item.type === 'minifig')) panel.appendChild(element('p', message('figuresNote')));
    if (!snapshot.items.length) panel.appendChild(element('p', message('empty')));
    const list = element('ul', undefined, 'missing-share-list');
    for (const item of snapshot.items) {
        const row = element('li');
        const thumbnail = element('div', '—', 'missing-share-thumbnail');
        thumbnail.setAttribute('aria-hidden', 'true');
        const imageUrl = catalogImageUrl(item);
        if (imageUrl) {
            const image = element('img');
            image.alt = '';
            image.width = image.height = 64;
            image.loading = 'lazy';
            image.addEventListener('error', () => thumbnail.replaceChildren(document.createTextNode('—')), { once: true });
            image.src = window.getProxiedUrl(imageUrl);
            thumbnail.replaceChildren(image);
        }
        const details = element('div');
        details.append(element('strong', item.name), element('code', item.partNum),
            element('span', item.type === 'minifig' ? window.t('section.minifigures') : window.colorLabel(item.color)));
        row.append(element('span', item.quantity + ' ×', 'missing-share-quantity'), thumbnail, details);
        list.appendChild(row);
    }
    panel.appendChild(list);
}
window.isMissingShareView = function () {
    return window.location.hash === '#missing' || window.location.hash.startsWith('#missing=');
};
window.showMissingShareFromLink = function () {
    try {
        displaySnapshot(decodeSnapshot(window.location.hash.slice('#missing='.length), window.pako));
    } catch (error) {
        const panel = buyerPanel();
        const alert = element('p', message('invalid'));
        alert.setAttribute('role', 'alert');
        panel.append(alert, button(message('open'), window.openMissingFile));
    }
};
window.addEventListener('hashchange', () => {
    if (window.isMissingShareView()) window.showMissingShareFromLink();
    else if (buyerMode) window.location.reload();
});
