/**
 * Night Waves Host Contract v0.7
 * A narrow event contract so Track Intelligence can hand off recommendations
 * without importing or touching Find Sound internals.
 */
(function(global){
'use strict';
function emitTrackRecommendation(recommendation={}){
  const detail={
    message:String(recommendation.message||recommendation.summary||'').slice(0,280),
    confidence:Number.isFinite(+recommendation.confidence)?Math.max(0,Math.min(1,+recommendation.confidence)):.5,
    bpm:Number.isFinite(+recommendation.bpm)&&+recommendation.bpm>0?+recommendation.bpm:null,
    root:typeof recommendation.root==='string'?recommendation.root.slice(0,8):null,
    durationBars:Number.isFinite(+recommendation.durationBars)&&+recommendation.durationBars>0?+recommendation.durationBars:null,
    role:typeof recommendation.role==='string'?recommendation.role.slice(0,40):'transition'
  };
  global.dispatchEvent(new CustomEvent('nw:track-recommendation',{detail}));
  return detail;
}
const api={VERSION:'0.7.0',emitTrackRecommendation};
if(typeof module!=='undefined'&&module.exports) module.exports=api;
global.NightWavesHostContract=api;
})(typeof window!=='undefined'?window:globalThis);
