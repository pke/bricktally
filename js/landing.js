// Optional start-page help. Dialogs never change the user's inventory or progress.
(function () {
    var defaults = {
        badgeTitle: 'Completion badges',
        badgeDescription: 'Examples using set 31109-1 “Pirate Ship” and its catalog data. The counting progress is illustrative.',
        badgeComplete: 'Complete set · 100%',
        badgeIncomplete: 'Incomplete set · 2 pieces missing',
        badgeTerm: 'completion badge',
        loadingExample: 'Loading examples…',
        exampleUnavailable: 'The examples could not be loaded. Please try again.',
        installTitle: 'Install BrickTally',
        installTerm: 'install BrickTally on your device',
        installNow: 'Install now',
        installed: 'BrickTally is installed or already open as an app.',
        installManual: 'If no install button appears, follow the steps for your device.',
        installFailed: 'Installation could not be started. You can use the steps below instead.',
        device: 'Your device',
        apple: 'iPhone / iPad',
        android: 'Android',
        desktop: 'Computer',
        appleStep1: 'Open this website in Safari.',
        appleStep2: 'Open Share and select Add to Home Screen (you may need to scroll).',
        appleStep3: 'Keep Open as Web App enabled if offered, then tap Add.',
        androidStep1: 'Open this website in Chrome or Edge.',
        androidStep2: 'Open the browser menu and select Install app or Add to Home screen.',
        androidStep3: 'Confirm the installation. You can then open BrickTally from its app icon.',
        desktopStep1: 'Open this website in Chrome or Edge.',
        desktopStep2: 'Use the install icon in the address bar, or the Install app entry in the browser menu.',
        desktopStep3: 'Confirm the installation. BrickTally will open in its own window.',
        offline: 'Open a set with an internet connection first. Loaded set data can be used offline; new sets and images may still need internet.',
        buildTitle: 'Build details',
        buildDate: 'Build date',
        commit: 'Git commit',
        unknown: 'Not available',
        localChanges: 'This build includes local changes that have not been committed yet.',
        changelog: 'View changelog',
        buildTooltip: 'Build: {{date}} · Git: {{commit}}'
    };
    function message(key, values) {
        return t('help.' + key, Object.assign({ defaultValue: defaults[key] }, values));
    }
    function linkTerm(selector, key) {
        var button = document.querySelector(selector);
        var phrase = button.textContent;
        var term = message(key);
        var position = phrase.indexOf(term);
        if (position < 0) return; // Other locales can keep the full sentence clickable.
        button.before(document.createTextNode(phrase.slice(0, position)));
        button.after(document.createTextNode(phrase.slice(position + term.length)));
        button.textContent = term;
    }
    linkTerm('[data-i18n="landing.featureBadge"]', 'badgeTerm');
    linkTerm('[data-i18n="landing.featurePwa"]', 'installTerm');
    function element(tag, text, className) {
        var node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function openDialog(id, title) {
        var previous = document.getElementById(id);
        if (previous) previous.close();
        var dialog = element('dialog', undefined, 'help-dialog');
        dialog.id = id;
        var header = element('div', undefined, 'help-dialog-header');
        var heading = element('h2', title);
        heading.id = id + '-title';
        dialog.setAttribute('aria-labelledby', heading.id);
        header.append(heading);
        var content = element('div', undefined, 'help-dialog-content');
        dialog.append(header, content);
        dialog.addEventListener('close', function () {
            dialog.remove();
        }, { once: true });
        document.body.appendChild(dialog);
        // Register before showModal moves focus so dismissal returns to the opener.
        window.enableLightDismiss(dialog, dialog);
        dialog.showModal();
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        return { dialog: dialog, content: content };
    }
    window.openBricktallyDialog = openDialog;

    function platformIcon(platform) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        svg.classList.add('platform-icon');
        var path = document.createElementNS(svg.namespaceURI, 'path');
        var paths = {
            apple: 'M17.1 12.3c0-2 1.6-3 1.7-3.1-1-1.5-2.5-1.7-3-1.7-1.3-.1-2.6.8-3.2.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.9-.7s1.8.7 3 .7c1.2 0 1.9-1.1 2.6-2.2.9-1.2 1.2-2.4 1.2-2.5-.1 0-2.5-1-2.5-3.8ZM14.9 6c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3Z',
            android: 'm6.6 3.5 1.6 2.8a8.4 8.4 0 0 1 7.6 0l1.6-2.8 1 .6-1.6 2.8A7.5 7.5 0 0 1 20 13H4a7.5 7.5 0 0 1 3.2-6.1L5.6 4.1l1-.6ZM8 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM4 14h16v5a2 2 0 0 1-2 2h-1v2h-2v-2H9v2H7v-2H6a2 2 0 0 1-2-2v-5Z',
            desktop: 'M3 3h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-8v3h5v2H6v-2h5v-3H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm1 2v10h16V5H4Z'
        };
        path.setAttribute('d', paths[platform]);
        svg.appendChild(path);
        return svg;
    }

    window.showBadgeExamples = async function () {
        var view = openDialog('badgeExamplesDialog', message('badgeTitle'));
        view.content.appendChild(element('p', message('badgeDescription')));
        var status = element('p', message('loadingExample'));
        status.setAttribute('role', 'status');
        view.content.appendChild(status);
        var grid = element('div', undefined, 'badge-example-grid');
        view.content.appendChild(grid);
        var example;
        try {
            var response = await fetch('/data/example-set.json');
            if (!response.ok) throw new Error('Example unavailable');
            example = await response.json();
        } catch (error) {
            status.textContent = message('exampleUnavailable');
            return;
        }
        async function loadImage(url) {
            var image = new Image();
            image.src = url;
            try { await image.decode(); return image; } catch (error) { return null; }
        }
        var images = await Promise.all([loadImage(example.badgeImage), loadImage(example.badgePartImage)]);
        if (!view.dialog.isConnected) return;
        status.remove();
        [true, false].forEach(function (complete) {
            var total = example.set.numParts;
            var data = {
                setName: example.set.name, setNumber: example.set.number.split('-')[0], versionLabel: '',
                percentage: complete ? 100 : Math.floor((total - 2) / total * 100),
                completedPieces: complete ? total : total - 2, totalPieces: total,
                missingParts: complete ? [] : [{ name: example.items[0].name, color: example.items[0].color, quantity: 2, type: 'part' }]
            };
            var figure = element('figure');
            figure.dataset.setNumber = example.set.number;
            var label = message(complete ? 'badgeComplete' : 'badgeIncomplete');
            var preview = element('img');
            preview.alt = example.set.name + ' (' + example.set.number + ') — ' + label;
            preview.src = drawBadgeWithImages(data, { setImage: images[0], part_0: images[1] }, true);
            figure.append(element('figcaption', label), preview);
            grid.appendChild(figure);
        });
    };

    var installPrompt = null;
    var installed = false;
    var refreshInstallDialog = null;
    window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault();
        installPrompt = event;
        if (refreshInstallDialog) refreshInstallDialog();
    });
    window.addEventListener('appinstalled', function () {
        installed = true;
        installPrompt = null;
        if (refreshInstallDialog) refreshInstallDialog();
    });
    window.showInstallHelp = function () {
        var view = openDialog('installHelpDialog', message('installTitle'));
        var status = element('p');
        status.setAttribute('role', 'status');
        var install = element('button', message('installNow'));
        install.type = 'button';
        install.id = 'installNowButton';
        view.content.append(status, install);
        function refresh() {
            var standalone = installed || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
            status.textContent = message(standalone ? 'installed' : 'installManual');
            install.hidden = standalone || !installPrompt;
            install.disabled = false;
        }
        refreshInstallDialog = refresh;
        view.dialog.addEventListener('close', function () {
            if (refreshInstallDialog === refresh) refreshInstallDialog = null;
        }, { once: true });
        install.addEventListener('click', async function () {
            var prompt = installPrompt;
            if (!prompt) return;
            installPrompt = null;
            install.disabled = true;
            try {
                await prompt.prompt();
                await prompt.userChoice;
                refresh();
            } catch (error) {
                refresh();
                status.textContent = message('installFailed');
            }
        });
        var platforms = element('fieldset', undefined, 'install-platforms');
        platforms.appendChild(element('legend', message('device')));
        var instructions = element('ol', undefined, 'install-steps');
        var platform = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'apple'
            : /Android/.test(navigator.userAgent) ? 'android' : 'desktop';
        function showSteps(value) {
            instructions.replaceChildren();
            [1, 2, 3].forEach(function (step) {
                instructions.appendChild(element('li', message(value + 'Step' + step)));
            });
            instructions.appendChild(element('li', message('offline')));
        }
        ['apple', 'android', 'desktop'].forEach(function (value) {
            var label = element('label');
            var input = element('input');
            input.type = 'radio';
            input.name = 'installPlatform';
            input.value = value;
            input.checked = value === platform;
            input.addEventListener('change', function () { if (input.checked) showSteps(value); });
            label.append(input, platformIcon(value), element('span', message(value)));
            platforms.appendChild(label);
        });
        view.content.append(platforms, instructions);
        showSteps(platform);
        refresh();
    };

    var version = document.getElementById('versionInfo');
    version.title = message('buildTooltip', {
        date: version.dataset.buildDate || message('unknown'),
        commit: version.dataset.commit ? version.dataset.commit.slice(0, 7) : message('unknown')
    }) + (version.dataset.localChanges === 'true' ? ' · ' + message('localChanges') : '');
})();
