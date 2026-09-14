import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=process.argv[2]||9439, url=process.argv[3]||'http://127.0.0.1:5059/';
const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();const errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;};
const delay=ms=>new Promise(r=>setTimeout(r,ms));const checks=[];
try {
await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
// Existing analytics/fonts and optional sketch CDN cannot affect this test.
await send('Network.setBlockedURLs',{urls:['*stats.dr.eamer.dev*','*fonts.googleapis.com*','*fonts.gstatic.com*','*cdn.jsdelivr.net*']});
await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('attractorPlaygroundOnboardingCompleted','true');"});
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url});
for(let i=0;i<100;i++){if(await evaluate('!!window.AttractorApp?.Lessons'))break;await delay(50);}

assert.equal(await evaluate('!!THREE && !!katex && !!AttractorApp.Lessons'),true);checks.push('Bundled Three.js and KaTeX work with external requests blocked');
assert.equal(await evaluate("document.querySelector('#lessonsPanel').inert && document.querySelector('#equationsPanel').inert"),true);
await evaluate("document.querySelector('#equationsBtn').click()");assert.equal(await evaluate("document.querySelectorAll('#equationsBody .katex').length"),3);
await evaluate("document.querySelector('#lessonsBtn').click()");assert.equal(await evaluate("document.querySelector('#equationsPanel').inert"),true);assert.equal(await evaluate("document.querySelectorAll('.lesson-item').length"),5);checks.push('Exclusive panels, hidden inert controls and five supported lessons');
await evaluate("document.querySelectorAll('.lesson-item')[1].click();document.querySelector('.lesson-nav-next').click()");
assert.equal(await evaluate('currentParams.p2'),0.8);assert.equal(await evaluate("Number(document.querySelector('#param2Slider').value)"),0.8);assert.equal(await evaluate('AttractorApp.ThreeD.isActive()'),true);checks.push('Lesson standard parameters and controls agree; 3D starts');
await evaluate("AttractorApp.Lessons.close();document.querySelector('#floatingPlayPauseBtn').click()");await delay(150);
const stopped=await evaluate('AttractorApp.ThreeD.snapshot()');await delay(150);assert.deepEqual(await evaluate('AttractorApp.ThreeD.snapshot()'),stopped);assert.equal(stopped.framePending,false);checks.push('3D Pause stops integration and cancels animation frames');
await evaluate("document.querySelector('#floatingPlayPauseBtn').click()");await delay(150);assert.notDeepEqual(await evaluate('AttractorApp.ThreeD.snapshot().head'),stopped.head);checks.push('3D Play resumes');
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await delay(150);const still=await evaluate('AttractorApp.ThreeD.snapshot()');await delay(150);assert.deepEqual(await evaluate('AttractorApp.ThreeD.snapshot()'),still);assert.equal(still.framePending,false);checks.push('Reduced motion stops 3D animation');
await evaluate("document.querySelector('#canvas3d').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});assert.equal(await evaluate("document.querySelector('#inspectReadout').getAttribute('aria-hidden')"),'false');checks.push('Keyboard inspection works in 3D');
await evaluate('AttractorApp.ThreeD.disable(); currentAttractor="lorenz";document.querySelector("#attractorSelect").value="lorenz";updateAttractor();currentParams={p1:10,p2:28,p3:8/3};AttractorApp.Lyapunov.setVisible(true);for(let i=0;i<1600;i++)AttractorApp.Lyapunov.afterFrame();');
const lorenz=await evaluate('AttractorApp.Lyapunov.snapshot()');assert.ok(lorenz.current>0.8&&lorenz.current<1.02,JSON.stringify(lorenz));checks.push(`Lorenz standard λ estimate ${lorenz.current.toFixed(4)} after ${lorenz.elapsed.toFixed(1)} model time`);
await evaluate('currentAttractor="clifford";updateAttractor();AttractorApp.Lyapunov.afterFrame();');assert.equal(await evaluate('AttractorApp.Lyapunov.snapshot().supported'),false);assert.equal(await evaluate("document.querySelector('#lyapunovValue').textContent"),'—');checks.push('Discrete maps do not display invalid ODE estimates');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await delay(400);
assert.equal(await evaluate("Array.from(document.querySelectorAll('.analysis-controls .ctrl-btn')).filter(e=>getComputedStyle(e).display!=='none').every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth})"),true);checks.push('390px analysis toolbar fits with 44px targets');
await evaluate('AttractorApp.Equations.open()');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});assert.equal(await evaluate('document.activeElement.id'),'equationsBtn');checks.push('Escape closes panel and restores focus');
await evaluate("AttractorApp.Lessons.open();document.querySelector('.lesson-back')?.click()");
for (let lesson=0;lesson<5;lesson++) {
  await evaluate(`document.querySelectorAll('.lesson-item')[${lesson}].click()`);
  for(let step=0;step<4;step++) {
    const label=await evaluate("document.querySelector('.lesson-nav-next')?.textContent");
    if(!label)break;
    await evaluate("document.querySelector('.lesson-nav-next').click()");
  }
  assert.equal(await evaluate("document.querySelectorAll('.lesson-item').length"),5);
}
assert.equal(await evaluate("document.querySelectorAll('.lesson-badge.done').length"),5);checks.push('All five lesson flows reach completion');
await evaluate('AttractorApp.Lessons.close();currentAttractor="lorenz";document.querySelector("#attractorSelect").value="lorenz";updateAttractor();currentParams={p1:10,p2:28,p3:8/3};initParticles();AttractorApp.ThreeD.refresh();');
if(process.env.ATTRACTIVE_EVIDENCE_DIR){
  const dir=process.env.ATTRACTIVE_EVIDENCE_DIR;await fs.mkdir(dir+'/downloads',{recursive:true});
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:dir+'/downloads'});
  await evaluate("document.querySelector('#exportBtn').click()");
  for(let i=0;i<50;i++){if((await fs.readdir(dir+'/downloads')).includes('attractor-lorenz-3d.png'))break;await delay(50);}
  const png=await fs.readFile(dir+'/downloads/attractor-lorenz-3d.png');assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(png.length>1000);checks.push('3D export produces a PNG from the visible renderer');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await delay(400);
  await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFile(dir+'/desktop-3d.png',Buffer.from(r.data,'base64')));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await delay(400);
}

assert.deepEqual(errors,[]);checks.push('No uncaught browser exceptions');
if(process.env.ATTRACTIVE_EVIDENCE_DIR){const dir=process.env.ATTRACTIVE_EVIDENCE_DIR;await send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFile(dir+'/mobile.png',Buffer.from(r.data,'base64')));await fs.writeFile(dir+'/browser-results.json',JSON.stringify({checks,lorenz,errors},null,2));}
console.log(JSON.stringify({checks,lorenz,errors},null,2));
} finally { ws.close(); }
