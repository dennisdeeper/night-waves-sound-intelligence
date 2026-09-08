const assert=require('assert'), fs=require('fs'), vm=require('vm');

const ctx={globalThis:{},console};
ctx.globalThis=ctx;
vm.createContext(ctx);
for(const f of ['nw-intelligence-bridge.js','nw-audio-dna.js','nw-find-sound-adapter.js','nw-track-find-hook.js']){
  vm.runInContext(fs.readFileSync('./'+f,'utf8'),ctx,{filename:f});
}
const hook=ctx.NightWavesTrackFindHook;
assert(hook);
const payload=hook.buildBridgePayload({
  message:'Transition needs more energy, brighter movement and a transient lift',
  confidence:.78,bpm:124,root:'F#',durationBars:2,role:'transition'
});
assert.equal(payload.schema,'nw.track-to-find-sound/0.6');
assert.equal(payload.confidenceBand,'medium');
assert.equal(payload.safety.autoCommit,false);
assert.equal(payload.safety.touchesAudioGraph,false);
assert(payload.request && payload.request.intent);

const candidates=[
 {id:'a',energy:.8,brightness:.75,movement:.8,transient:.8,texture:.6,role:'transition',bpm:124,root:'F#',confidence:.9},
 {id:'b',energy:.2,brightness:.25,movement:.2,transient:.2,texture:.3,role:'pad',bpm:92,root:'C',confidence:.9}
];
const ranked=hook.rankFromTrack(payload.recommendation,candidates);
assert.equal(ranked.results.length,2);
assert.equal(ranked.results[0].candidate.id,'a');

const ui=fs.readFileSync('./nw-find-sound-ui.js','utf8');
const html=fs.readFileSync('./demo-v0.6.html','utf8');
assert(ui.includes('renderConfidence'));
assert(ui.includes('renderIntent'));
assert(ui.includes('unwrapCandidate'));
assert(html.includes('Warm Studio'));
assert(html.includes('Cyan / Red Pulse'));
assert(html.includes('nwConfidence'));
assert(html.includes('nwIntent'));
assert(!hook.buildBridgePayload({}).safety.changesDSP);
assert(!html.includes('getUserMedia'));
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.deepStrictEqual(ids.filter((id,i)=>ids.indexOf(id)!==i),[]);
console.log('PASS: v0.6 Track Intelligence → Find Sound integration-gate tests');
