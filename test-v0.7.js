const assert=require('assert'),fs=require('fs'),vm=require('vm');
class CE{constructor(type,opts={}){this.type=type;this.detail=opts.detail}}
const listeners={};
const ctx={console,CustomEvent:CE,dispatchEvent:e=>(listeners[e.type]||[]).forEach(f=>f(e)),addEventListener:(n,f)=>(listeners[n]||(listeners[n]=[])).push(f)};
ctx.globalThis=ctx; vm.createContext(ctx);
for(const f of ['nw-intelligence-bridge.js','nw-track-find-hook.js','nw-host-contract.js']){
 vm.runInContext(fs.readFileSync('./'+f,'utf8'),ctx,{filename:f});
}
let seen=null; ctx.addEventListener('nw:track-recommendation',e=>seen=e.detail);
const out=ctx.NightWavesHostContract.emitTrackRecommendation({message:'Need brighter movement',confidence:1.4,bpm:124,root:'F#'});
assert(seen); assert.equal(out.confidence,1); assert.equal(out.bpm,124); assert.equal(out.root,'F#');
const normalized=ctx.NightWavesTrackFindHook.normalizeRecommendation(seen);
assert.equal(normalized.message,'Need brighter movement');

for(const f of ['nw-find-sound-mount.js','nw-host-contract.js']){
 const s=fs.readFileSync('./'+f,'utf8');
 assert(!s.includes('getUserMedia'));
 assert(!s.includes('MediaRecorder'));
 assert(!s.includes('AudioContext'));
 assert(!s.includes('connectInput('));
 assert(!s.includes('applyDSP('));
}
const html=fs.readFileSync('./demo-v0.7-mount.html','utf8');
assert(html.includes('Warm Studio'));assert(html.includes('Cyan / Red Pulse'));
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.deepStrictEqual(ids.filter((x,i)=>ids.indexOf(x)!==i),[]);
console.log('PASS: v0.7 isolated host-contract regression tests');