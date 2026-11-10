const {chromium, webkit} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../src/rose-pine.user.js'), 'utf8');
(async()=>{
  for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
    const browser=await engine.launch({headless:true});
    try {
      const page=await browser.newPage({colorScheme:'light'});
      await page.addInitScript({content:'document.addEventListener("DOMContentLoaded",()=>{'+source+'},{once:true});'});
      await page.route('http://example.test/**',route=>route.request().url().endsWith('.css')
        ?route.fulfill({contentType:'text/css',body:'body{background:#fff;color:#222}'})
        :route.fulfill({contentType:'text/html',headers:{'content-security-policy':"default-src 'self'; style-src 'self'"},body:'<link rel=stylesheet href=/site.css><p><a href=# id=link>Link text</a></p>'}));
      await page.goto('http://example.test/');await page.waitForTimeout(6500);
      const result=await page.$eval('#link',e=>({tone:e.getAttribute('data-rose-pine-link-tone'),color:getComputedStyle(e).color}));
      assert.equal(result.tone,null,`${name}: blocked stylesheet must not leave an ineffective marker`);
      console.log(JSON.stringify({browser:name,case:'strict-style-policy',result:'skipped safely'}));
    }finally{await browser.close();}
  }
})().catch(error=>{console.error(error);process.exitCode=1});
