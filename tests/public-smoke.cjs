// Opt-in, read-only public entry pages in a fresh context; no personal profile.
const {chromium} = require('playwright');
const fs = require('node:fs');
const axe = require('axe-core');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/rose-pine.user.js'), 'utf8');
const sites = [['bitwarden','https://vault.bitwarden.com/'],['youtube','https://www.youtube.com/'],['cloudflare','https://dash.cloudflare.com/'],['graphify','https://app.graphify.com/'],['digitalocean','https://cloud.digitalocean.com/'],['elements','https://html-elements-test-page.netlify.app/']];
(async()=>{
  const options = {headless:true};
  if(process.env.VIVALDI_PATH){options.executablePath=process.env.VIVALDI_PATH;options.args=['--disable-vivaldi','--disable-extensions'];}
  const scheme=process.env.COLOR_SCHEME==='dark'?'dark':'light';
  const browser=await chromium.launch(options),context=await browser.newContext({colorScheme:scheme});
  try {
    const output=path.join(root,'test-results','public',scheme);fs.mkdirSync(output,{recursive:true});
    let failed=false;
    for(const [name,url] of sites){
      const page=await context.newPage(), errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      try {
        await page.addInitScript({content:axe.source});
        await page.addInitScript({content:'document.addEventListener("DOMContentLoaded",()=>{'+source+'},{once:true});'});
        const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
        await page.waitForTimeout(5000);
        const result=await page.evaluate(()=>({hostname:location.hostname,path:location.pathname,elementCount:document.body?.querySelectorAll('*').length||0,themeStyleCount:document.querySelectorAll('.darkreader,.rose-pine-bitwarden-native,#rose-pine-youtube').length}));
        await page.screenshot({path:path.join(output,name+'.png')});
        await page.waitForTimeout(600);
        const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:['color-contrast']});return {violations:r.violations.reduce((n,v)=>n+v.nodes.length,0),incomplete:r.incomplete.reduce((n,v)=>n+v.nodes.length,0)};});
        const control=page.locator('a:visible,button:visible,input:visible').first();
        const interactive=await control.count()>0;
        if(interactive)await control.hover({timeout:5000});
        const status=response?.status()??0;
        if(status>=400||!result.elementCount||errors.length)failed=true;
        console.log(JSON.stringify({site:name,mode:scheme,status,...result,audit,hoverChecked:interactive,errors}));
      } catch(error){failed=true;console.log(JSON.stringify({site:name,error:error.message.split('\n')[0]}));}
      await page.close();
    }
    if(failed)process.exitCode=1;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
