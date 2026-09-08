/**
 * Night Waves Analysis Runner v0.5
 * Worker-first analysis with cancellable, yielding fallback.
 */
(function(global){
'use strict';

function abortError(){
  try { return new DOMException('Analysis cancelled','AbortError'); }
  catch { const e=new Error('Analysis cancelled'); e.name='AbortError'; return e; }
}
function validateBuffer(buffer){
  if(!buffer || typeof buffer.getChannelData!=='function') throw new Error('AudioBuffer-like object required');
  if(!Number.isFinite(buffer.sampleRate) || buffer.sampleRate<=0) throw new Error('Invalid sample rate');
  if(!Number.isFinite(buffer.length) || buffer.length<=0) throw new Error('Audio buffer is empty');
}
function candidateFromSlice(index,start,end,dna){
  return {id:`slice-${index+1}`,startSeconds:start,endSeconds:end,...dna,metadata:{auditionOnly:true}};
}
async function fallbackAnalyse(buffer,opts={}){
  validateBuffer(buffer);
  if(!global.NightWavesAudioDNA) throw new Error('NightWavesAudioDNA is required');
  const {signal,onProgress,bpm=null,role='unknown',sliceSeconds=2,hopSeconds=null}=opts;
  if(signal?.aborted) throw abortError();

  const sr=buffer.sampleRate;
  const left=buffer.getChannelData(0);
  const right=buffer.numberOfChannels>1 ? buffer.getChannelData(1) : null;
  const size=Math.max(1,Math.round(Math.max(.25,sliceSeconds)*sr));
  const hop=Math.max(1,Math.round(Math.max(.25,hopSeconds||sliceSeconds)*sr));
  const total=Math.max(1,Math.ceil(left.length/hop));
  const candidates=[];

  for(let start=0,index=0; start<left.length; start+=hop,index++){
    if(signal?.aborted) throw abortError();
    const end=Math.min(left.length,start+size);
    if((end-start)/sr<.25) break;
    const dna=global.NightWavesAudioDNA.analysePCM({
      left:left.slice(start,end), right:right?right.slice(start,end):null,
      sampleRate:sr,bpm,role,source:'slice'
    });
    candidates.push(candidateFromSlice(candidates.length,start/sr,end/sr,dna));
    onProgress?.(Math.min(99,Math.round(((index+1)/total)*100)));
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  onProgress?.(100);
  return candidates;
}
function workerAnalyse(buffer,opts={}){
  validateBuffer(buffer);
  const {signal,onProgress,bpm=null,role='unknown',sliceSeconds=2,hopSeconds=null}=opts;
  return new Promise((resolve,reject)=>{
    if(signal?.aborted) return reject(abortError());
    const worker=new Worker('./nw-analysis-worker.js');
    const left=buffer.getChannelData(0).slice();
    const right=buffer.numberOfChannels>1 ? buffer.getChannelData(1).slice() : null;
    const cleanup=()=>{ try{worker.terminate()}catch{}; signal?.removeEventListener?.('abort',onAbort); };
    const onAbort=()=>{ try{worker.postMessage({type:'cancel'})}catch{}; cleanup(); reject(abortError()); };
    signal?.addEventListener?.('abort',onAbort,{once:true});
    worker.onmessage=(event)=>{
      const msg=event.data||{};
      if(msg.type==='progress') onProgress?.(msg.value);
      else if(msg.type==='done'){ cleanup(); onProgress?.(100); resolve(msg.candidates||[]); }
      else if(msg.type==='cancelled'){ cleanup(); reject(abortError()); }
      else if(msg.type==='error'){ cleanup(); reject(new Error(msg.message||'Worker analysis failed')); }
    };
    worker.onerror=(e)=>{ cleanup(); reject(new Error(e.message||'Worker failed')); };
    worker.postMessage({
      type:'analyse',
      left:left.buffer,
      right:right?right.buffer:null,
      sampleRate:buffer.sampleRate,
      sliceSeconds,
      hopSeconds:hopSeconds||sliceSeconds,
      bpm,role
    }, right?[left.buffer,right.buffer]:[left.buffer]);
  });
}
async function analyse(buffer,opts={}){
  if(typeof Worker!=='undefined' && opts.useWorker!==false){
    try { return await workerAnalyse(buffer,opts); }
    catch(err){
      if(err?.name==='AbortError') throw err;
      opts.onFallback?.(err);
    }
  }
  return fallbackAnalyse(buffer,opts);
}
const api={VERSION:'0.5.0',analyse,fallbackAnalyse,validateBuffer};
if(typeof module!=='undefined'&&module.exports) module.exports=api;
global.NightWavesAnalysisRunner=api;
})(typeof window!=='undefined'?window:globalThis);
