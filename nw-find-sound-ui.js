/**
 * Night Waves Find Sound UI v0.5
 * Adds worker-backed analysis and dual visual themes.
 */
(function(global){
'use strict';
function $(id){ return document.getElementById(id); }

class FindSoundUI {
  constructor(opts={}){
    this.audioContext=null;
    this.buffer=null;
    this.candidates=[];
    this.results=[];
    this.abortController=null;
    this.activeSource=null;
    this.recommendation=opts.recommendation||{
      message:'Transition needs more energy, brighter movement and a transient lift',
      confidence:.78,bpm:124,root:'F#'
    };
  }
  setStatus(text){ const el=$('nwStatus'); if(el) el.textContent=text; }
  setProgress(v){
    const n=Math.max(0,Math.min(100,Number(v)||0));
    if($('nwProgressBar')) $('nwProgressBar').style.width=n+'%';
    if($('nwProgressLabel')) $('nwProgressLabel').textContent=Math.round(n)+'%';
  }
  setTheme(theme){
    const safe=theme==='pulse'?'pulse':'warm';
    document.documentElement.dataset.theme=safe;
    try{ localStorage.setItem('nwTheme',safe); }catch{}
    if($('nwTheme')) $('nwTheme').value=safe;
  }
  restoreTheme(){
    let t='warm';
    try{ t=localStorage.getItem('nwTheme')||'warm'; }catch{}
    this.setTheme(t);
  }

  renderConfidence(value){
    const el=$('nwConfidence');
    if(!el) return;
    const band=global.NightWavesTrackFindHook?.confidenceBand?.(value)||'low';
    const pct=Math.round((Number(value)||0)*100);
    el.textContent=`${pct}% • ${band}`;
    el.dataset.band=band;
  }
  renderIntent(intent={}){
    const el=$('nwIntent');
    if(!el) return;
    const labels=[];
    const metrics=['energy','brightness','movement','transient','texture','warmth','darkness','density'];
    for(const key of metrics){
      if(Number.isFinite(+intent[key]) && +intent[key] > .05) labels.push(`${key} ${Math.round(+intent[key]*100)}%`);
    }
    if(intent.role) labels.push(`role ${intent.role}`);
    if(intent.bpm) labels.push(`${intent.bpm} BPM`);
    if(intent.root) labels.push(`root ${intent.root}`);
    el.innerHTML=labels.length?labels.map(x=>`<span class="intent-chip">${x}</span>`).join(''):'<span class="empty">No intent descriptors yet.</span>';
  }

  async ensureAudio(){
    if(!this.audioContext) this.audioContext=new (global.AudioContext||global.webkitAudioContext)();
    if(this.audioContext.state==='suspended') await this.audioContext.resume();
    return this.audioContext;
  }
  async loadFile(file){
    if(!file) return;
    this.stopPreview();
    this.setStatus('Decoding audio…');
    this.setProgress(2);
    const ctx=await this.ensureAudio();
    const arr=await file.arrayBuffer();
    this.buffer=await ctx.decodeAudioData(arr.slice(0));
    this.setProgress(8);
    this.setStatus(`Loaded ${file.name} • ${this.buffer.duration.toFixed(1)}s`);
    $('nwAnalyseBtn').disabled=false;
  }
  async analyse(){
    if(!this.buffer) throw new Error('Load audio first');
    if(!global.NightWavesAnalysisRunner) throw new Error('Analysis runner unavailable');
    this.abortController=new AbortController();
    $('nwAnalyseBtn').disabled=true;
    $('nwCancelBtn').disabled=false;
    this.setStatus('Analysing slices…');
    this.setProgress(10);
    try{
      this.candidates=await global.NightWavesAnalysisRunner.analyse(this.buffer,{
        sliceSeconds:Number($('nwSliceSeconds').value)||2,
        bpm:this.recommendation.bpm||null,
        role:'transition',
        signal:this.abortController.signal,
        onProgress:v=>this.setProgress(10+(v*.65)),
        onFallback:()=>this.setStatus('Worker unavailable — using safe yielding analysis…')
      });
      this.setStatus(`Analysed ${this.candidates.length} candidate slices`);
      this.renderCandidates(this.candidates);
      this.setProgress(78);
      $('nwFindBtn').disabled=this.candidates.length===0;
    }catch(err){
      if(err?.name==='AbortError') this.setStatus('Analysis cancelled');
      else { this.setStatus('Analysis failed: '+(err?.message||err)); throw err; }
    }finally{
      $('nwAnalyseBtn').disabled=false;
      $('nwCancelBtn').disabled=true;
    }
  }
  cancel(){ this.abortController?.abort(); }
  find(){
    if(!this.candidates.length) return;
    const out=global.NightWavesFindSoundAdapter.findMatches(this.recommendation,this.candidates);
    this.results=out.results||[];
    this.renderResults(this.results);
    this.setProgress(100);
    this.renderIntent(out.request?.intent || {});
    this.renderConfidence(this.recommendation.confidence);
    this.setStatus(`Find Sound ranked ${this.results.length} slices`);
  }
  async preview(candidate){
    if(!candidate||!this.buffer) return;
    this.stopPreview();
    const ctx=await this.ensureAudio();
    const src=ctx.createBufferSource();
    src.buffer=this.buffer;
    src.connect(ctx.destination);
    const start=Math.max(0,candidate.startSeconds||0);
    const duration=Math.max(.01,(candidate.endSeconds||start+1)-start);
    src.start(0,start,duration);
    this.activeSource=src;
    src.onended=()=>{ if(this.activeSource===src) this.activeSource=null; };
    global.NightWavesFindSoundAdapter.requestPreview(candidate);
    this.setStatus(`Previewing ${start.toFixed(2)}–${(start+duration).toFixed(2)}s`);
  }
  stopPreview(){
    if(this.activeSource){
      try{this.activeSource.stop()}catch{}
      try{this.activeSource.disconnect()}catch{}
      this.activeSource=null;
    }
  }
  unwrapCandidate(item){ return item?.candidate || item; }
  candidateRow(item,ranked=false,rank=0){
    const c=this.unwrapCandidate(item)||{};
    const score=ranked&&item?.score!=null?`<span class="score">${Math.round(item.score)}%</span>`:'';
    const reasons=ranked&&item?.reasons?.length?`<div class="reasons">${item.reasons.slice(0,3).join(' • ')}</div>`:'';
    return `<div class="candidate"><div><strong>${ranked?'#'+rank+' ':''}${(c.startSeconds||0).toFixed(2)}s → ${(c.endSeconds||0).toFixed(2)}s</strong>${reasons}</div><div class="candidate-actions">${score}<button class="previewBtn">Preview</button></div></div>`;
  }
  wirePreviewButtons(container,list){
    container.querySelectorAll('.previewBtn').forEach((btn,i)=>btn.addEventListener('click',()=>this.preview(this.unwrapCandidate(list[i]))));
  }
  renderCandidates(list){
    const show=list.slice(0,12), el=$('nwCandidates');
    el.innerHTML=show.length?show.map(c=>this.candidateRow(c)).join(''):'<div class="empty">No slices yet.</div>';
    this.wirePreviewButtons(el,show);
  }
  renderResults(list){
    const show=list.slice(0,12), el=$('nwResults');
    el.innerHTML=show.length?show.map((c,i)=>this.candidateRow(c,true,i+1)).join(''):'<div class="empty">No ranked results yet.</div>';
    this.wirePreviewButtons(el,show);
  }
  bind(){
    this.restoreTheme();
    this.renderConfidence(this.recommendation.confidence);
    $('nwTheme')?.addEventListener('change',e=>this.setTheme(e.target.value));
    $('nwFile').addEventListener('change',e=>this.loadFile(e.target.files?.[0]).catch(err=>this.setStatus(err.message)));
    $('nwAnalyseBtn').addEventListener('click',()=>this.analyse().catch(()=>{}));
    $('nwCancelBtn').addEventListener('click',()=>this.cancel());
    $('nwFindBtn').addEventListener('click',()=>this.find());
    $('nwStopBtn').addEventListener('click',()=>{this.stopPreview();this.setStatus('Preview stopped')});
  }
}
global.NightWavesFindSoundUI=FindSoundUI;
})(window);
