const assert=require('assert');
const fs=require('fs');
const bridge=require('./nw-intelligence-bridge.js');
global.NightWavesIntelligenceBridge=bridge;
const hook=require('./nw-track-find-hook.js');
global.NightWavesTrackFindHook=hook;
const dna=require('./nw-audio-dna.js');
global.NightWavesAudioDNA=dna;
const handoff=require('./nw-studio-handoff.js');
const runner=require('./nw-analysis-runner.js');

(async()=>{
  // malformed Track Intelligence payloads normalize safely
  const bad=hook.normalizeRecommendation({message:'x'.repeat(500),confidence:99,bpm:'oops',root:' ridiculously-long ',durationBars:-2,role:''});
  assert.equal(bad.message.length,280);
  assert.equal(bad.confidence,1);
  assert.equal(bad.bpm,null);
  assert.equal(bad.durationBars,null);
  assert.equal(bad.role,'transition');
  assert.ok(['high','medium','low'].includes(hook.confidenceBand(bad.confidence)));

  // handoff strips arbitrary/binary-looking fields and transports metadata only
  const selection={score:88.4,reasons:['energy match','tempo fit'],candidate:{id:'slice-3',startSeconds:4,endSeconds:6,energy:.8,brightness:.7,confidence:.72,root:'F#',bpm:124,buffer:{secret:true},left:new Float32Array(10)}};
  const m=handoff.buildManifest(selection,{message:'needs lift',confidence:.7,bpm:124,root:'F#'});
  assert(handoff.validateManifest(m));
  assert.equal(m.safety.containsAudio,false);
  assert.equal(m.safety.touchesAudioGraph,false);
  assert.equal(m.safety.changesDSP,false);
  assert.equal(m.safety.changesRecorder,false);
  assert.equal(m.safety.changesScenes,false);
  assert(!('buffer' in m.candidate));
  assert(!('left' in m.candidate));

  // fallback analysis works for mono and produces candidates
  const sr=8000, samples=new Float32Array(sr*2);
  for(let i=0;i<samples.length;i++) samples[i]=Math.sin(2*Math.PI*220*i/sr)*.2;
  const buffer={sampleRate:sr,length:samples.length,numberOfChannels:1,getChannelData:()=>samples};
  let progress=[];
  const cands=await runner.analyse(buffer,{useWorker:false,sliceSeconds:.5,onProgress:v=>progress.push(v)});
  assert(cands.length>=3);
  assert.equal(progress.at(-1),100);

  // cancellation interrupts yielding fallback
  const long=new Float32Array(sr*20);
  const longBuffer={sampleRate:sr,length:long.length,numberOfChannels:1,getChannelData:()=>long};
  const ac=new AbortController();
  setTimeout(()=>ac.abort(),3);
  let cancelled=false;
  try{ await runner.analyse(longBuffer,{useWorker:false,sliceSeconds:.25,signal:ac.signal}); }
  catch(e){ cancelled=e.name==='AbortError'; }
  assert(cancelled,'expected AbortError cancellation');

  // static shell protects production audio APIs
  const html=fs.readFileSync('./connected-studio-v1.3.html','utf8');
  assert(html.includes('nw-studio-handoff.js'));
  assert(html.includes('src="./index.html"'));
  assert(html.includes('nw:studio-handoff-request'));
  for(const forbidden of ['getUserMedia','MediaRecorder','applyDSP(','connectInput(']) assert(!html.includes(forbidden),forbidden);
  console.log('PASS: v1.3 recommendation normalization, metadata handoff, mono analysis, progress and cancellation regression');
})().catch(e=>{console.error(e);process.exit(1)});
