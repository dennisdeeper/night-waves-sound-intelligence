/**
 * Night Waves Find Sound Adapter v0.3
 * Isolated integration layer: no audio graph, recorder, Live Input, Scenes or DSP mutation.
 */
(function(global){
'use strict';
const BRIDGE=()=>global.NightWavesIntelligenceBridge;
const DNA=()=>global.NightWavesAudioDNA;
const eventTarget = typeof EventTarget !== 'undefined' ? new EventTarget() : null;

function assertDeps(){
  if(!BRIDGE()) throw new Error('NightWavesIntelligenceBridge is required');
  if(!DNA()) throw new Error('NightWavesAudioDNA is required');
}
function pcmFromAudioBuffer(buffer){
  if(!buffer || typeof buffer.getChannelData!=='function') throw new Error('AudioBuffer-like object required');
  return {
    left: buffer.getChannelData(0),
    right: buffer.numberOfChannels>1 ? buffer.getChannelData(1) : null,
    sampleRate: buffer.sampleRate
  };
}
function emit(name,detail){
  if(eventTarget && typeof CustomEvent!=='undefined') eventTarget.dispatchEvent(new CustomEvent(name,{detail}));
}
function on(name,fn){ if(eventTarget) eventTarget.addEventListener(name,fn); return ()=>eventTarget&&eventTarget.removeEventListener(name,fn); }

async function analyseBuffer(buffer, opts={}){
  assertDeps();
  const {signal,onProgress,bpm=null,role='unknown',sliceSeconds=2,hopSeconds=null}=opts;
  if(signal?.aborted) throw new DOMException('Analysis cancelled','AbortError');
  onProgress?.(5);
  await Promise.resolve();
  const pcm=pcmFromAudioBuffer(buffer);
  const slices=DNA().analyseSlices({...pcm,bpm,role,sliceSeconds,hopSeconds});
  if(signal?.aborted) throw new DOMException('Analysis cancelled','AbortError');
  onProgress?.(75);
  const candidates=slices.map(s=>({
    id:s.id, startSeconds:s.startSeconds,endSeconds:s.endSeconds,
    ...s.dna, metadata:{auditionOnly:true}
  }));
  onProgress?.(100);
  emit('nw:candidates-ready',{candidates});
  return candidates;
}
function findMatches(recommendation,candidates){
  assertDeps();
  const request=BRIDGE().buildFindSoundRequest(recommendation);
  emit('nw:find-sound-request',request);
  const results=BRIDGE().rankCandidates(request.intent,candidates);
  emit('nw:find-sound-results',{request,results});
  return {request,results};
}
function requestPreview(candidate){
  const payload={candidate, auditionOnly:true, autoCommit:false, changesDSP:false};
  emit('nw:preview-candidate',payload);
  return payload;
}
const api={VERSION:'0.3.0',analyseBuffer,findMatches,requestPreview,on,pcmFromAudioBuffer};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
global.NightWavesFindSoundAdapter=api;
})(typeof window!=='undefined'?window:globalThis);
