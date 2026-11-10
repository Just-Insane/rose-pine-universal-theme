const {chromium, webkit} = require('playwright');
const axe = require('axe-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/rose-pine.user.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'fixtures/mixed.html'), 'utf8');
function luminance(value) {
  const c = value.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}
function ratio(fg, bg) { const a = luminance(fg), b = luminance(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }
(async () => {
  const engines = [['chromium', chromium, {}, {}], ['webkit', webkit, {}, {}], ['webkit-mobile', webkit, {}, {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}]];
  if (process.env.VIVALDI_PATH) engines.push(['vivaldi', chromium, {executablePath: process.env.VIVALDI_PATH, args: ['--disable-vivaldi', '--disable-extensions']}, {}]);
  for (const [name, engine, options, device] of engines) {
    const browser = await engine.launch({headless: true, ...options});
    try {
      for (const mode of ['light', 'dark']) {
        const context = await browser.newContext({colorScheme: mode, viewport: {width: 900, height: 700}, ...device});
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('http://example.test/**', route => route.fulfill({status: 200, contentType: 'text/html', body: html}));
        await page.goto('http://example.test/');
        await page.addScriptTag({content: source});
        await page.waitForTimeout(7500);
        const read = selector => page.$eval(selector, e => { const s = getComputedStyle(e); return {fg: s.color, bg: s.backgroundColor, parentBg: getComputedStyle(e.parentElement).backgroundColor, tone: e.getAttribute('data-rose-pine-link-tone')}; });
        const badge = await read('#badge'), alt = await read('#badge-alt'), neutral = await read('#dark-fix');
        for (const id of ['disabled', 'button-role']) assert.equal((await read('#' + id)).tone, null, `${name}/${mode}: ${id} remains untouched`);
        assert(ratio(badge.fg, badge.bg) >= 4.5, `${name}/${mode}: badge contrast`);
        assert(ratio(alt.fg, alt.bg) >= 4.5, `${name}/${mode}: overridden badge contrast`);
        assert(ratio(neutral.fg, neutral.bg) >= 4.5, `${name}/${mode}: neutral text contrast`);
        if (mode === 'dark') { const changedNeutral = await read('#dark-override'); assert(ratio(changedNeutral.fg, changedNeutral.bg) >= 4.5, `${name}: overridden neutral text contrast`); }
        const output = path.join(root, 'test-results'); fs.mkdirSync(output, {recursive: true});
        await page.screenshot({path: path.join(output, `${name}-${mode}-initial.png`)});
        await page.waitForTimeout(1000);
        if (mode === 'light') {
          assert(neutral.tone, `${name}: neutral correction active`);
          await page.$eval('#dark-fix', e => e.setAttribute('aria-disabled', 'true'));
          await page.waitForTimeout(500);
          assert.equal((await read('#dark-fix')).tone, null, `${name}: disabled state removes correction`);
          await page.$eval('#dark-fix', e => e.removeAttribute('aria-disabled'));
          await page.waitForTimeout(1000);
          assert((await read('#dark-fix')).tone, `${name}: correction returns when enabled`);
          const light = await read('#light'), dark = await read('#dark');
          assert(ratio(light.fg, light.parentBg) >= 4.5, `${name}: light surface link`);
          assert(ratio(dark.fg, dark.parentBg) >= 4.5, `${name}: dark surface link`);
          for (const id of ['gradient', 'warning', 'overlay']) assert.equal((await read('#' + id)).tone, null, `${name}: ${id} is not adjusted`);
          await page.hover('#hover'); assert.equal((await read('#hover')).tone, null, `${name}: hover remains native`);
          await page.mouse.move(0, 0); await page.waitForTimeout(300);
          await page.evaluate(() => { const sheet = document.querySelector('style:not(.darkreader)').sheet; [...sheet.cssRules].find(r => r.selectorText === '.badge').style.backgroundColor = '#123'; });
          await page.waitForTimeout(1500); const changed = await read('#badge');
          assert.notEqual(changed.bg, badge.bg, `${name}: in-place stylesheet change applied`);
          assert(ratio(changed.fg, changed.bg) >= 4.5, `${name}: changed badge contrast`);
          await page.locator('#offscreen').scrollIntoViewIfNeeded(); await page.waitForTimeout(1600);
          assert((await read('#offscreen')).tone, `${name}: link adjusted after scroll`);
        }
        await page.screenshot({path: path.join(output, `${name}-${mode}-final.png`)});
        await page.addScriptTag({content: axe.source}); await page.waitForTimeout(600);
        const audit = await page.evaluate(async () => { const r = await axe.run(document, {runOnly: ['color-contrast']}); return {violations: r.violations.reduce((a, v) => a + v.nodes.length, 0), incomplete: r.incomplete.reduce((a, v) => a + v.nodes.length, 0)}; });
        assert.deepEqual(errors, [], `${name}/${mode}: page errors`);
        console.log(JSON.stringify({browser: name, mode, badge: ratio(badge.fg, badge.bg).toFixed(2), neutral: ratio(neutral.fg, neutral.bg).toFixed(2), axe: audit}));
        await context.close();
      }
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
