/**
 * Night Waves Track Intelligence → Find Sound Hook v0.6
 * Pure translation / orchestration layer. No production audio graph access.
 */
(function(global){
'use strict';

function clamp01(v){
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}
function confidenceBand(v){
  const c = clamp01(v);
  if(c >= .8) return 'high';
  if(c >= .55) return 'medium';
  return 'low';
}
function normalizeRecommendation(input={}){
  return {
    message: String(input.message || input.summary || 'Track needs another sound').slice(0, 280),
    confidence: clamp01(input.confidence ?? .5),
    bpm: Number.isFinite(+input.bpm) && +input.bpm > 0 ? +input.bpm : null,
    root: typeof input.root === 'string' && input.root.trim() ? input.root.trim().slice(0,8) : null,
    durationBars: Number.isFinite(+input.durationBars) && +input.durationBars > 0 ? +input.durationBars : null,
    role: typeof input.role === 'string' && input.role.trim() ? input.role.trim().slice(0,40) : 'transition'
  };
}
function buildBridgePayload(recommendation){
  if(!global.NightWavesIntelligenceBridge) throw new Error('NightWavesIntelligenceBridge required');
  const rec = normalizeRecommendation(recommendation);
  const request = global.NightWavesIntelligenceBridge.buildFindSoundRequest(rec);
  return {
    schema: 'nw.track-to-find-sound/0.6',
    recommendation: rec,
    confidenceBand: confidenceBand(rec.confidence),
    request,
    safety: {
      auditionOnly: true,
      autoCommit: false,
      touchesAudioGraph: false,
      changesDSP: false,
      changesRecorder: false,
      changesScenes: false
    }
  };
}
function rankFromTrack(recommendation,candidates=[]){
  if(!global.NightWavesFindSoundAdapter) throw new Error('NightWavesFindSoundAdapter required');
  const payload = buildBridgePayload(recommendation);
  const ranked = global.NightWavesFindSoundAdapter.findMatches(payload.recommendation,candidates);
  return {
    ...payload,
    results: ranked.results || [],
    intent: ranked.request?.intent || payload.request?.intent || {}
  };
}

const api={VERSION:'0.6.0',clamp01,confidenceBand,normalizeRecommendation,buildBridgePayload,rankFromTrack};
if(typeof module!=='undefined'&&module.exports) module.exports=api;
global.NightWavesTrackFindHook=api;
})(typeof window!=='undefined'?window:globalThis);
