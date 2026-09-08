/**
 * Night Waves Studio Handoff Contract v0.1
 * Metadata-only selection handoff. Never transports audio buffers or touches production audio state.
 */
(function(global){
'use strict';

function finiteOrNull(v){ const n=Number(v); return Number.isFinite(n)?n:null; }
function clipText(v,max){ return String(v??'').trim().slice(0,max); }
function clamp01(v){ const n=Number(v); return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0; }

function normalizeCandidate(input={}){
  const c=input?.candidate||input||{};
  const out={
    id:clipText(c.id||'candidate',80),
    startSeconds:Math.max(0,finiteOrNull(c.startSeconds)??0),
    endSeconds:Math.max(0,finiteOrNull(c.endSeconds)??0),
    energy:clamp01(c.energy), brightness:clamp01(c.brightness), movement:clamp01(c.movement),
    transient:clamp01(c.transient), width:clamp01(c.width), tonality:clamp01(c.tonality),
    texture:clamp01(c.texture), darkness:clamp01(c.darkness), density:clamp01(c.density), warmth:clamp01(c.warmth),
    root:clipText(c.root,8)||null, bpm:(finiteOrNull(c.bpm)>0?finiteOrNull(c.bpm):null),
    role:clipText(c.role||'unknown',40)||'unknown', confidence:clamp01(c.confidence)
  };
  if(out.endSeconds<out.startSeconds) out.endSeconds=out.startSeconds;
  return out;
}

function normalizeRecommendation(rec={}){
  const hook=global.NightWavesTrackFindHook;
  if(hook?.normalizeRecommendation) return hook.normalizeRecommendation(rec);
  return {
    message:clipText(rec.message||rec.summary||'Track needs another sound',280),
    confidence:clamp01(rec.confidence??.5),
    bpm:(finiteOrNull(rec.bpm)>0?finiteOrNull(rec.bpm):null),
    root:clipText(rec.root,8)||null,
    durationBars:(finiteOrNull(rec.durationBars)>0?finiteOrNull(rec.durationBars):null),
    role:clipText(rec.role||'transition',40)||'transition'
  };
}

function buildManifest(selection,recommendation={}){
  const wrapped=selection||{};
  const candidate=normalizeCandidate(wrapped);
  const score=finiteOrNull(wrapped.score);
  const reasons=Array.isArray(wrapped.reasons)?wrapped.reasons.slice(0,4).map(x=>clipText(x,60)).filter(Boolean):[];
  return {
    schema:'nw.studio-handoff/0.1',
    createdAt:new Date().toISOString(),
    candidate,
    match:{score:score==null?null:Math.max(0,Math.min(100,score)),reasons},
    recommendation:normalizeRecommendation(recommendation),
    safety:{
      metadataOnly:true,
      containsAudio:false,
      auditionOnly:true,
      autoCommit:false,
      touchesAudioGraph:false,
      changesDSP:false,
      changesRecorder:false,
      changesScenes:false
    }
  };
}

function validateManifest(m){
  if(!m||m.schema!=='nw.studio-handoff/0.1') return false;
  if(!m.candidate||typeof m.candidate.id!=='string') return false;
  if(!m.safety?.metadataOnly||m.safety?.containsAudio!==false) return false;
  const forbidden=['buffer','audioBuffer','pcm','left','right','channelData','blob','file'];
  const s=JSON.stringify(m);
  return !forbidden.some(k=>new RegExp('"'+k+'"\\s*:','i').test(s));
}

function emit(selection,recommendation){
  const manifest=buildManifest(selection,recommendation);
  if(!validateManifest(manifest)) throw new Error('Unsafe Studio handoff rejected');
  if(typeof global.dispatchEvent==='function'&&typeof global.CustomEvent!=='undefined'){
    global.dispatchEvent(new CustomEvent('nw:studio-handoff-request',{detail:manifest}));
  }
  return manifest;
}

const api={VERSION:'0.1.0',normalizeCandidate,normalizeRecommendation,buildManifest,validateManifest,emit};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
global.NightWavesStudioHandoff=api;
})(typeof window!=='undefined'?window:globalThis);
