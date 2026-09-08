
/**
 * Night Waves Find Sound UI v0.4
 * Isolated UI controller. Does not touch Live Input, recorder, Scenes or DSP.
 */
(function(global){
'use strict';

function $(id){ return document.getElementById(id); }

class FindSoundUI {
  constructor(opts={}){
    this.audioContext = null;
    this.buffer = null;
    this.candidates = [];
    this.results = [];
    this.abortController = null;
    this.activeSource = null;
    this.recommendation = opts.recommendation || {
      message: 'Transition needs more energy, brighter movement and a transient lift',
      confidence: 0.78,
      bpm: 124,
      root: 'F#'
    };
  }

  setStatus(text){ const el=$('nwStatus'); if(el) el.textContent=text; }
  setProgress(v){
    const bar=$('nwProgressBar');
    const label=$('nwProgressLabel');
    const clamped=Math.max(0,Math.min(100,Number(v)||0));
    if(bar) bar.style.width=clamped+'%';
    if(label) label.textContent=Math.round(clamped)+'%';
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
    if(!global.NightWavesFindSoundAdapter) throw new Error('Find Sound adapter unavailable');
    this.abortController=new AbortController();
    $('nwAnalyseBtn').disabled=true;
    $('nwCancelBtn').disabled=false;
    this.setStatus('Analysing slices…');
    this.setProgress(10);
    try{
      this.candidates=await global.NightWavesFindSoundAdapter.analyseBuffer(this.buffer,{
        sliceSeconds:Number($('nwSliceSeconds').value)||2,
        bpm:this.recommendation.bpm||null,
        signal:this.abortController.signal,
        onProgress:v=>this.setProgress(10+(v*0.65))
      });
      this.setStatus(`Analysed ${this.candidates.length} candidate slices`);
      this.renderCandidates(this.candidates);
      this.setProgress(78);
      $('nwFindBtn').disabled=this.candidates.length===0;
    }catch(err){
      if(err && err.name==='AbortError'){
        this.setStatus('Analysis cancelled');
      } else {
        this.setStatus('Analysis failed: '+(err?.message||err));
        throw err;
      }
    }finally{
      $('nwAnalyseBtn').disabled=false;
      $('nwCancelBtn').disabled=true;
    }
  }

  cancel(){
    if(this.abortController) this.abortController.abort();
  }

  find(){
    if(!this.candidates.length) return;
    const out=global.NightWavesFindSoundAdapter.findMatches(this.recommendation,this.candidates);
    this.results=out.results;
    this.renderResults(this.results);
    this.setProgress(100);
    this.setStatus(`Find Sound ranked ${this.results.length} slices`);
  }

  async preview(candidate){
    if(!candidate || !this.buffer) return;
    this.stopPreview();
    const ctx=await this.ensureAudio();
    const src=ctx.createBufferSource();
    src.buffer=this.buffer;
    src.connect(ctx.destination); // isolated audition path only
    const start=Math.max(0,candidate.startSeconds||0);
    const duration=Math.max(0.01,(candidate.endSeconds||start+1)-start);
    src.start(0,start,duration);
    this.activeSource=src;
    src.onended=()=>{ if(this.activeSource===src) this.activeSource=null; };
    global.NightWavesFindSoundAdapter.requestPreview(candidate);
    this.setStatus(`Previewing ${start.toFixed(2)}–${(start+duration).toFixed(2)}s`);
  }

  stopPreview(){
    if(this.activeSource){
      try{ this.activeSource.stop(); }catch{}
      try{ this.activeSource.disconnect(); }catch{}
      this.activeSource=null;
    }
  }

  candidateRow(c,ranked=false){
    const score=ranked && c.score!=null ? `<span class="score">${Math.round(c.score)}%</span>` : '';
    const reason=ranked && c.reasons?.length ? `<div class="reasons">${c.reasons.slice(0,3).join(' • ')}</div>` : '';
    return `<div class="candidate">
      <div>
        <strong>${ranked ? '#'+(c.rank||'')+' ' : ''}${(c.startSeconds||0).toFixed(2)}s → ${(c.endSeconds||0).toFixed(2)}s</strong>
        ${reason}
      </div>
      <div class="candidate-actions">
        ${score}
        <button class="previewBtn" data-start="${c.startSeconds}" data-end="${c.endSeconds}">Preview</button>
      </div>
    </div>`;
  }

  wirePreviewButtons(container, list){
    container.querySelectorAll('.previewBtn').forEach((btn,i)=>{
      btn.addEventListener('click',()=>this.preview(list[i]));
    });
  }

  renderCandidates(list){
    const el=$('nwCandidates');
    el.innerHTML=list.length ? list.slice(0,12).map(c=>this.candidateRow(c,false)).join('') : '<div class="empty">No slices yet.</div>';
    this.wirePreviewButtons(el,list.slice(0,12));
  }

  renderResults(list){
    const el=$('nwResults');
    const normalized=list.map((r,i)=>({...r,rank:i+1}));
    el.innerHTML=normalized.length ? normalized.slice(0,12).map(c=>this.candidateRow(c,true)).join('') : '<div class="empty">No ranked results yet.</div>';
    this.wirePreviewButtons(el,normalized.slice(0,12));
  }

  bind(){
    $('nwFile').addEventListener('change',e=>this.loadFile(e.target.files?.[0]).catch(err=>this.setStatus(err.message)));
    $('nwAnalyseBtn').addEventListener('click',()=>this.analyse().catch(()=>{}));
    $('nwCancelBtn').addEventListener('click',()=>this.cancel());
    $('nwFindBtn').addEventListener('click',()=>this.find());
    $('nwStopBtn').addEventListener('click',()=>{this.stopPreview();this.setStatus('Preview stopped');});
  }
}

global.NightWavesFindSoundUI=FindSoundUI;
})(window);
