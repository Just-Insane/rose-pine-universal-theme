const {chromium, webkit} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../src/rose-pine.user.js'), 'utf8');
(async () => {
  const engines = [['chromium', chromium, {}], ['webkit', webkit, {}]];
  if (process.env.VIVALDI_PATH) engines.push(['vivaldi', chromium, {executablePath:process.env.VIVALDI_PATH,args:['--disable-vivaldi','--disable-extensions']}]);
  for (const [name, engine, options] of engines) {
    const browser=await engine.launch({headless:true,...options});
    try {
      for (const mode of ['dark', 'light']) {
      const page=await browser.newPage({colorScheme:mode});
      await page.setContent('<style>body{background:#171717;color:#eee}:root{--accent:red} #late{background:var(--bg,white)} #ref{background:red}</style><svg><path id="variable" stroke="var(--accent)" d="M0 0 L10 10"/><path id="direct" stroke="red" d="M0 0 L10 10"/></svg><div id="late">Late</div><div id="ref">Reference</div>');
      await page.addScriptTag({content:source});
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#ref')).backgroundColor !== 'rgb(255, 0, 0)', null, {timeout: 10000});
      await page.waitForTimeout(500);
      const stroke=await page.evaluate(()=>[getComputedStyle(document.querySelector('#variable')).stroke,getComputedStyle(document.querySelector('#direct')).stroke]);
      assert.equal(stroke[0],stroke[1],`${name}: SVG variable stroke matches equivalent direct color`);
      await page.evaluate(()=>{const s=document.createElement('style');s.textContent=':root { --bg: red; }';document.head.appendChild(s)});
      await page.waitForTimeout(1500);
      const background=await page.evaluate(()=>[getComputedStyle(document.querySelector('#late')).backgroundColor,getComputedStyle(document.querySelector('#ref')).backgroundColor]);
      assert.equal(background[0],background[1],`${name}: late-defined background variable is themed like the equivalent direct color`);
      console.log(JSON.stringify({browser:name,mode,stroke,background}));
      await page.close();
      }
    } finally {await browser.close();}
  }
})().catch(e=>{console.error(e);process.exitCode=1});
