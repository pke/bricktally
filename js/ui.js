// Display labels never replace the catalog names used as storage keys or exports.
window.colorLabel = function (name) {
    if (!name) return '';
    return t('colorNames.' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), { defaultValue: name });
};

// One dismiss controller for native dialogs and the existing overlay dialogs.
(function () {
    var entries = [];
    var pointerStart = null;
    var sequence = 0;
    function visible(entry) {
        return entry.surface.isConnected && entry.surface.getClientRects().length &&
            (!entry.native || entry.surface.open);
    }
    function top() {
        entries = entries.filter(visible);
        return entries.filter(function (entry) { return entry.native; }).pop() || entries[entries.length - 1];
    }
    function outside(entry, event) {
        var box = entry.content.getBoundingClientRect();
        return event.clientX < box.left || event.clientX > box.right ||
            event.clientY < box.top || event.clientY > box.bottom;
    }
    window.enableLightDismiss = function (surface, content, dismiss) {
        entries = entries.filter(function (entry) { return entry.surface !== surface && visible(entry); });
        var opener = document.activeElement;
        var native = surface.tagName === 'DIALOG';
        var entry = { surface: surface, content: content, native: native };
        var semantic = content.tagName === 'IMG' ? surface : content;
        entry.semantic = semantic;
        surface.dataset.lightDismiss = '';
        if (native) surface.setAttribute('closedby', 'any');
        else {
            semantic.setAttribute('role', 'dialog');
            semantic.setAttribute('aria-modal', 'true');
        }
        var heading = content.querySelector('h1, h2, h3');
        if (heading) {
            if (!heading.id) heading.id = 'dialog-heading-' + (++sequence);
            (native ? surface : semantic).setAttribute('aria-labelledby', heading.id);
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
        } else if (!native) {
            semantic.tabIndex = -1;
            if (content.alt) semantic.setAttribute('aria-label', content.alt);
            semantic.focus({ preventScroll: true });
        }
        function finish() {
            entries = entries.filter(function (item) { return item !== entry; });
            if (opener && opener.isConnected) opener.focus({ preventScroll: true });
        }
        entry.close = function () {
            if (native) surface.close();
            else { dismiss(); finish(); }
        };
        if (native) surface.addEventListener('close', finish, { once: true });
        entries.push(entry);
        return entry.close;
    };
    document.addEventListener('pointerdown', function (event) {
        var entry = top();
        pointerStart = entry && event.isPrimary && event.button === 0 && outside(entry, event) ? entry : null;
    }, true);
    document.addEventListener('pointercancel', function () { pointerStart = null; }, true);
    document.addEventListener('click', function (event) {
        var entry = top();
        var start = pointerStart;
        pointerStart = null;
        if (!entry || start !== entry || !outside(entry, event)) return;
        // Browsers implementing closedby handle native light dismiss themselves.
        if (entry.native && entry.surface.closedBy === 'any') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        entry.close();
    }, true);
    document.addEventListener('keydown', function (event) {
        var entry = top();
        if (!entry || entry.native) return; // Native dialogs own their cancel event.
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopImmediatePropagation();
            entry.close();
        } else if (event.key === 'Tab') {
            var controls = Array.from(entry.content.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]'))
                .filter(function (node) { return !node.disabled && node.getClientRects().length; });
            var first = controls[0] || entry.content.querySelector('h1, h2, h3') || entry.semantic;
            var last = controls[controls.length - 1] || first;
            if (first && (event.shiftKey ? document.activeElement === first || !controls.includes(document.activeElement)
                : document.activeElement === last || !entry.content.contains(document.activeElement))) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            }
        }
    }, true);
})();
