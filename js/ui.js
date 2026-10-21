// Display labels never replace the catalog names used as storage keys or exports.
window.colorLabel = function (name) {
    if (!name) return '';
    return t('colorNames.' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), { defaultValue: name });
};
