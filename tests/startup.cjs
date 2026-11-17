const {chromium, webkit} = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/rose-pine.user.js'), 'utf8');
(async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, {'content-type':'text/html'});
    res.write('<!doctype html><html><head><title>Loading</title><!--' + ' '.repeat(4096) + '-->');
    setTimeout(() => res.end('</head><body><p id="content">Usable page</p></body></html>'), 1200);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const engines = [['chromium', chromium, {}], ['webkit', webkit, {}]];
    if (process.env.VIVALDI_PATH) engines.push(['vivaldi', chromium, {executablePath: process.env.VIVALDI_PATH, args: ['--disable-vivaldi', '--disable-extensions']}]);
    for (const [name, engine, options] of engines) {
      const browser = await engine.launch({headless:true, ...options});
      try {
        for (const mode of ['light', 'dark']) {
          const context = await browser.newContext({colorScheme:mode});
          await context.addInitScript({content:`globalThis.GM={xmlHttpRequest(){}}; const originalAppend=Element.prototype.appendChild; Element.prototype.appendChild=function(node){ const result=originalAppend.call(this,node); if(node.className==='rose-pine-early') window.__early={background:getComputedStyle(document.documentElement).backgroundColor,state:document.readyState}; return result; };\n`+source});
          const page = await context.newPage(), errors=[];
          page.on('pageerror', error => errors.push(error.message));
          await page.goto(`http://127.0.0.1:${server.address().port}/`, {waitUntil:'domcontentloaded'});
          const initial = await page.evaluate(() => window.__early);
          assert(initial, `${name}/${mode}: early style inserted`);
          assert(['loading', 'interactive'].includes(initial.state), `${name}/${mode}: temporary style added before complete`);
          if (name !== 'webkit') assert.equal(initial.state, 'loading', `${name}/${mode}: initialized while loading`);
          assert.equal(initial.background, mode === 'dark' ? 'rgb(25, 23, 36)' : 'rgb(250, 244, 237)');
          assert.equal(await page.locator('style.rose-pine-early').count(), 0);
          assert.equal(await page.locator('#content').textContent(), 'Usable page');
          await page.waitForTimeout(2000);
          assert.deepEqual(errors, []);
          console.log(JSON.stringify({browser:name,mode,earlyBackground:initial.background,documentStateAtInsertion:initial.state,temporaryStyleRemoved:true}));
          await context.close();
        }
      } finally { await browser.close(); }
    }
  } finally { server.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
