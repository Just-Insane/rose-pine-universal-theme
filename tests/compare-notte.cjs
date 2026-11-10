// Optional comparison. Supply an independently obtained Notte Chrome extension.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const extension = process.env.NOTTE_EXTENSION_DIR;
if (!extension) { console.error('Set NOTTE_EXTENSION_DIR to the Notte Chrome extension directory.'); process.exit(2); }
const html = '<!doctype html><style>body{background:#fff;color:#222}.light{background:#fff;color:#222;padding:10px}.dark{background:#222;color:#eee;padding:10px}.dark a{color:#8ab4f8}.badge{background:#063;color:#fff;padding:10px}.overlay{position:relative;background:#fff;padding:10px}.overlay:before{content:"";position:absolute;inset:0;background:#333}.overlay span{position:relative;color:#fff}</style><h1>Fixture</h1><div class=light><a href=#>Light link</a></div><div class=dark><a href=#>Dark link</a></div><div class=badge>Readable badge</div><div class=overlay><span>Overlay text</span></div>';
function lum(value) { const c=value.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4); return .2126*c[0]+.7152*c[1]+.0722*c[2]; }
function ratio(a,b){a=lum(a);b=lum(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
(async()=>{
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'rose-pine-notte-'));
  const options={headless:true,args:[`--disable-extensions-except=${path.resolve(extension)}`,`--load-extension=${path.resolve(extension)}`]};
  if(process.env.VIVALDI_PATH){options.executablePath=process.env.VIVALDI_PATH;options.args.push('--disable-vivaldi');} else options.channel='chromium';
  const context=await chromium.launchPersistentContext(profile,options);
  try {
    const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker',{timeout:15000});
    const page=await context.newPage();
    await page.route('http://example.test/**',r=>r.fulfill({body:html,contentType:'text/html'}));
    for(const mode of ['light-contrast','dark-contrast']){
      await worker.evaluate(mode=>chrome.storage.local.set({overrides:{'example.test':true},dark:{'example.test':mode==='dark-contrast'},contrast:{'example.test':'aa'}}),mode);
      await page.goto('http://example.test/'); await page.waitForTimeout(5500);
      const values=await page.evaluate(()=>{const get=q=>{const s=getComputedStyle(document.querySelector(q));return [s.color,s.backgroundColor]};return {light:[get('.light a')[0],get('.light')[1]],dark:[get('.dark a')[0],get('.dark')[1]],badge:get('.badge'),overlay:[get('.overlay span')[0],getComputedStyle(document.querySelector('.overlay'),'::before').backgroundColor],marker:document.documentElement.getAttribute('data-notte-build')};});
      assert(values.marker, 'Notte did not initialize');
      await page.evaluate(()=>{const sheet=document.querySelector('style:not([id])').sheet;[...sheet.cssRules].find(r=>r.selectorText==='.badge').style.backgroundColor='#123'});
      await page.waitForTimeout(1500);
      const updated=await page.$eval('.badge',e=>getComputedStyle(e).backgroundColor);
      console.log(JSON.stringify({mode,ratios:Object.fromEntries(['light','dark','badge','overlay'].map(k=>[k,Number(ratio(...values[k]).toFixed(2))])),inPlaceChangeObserved:updated!==values.badge[1]}));
    }
  } finally { await context.close(); fs.rmSync(profile,{recursive:true,force:true}); }
})().catch(error=>{console.error(error);process.exitCode=1});
