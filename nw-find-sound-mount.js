/**
 * Night Waves Isolated Find Sound Mount v0.7
 * UI mount only. Consumes host recommendations through a narrow contract.
 * Never connects to host audio nodes or mutates host controls.
 */
(function(global){
'use strict';

const state={mounted:false,root:null,recommendation:null,candidates:[],results:[]};

function safeText(v,max=280){ return String(v??'').replace(/[<>]/g,'').slice(0,max); }
function normalizeHostRecommendation(detail={}){
  if(!global.NightWavesTrackFindHook) throw new Error('NightWavesTrackFindHook required');
  return global.NightWavesTrackFindHook.normalizeRecommendation({
    message:safeText(detail.message||detail.summary||'Track needs another sound'),
    confidence:detail.confidence,
    bpm:detail.bpm,
    root:safeText(detail.root||'',8)||null,
    durationBars:detail.durationBars,
    role:safeText(detail.role||'transition',40)
  });
}
function render(){
  if(!state.root) return;
  const rec=state.recommendation;
  state.root.innerHTML=`
    <section class="nw-mount-card" aria-label="Night Waves Find Sound">
      <div class="nw-mount-kicker">CONNECTED INTELLIGENCE</div>
      <div class="nw-mount-title">Find Sound</div>
      <div class="nw-mount-copy">${rec?safeText(rec.message):'Waiting for a Track Intelligence recommendation.'}</div>
      <div class="nw-mount-meta">${rec?`${Math.round(rec.confidence*100)}% confidence${rec.bpm?' • '+rec.bpm+' BPM':''}${rec.root?' • '+safeText(rec.root,8):''}`:''}</div>
      <button type="button" data-nw-action="find" ${rec?'':'disabled'}>Find Sound</button>
      <div class="nw-mount-results" aria-live="polite"></div>
    </section>`;
  state.root.querySelector('[data-nw-action="find"]')?.addEventListener('click',()=>{
    global.dispatchEvent(new CustomEvent('nw:find-sound-requested',{detail:{recommendation:{...state.recommendation}}}));
  });
}
function acceptRecommendation(detail){
  state.recommendation=normalizeHostRecommendation(detail);
  render();
  return {...state.recommendation};
}
function showResults(results=[]){
  state.results=Array.isArray(results)?results.slice(0,8):[];
  const el=state.root?.querySelector('.nw-mount-results');
  if(!el) return;
  el.textContent=state.results.length?`${state.results.length} ranked matches ready for audition.`:'No matches yet.';
}
function mount(target,opts={}){
  if(state.mounted) return state.root;
  const root=typeof target==='string'?document.querySelector(target):target;
  if(!root) throw new Error('Mount target not found');
  state.root=root;
  state.mounted=true;
  root.classList.add('nw-find-sound-mount');
  if(opts.recommendation) state.recommendation=normalizeHostRecommendation(opts.recommendation);
  render();

  global.addEventListener('nw:track-recommendation',e=>acceptRecommendation(e.detail||{}));
  global.addEventListener('nw:find-sound-results',e=>showResults(e.detail?.results||e.detail||[]));
  return root;
}
const api={VERSION:'0.7.0',mount,acceptRecommendation,showResults,normalizeHostRecommendation,state};
if(typeof module!=='undefined'&&module.exports) module.exports=api;
global.NightWavesFindSoundMount=api;
})(typeof window!=='undefined'?window:globalThis);
