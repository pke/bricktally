// Fetch all LEGO themes from Rebrickable and generate data/themes.json
// Usage: REBRICKABLE_API_KEY=xxx node scripts/fetch-themes.js

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.REBRICKABLE_API_KEY;

if (!API_KEY) {
    console.error('Missing REBRICKABLE_API_KEY environment variable');
    process.exit(1);
}

async function fetchAllThemes() {
    var themes = {};
    var page = 1;
    var hasMore = true;

    while (hasMore) {
        var url = `https://rebrickable.com/api/v3/lego/themes/?page=${page}&page_size=1000&key=${API_KEY}`;
        console.log(`Fetching page ${page}...`);
        var response = await fetch(url);
        var data = await response.json();

        data.results.forEach(function(theme) {
            themes[theme.id] = { name: theme.name, parent_id: theme.parent_id };
        });

        hasMore = data.next !== null;
        page++;
    }

    return themes;
}

var themes = await fetchAllThemes();
var count = Object.keys(themes).length;
console.log(`Fetched ${count} themes`);

var outDir = join(__dirname, '..', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'themes.json'), JSON.stringify(themes));
console.log(`Written to data/themes.json`);
