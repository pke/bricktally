'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const r = require('./render-og.cjs');
const sharp = r.dependency('sharp');
const { createCanvas } = r.dependency('@napi-rs/canvas');
const DIR=__dirname;
async function fixtures(){return {config:JSON.parse(await fs.readFile(path.join(DIR,'templates.json'),'utf8')),copy:JSON.parse(await fs.readFile(path.join(DIR,'copy.json'),'utf8'))};}
test('supported application locales have complete copy and existing localized claims',async()=>{
  const {copy}=await fixtures();const locales=await r.supportedLocales();assert.equal(locales.length,11);
  assert.deepEqual([...Object.keys(copy.locales)].sort(),[...locales].sort());
  for(const locale of locales){r.validateCopy(copy.locales[locale],locale);const source=JSON.parse(await fs.readFile(path.join(DIR,'../../locales',locale+'.json'),'utf8'));assert.equal(copy.locales[locale].claim,source.meta.title.replace(/^BrickTally\s*-\s*/,''));}
  const original=await fs.readFile(path.join(DIR,'../../og-image.svg'),'utf8');const originalCopy=[...original.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map(m=>m[1].trim());const c=copy.locales.en;assert.deepEqual([c.brand,c.claim,c.description,...c.features],originalCopy);
});
test('all 110 future template/language combinations preserve every character and fit',async()=>{
  const {config,copy}=await fixtures();let count=0;
  for(const template of config.templates)for(const locale of await r.supportedLocales()){
    const layout=r.makeLayout(template,copy.locales[locale],locale);
    assert.equal(layout.blocks.length,6);
    for(const b of layout.blocks){assert.equal(r.normalize(b.lines.map(l=>l.text).join('')),r.normalize(b.original));for(const line of b.lines){assert.ok(line.x+line.width<=template.textBox.x+template.textBox.width+0.1);assert.ok(line.bottom<=template.textBox.bottom);assert.ok(line.top>=70);}}
    count++;
  }assert.equal(count,110);
});
test('balanced wrapping avoids a single orphaned German word',async()=>{
  const {config,copy}=await fixtures();const layout=r.makeLayout(config.templates.find(t=>t.id==='04'),copy.locales.de,'de');const lines=layout.blocks.find(b=>b.key==='description').lines;assert.equal(lines.length,2);assert.ok(lines[1].text.trim().split(/\s+/).length>=3);
});
test('CJK and Cyrillic overlays contain paths and nothing in the removed accent area',async()=>{
  const {config,copy}=await fixtures();const template=config.templates.find(t=>t.id==='04');
  for(const locale of ['en','ja','ko','ru','zh-CN','zh-TW']){
    const svg=r.drawOverlay(template,r.makeLayout(template,copy.locales[locale],locale));assert.ok(svg.toString().includes('<path'));assert.ok(!svg.toString().includes('<text'));
    const {channels}=await sharp(await sharp(svg).extract({left:0,top:0,width:1200,height:110}).png().toBuffer()).stats();assert.equal(channels[3].max,0);
  }
});
test('new text is literal, lossless and cannot inject SVG markup',async()=>{
  const {config,copy}=await fixtures();const changed=structuredClone(copy.locales.en);changed.claim='Count <every> brick & smile';const layout=r.makeLayout(config.templates[0],changed,'en');const svg=r.drawOverlay(config.templates[0],layout).toString();assert.equal(layout.blocks[1].original,changed.claim);assert.ok(!svg.includes('<every>'));assert.ok(!svg.includes('<text'));
});
test('long content fails clearly instead of clipping; invalid selections fail',async()=>{
  const {config,copy}=await fixtures();const tooLong=structuredClone(copy.locales.en);tooLong.description='A very long description that cannot fit in this card. '.repeat(30);assert.throws(()=>r.makeLayout(config.templates[0],tooLong,'en'),/does not fit/);
  assert.throws(()=>r.validateCopy({...copy.locales.en,features:['only one']},'en'),/exactly three/);assert.throws(()=>r.select('99',['01','04'],'template'),/Unknown template/);assert.throws(()=>r.parseArgs(['--locale']),/Missing value/);assert.throws(()=>r.parseArgs(['--unknown','yes']),/Unknown option/);
});
test('CLI renderer reuses the original background with new copy',async()=>{
  const {config,copy}=await fixtures();const template=config.templates.find(t=>t.id==='04');const background=path.join(DIR,template.background);const digest=async p=>createHash('sha256').update(await fs.readFile(p)).digest('hex');const before=await digest(background);
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'bricktally-og-test-'));const changed=structuredClone(copy);changed.locales.en.claim='Every Checked Brick Counts';const input=path.join(temp,'copy.json');await fs.writeFile(input,JSON.stringify(changed));
  const result=await r.render({template:'04',locale:'en',copy:input,out:path.join(temp,'exports')});assert.equal(result.generated,1);const file=path.join(temp,'exports/en',template.file);const meta=await sharp(file).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,630);assert.equal(await digest(background),before);const report=JSON.parse(await fs.readFile(path.join(temp,'exports/en/04-layout.json'),'utf8'));assert.equal(report.copy.claim,'Every Checked Brick Counts');assert.notEqual(await digest(file),await digest(path.join(DIR,'final/en',template.file)));
  // Leave only a tiny test summary, no temporary product assets in the repository.
});

test('a new non-English campaign gets a working language-specific gallery',async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'bricktally-og-gallery-'));
  const out=path.join(temp,'exports');
  await r.render({template:'04',locale:'de',copy:path.join(DIR,'copy.json'),out});
  const html=await fs.readFile(path.join(out,'review.html'),'utf8');
  assert.ok(html.includes('overview-de.png'));
  assert.ok(!html.includes('overview-en.png'));
  assert.ok(html.includes('1 von 11'));
  assert.equal((await sharp(path.join(out,'overview-de.png')).metadata()).format,'png');
});
