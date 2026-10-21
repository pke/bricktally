'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
async function gallery(out, images, { sharp, escapeXML, createCanvas, SvgExportFlag }) {
  const manifest = JSON.parse(await fs.readFile(path.join(out, 'render-manifest.json'), 'utf8'));
  const primaryLocale = images.some(v => v.locale === 'en') ? 'en' : images[0].locale;
  const primary = images.filter(v => v.locale === primaryLocale).sort((a,b) => a.template.localeCompare(b.template));
  const primaryName = primary[0].language;
  const primaryOverview = 'overview-' + primaryLocale;
  const localized04 = manifest.supportedLocales.map(locale => images.find(v => v.locale === locale && v.template === '04')).filter(Boolean);
  async function board(name, title, entries, columns, cardWidth, byLocale = false) {
    if (!entries.length) return;
    const margin = 36, gap = 24, imageHeight = Math.round(cardWidth * 630 / 1200), cardHeight = imageHeight + 88;
    const width = margin * 2 + columns * cardWidth + (columns - 1) * gap;
    const height = 148 + Math.ceil(entries.length / columns) * (cardHeight + gap) + 32;
    const svg = createCanvas(width, height, SvgExportFlag.ConvertTextToPaths), ctx = svg.getContext('2d');
    ctx.fillStyle = '#EDF0F4'; ctx.fillRect(0,0,width,height);
    ctx.fillStyle = '#607185'; ctx.font = '600 20px Arial'; ctx.fillText('BRICKTALLY / FINALE OG-BILDER', margin, 45);
    ctx.fillStyle = '#152D48'; ctx.font = '700 38px Arial'; ctx.fillText(title, margin, 101);
    const layers = [];
    for (let i=0;i<entries.length;i++) {
      const v=entries[i], x=margin+(i%columns)*(cardWidth+gap), y=140+Math.floor(i/columns)*(cardHeight+gap);
      ctx.fillStyle='#FFFFFF'; ctx.fillRect(x,y,cardWidth,cardHeight);
      ctx.fillStyle='#152D48'; ctx.font='700 24px "'+v.fonts.body+'"';
      ctx.fillText(byLocale ? v.locale+' · '+v.language : v.template+' · '+v.name, x+14,y+34);
      ctx.fillStyle='#607185'; ctx.font='17px Arial'; ctx.fillText('1200 × 630 px',x+14,y+cardHeight-15);
      layers.push({input:await sharp(path.join(out,v.file)).resize(cardWidth,imageHeight).png().toBuffer(),left:x,top:y+49});
    }
    await sharp(svg.getContent()).composite(layers).png().toFile(path.join(out,name+'.png'));
  }
  await board(primaryOverview,primary.length+' finale Bildwelten · '+primaryName,primary,5,600);
  await board('overview-04-locales','04 Sorting Table · '+localized04.length+' Sprachfassungen',localized04,3,720,true);
  const article=(v,localeLabel)=>'<article><h3>'+escapeXML(localeLabel?v.locale+' · '+v.language:v.template+' · '+v.name)+'</h3><a href="'+v.file+'"><img src="'+v.file+'" alt="'+escapeXML(v.name+' '+v.language)+'"></a><footer><a href="'+v.file+'" download>PNG · 1200 × 630</a><a href="'+v.locale+'/'+v.template+'-typography.svg">Textebene (Pfade)</a><a href="'+v.locale+'/'+v.template+'-layout.json">Text und Layout</a></footer></article>';
  const html='<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BrickTally · Finale OG-Versionen</title><style>*{box-sizing:border-box}body{margin:0;background:#EDF0F4;color:#152D48;font:17px/1.5 "Segoe UI",Arial,sans-serif}main{max-width:1800px;margin:auto;padding:32px 26px}h1{font-size:clamp(34px,4vw,58px);line-height:1.12}h2{font-size:32px;margin:55px 0 20px}h3{font-size:22px;margin:0}p{max-width:1150px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}article{background:white;padding:18px;border-radius:14px;break-inside:avoid}img{display:block;width:100%;height:auto;margin-top:14px}footer{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;margin-top:14px}a{color:#0055BF;text-underline-offset:4px}pre{white-space:pre-wrap;background:#142842;color:#F1F6FC;padding:20px;border-radius:10px;font-size:14px}code{font-size:.9em}.hint{font-size:14px;color:#607185}@media(max-width:950px){.grid{grid-template-columns:1fr}main{padding:20px 14px}}@media print{.grid{gap:10px}article{border:1px solid #ddd}pre{color:#152D48;background:#eee}}</style><main><h1>Finale OG-Versionen ohne dekorativen Strich.</h1><p>Alle zehn Bildwelten bleiben als wiederverwendbare 3D-Renderings erhalten. Die englischen Texte entsprechen weiterhin dem ursprünglichen OG-Bild. Entwurf 04 liegt in '+localized04.length+' von '+manifest.supportedLocales.length+' unterstützten Projektsprachen vor; die Claims folgen den vorhandenen Sprachdateien.</p><p><a href="'+primaryOverview+'.png">Übersicht der finalen Fassungen</a> · <a href="overview-04-locales.png">04 in allen Sprachen</a> · <a href="../copy.json">Übersetzbare Texte</a> · <a href="../templates.json">Layoutvorlagen</a> · <a href="../USAGE.txt">Script-Anleitung</a> · <a href="render-manifest.json">Exportnachweis</a></p><h2>'+primary.length+' finale Fassungen · '+escapeXML(primaryName)+'</h2><section class="grid">'+primary.map(v=>article(v,false)).join('')+'</section><h2>04 Sorting Table · alle Sprachen</h2><section class="grid">'+localized04.map(v=>article(v,true)).join('')+'</section><h2>Mit neuen Texten erneut erzeugen</h2><p>Texte in <code>copy.json</code> ändern oder eine separate JSON-Kopie übergeben. Layouts und Renderings bleiben getrennt. Das Script prüft Eingaben und passt Zeilenumbrüche und Schriftgröße an. Zu lange Texte werden mit einer klaren Fehlermeldung abgelehnt, statt abgeschnitten.</p><pre>node render-og.cjs --template all --locale en\nnode render-og.cjs --template 04 --locale all\nnode render-og.cjs --template all --locale de --copy campaign-copy.json --out campaign-output</pre><p class="hint">Die Befehle gelten im Konzeptordner. Ausgabe standardmäßig unter final/. Die Textebenen enthalten Schriftkonturen als Pfade, damit sie nach dem Export ohne installierte Schrift korrekt angezeigt werden. Bearbeitbarer Inhalt bleibt in copy.json. Die Anwendung und das bisher eingebundene OG-Bild wurden nicht geändert.</p></main></html>';
  await fs.writeFile(path.join(out,'review.html'),html);
}
module.exports={gallery};
