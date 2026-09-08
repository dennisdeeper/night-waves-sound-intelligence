/** Night Waves Audio DNA Analyzer v0.2 — offline PCM analysis only. */
(function(global){
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const rms=a=>Math.sqrt(mean(Array.from(a,v=>v*v)));
function frameSignal(samples,size=2048,hop=1024){const out=[];for(let i=0;i<samples.length;i+=hop){const f=samples.slice(i,Math.min(i+size,samples.length));if(f.length>=64)out.push(f)}return out}
function zcr(a){let n=0;for(let i=1;i<a.length;i++)if((a[i-1]<0)!=(a[i]<0))n++;return a.length>1?n/(a.length-1):0}
function envelope(frames){return frames.map(f=>rms(f))}
function movementScore(env){if(env.length<2)return 0;let d=0;for(let i=1;i<env.length;i++)d+=Math.abs(env[i]-env[i-1]);return clamp(d/Math.max(0.001,env.length*0.06))}
function transientScore(frames){if(frames.length<2)return 0;const e=envelope(frames);let maxRise=0,peak=0;for(let i=1;i<e.length;i++)maxRise=Math.max(maxRise,e[i]-e[i-1]);for(const f of frames)for(let i=0;i<f.length;i++)peak=Math.max(peak,Math.abs(f[i]));return clamp(maxRise*9+peak*0.15)}
function autocorrTonality(samples,sr){const n=Math.min(samples.length,8192);if(n<256)return {tonality:0,root:null,confidence:0};const x=samples.slice(0,n);const lo=Math.max(2,Math.floor(sr/1000)),hi=Math.min(n-2,Math.floor(sr/55));let bestLag=0,best=-1;let energy=0;for(let i=0;i<n;i++)energy+=x[i]*x[i];if(energy<1e-7)return {tonality:0,root:null,confidence:0};for(let lag=lo;lag<=hi;lag+=2){let s=0;for(let i=0;i<n-lag;i++)s+=x[i]*x[i+lag];const norm=s/energy;if(norm>best){best=norm;bestLag=lag}}const tonal=clamp((best-.08)/.72);if(!bestLag||tonal<.22)return {tonality:tonal,root:null,confidence:tonal*.5};const hz=sr/bestLag;const midi=69+12*Math.log2(hz/440);const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];return {tonality:tonal,root:names[((Math.round(midi)%12)+12)%12],confidence:clamp(tonal*.85)} }
function stereoWidth(left,right){if(!right||!left||left.length!==right.length||left.length<16)return .5;let lr=0,ll=0,rr=0;for(let i=0;i<left.length;i++){lr+=left[i]*right[i];ll+=left[i]*left[i];rr+=right[i]*right[i]}const corr=lr/Math.sqrt(Math.max(1e-12,ll*rr));return clamp((1-corr)/2)}
function analysePCM({left,right=null,sampleRate=44100,bpm=null,role='unknown',source='pcm'}){
 if(!left||!left.length)throw new Error('PCM left channel is required');
 const frames=frameSignal(left), e=rms(left), avgZ=mean(frames.map(zcr));
 const tonal=autocorrTonality(left,sampleRate); const width=stereoWidth(left,right);
 let peak=0; for(let i=0;i<left.length;i++)peak=Math.max(peak,Math.abs(left[i]));
 const energy=clamp(e*3.2); const brightness=clamp(avgZ*8.0); const transient=transientScore(frames); const movement=movementScore(envelope(frames));
 const darkness=1-brightness; const density=clamp(e*2.2 + (1-transient)*.18); const texture=clamp(avgZ*4 + movement*.35 + (1-tonal.tonality)*.25); const warmth=clamp(darkness*.55 + tonal.tonality*.25 + (1-transient)*.20);
 const duration=left.length/sampleRate; const confidence=clamp(.48 + Math.min(.25,duration/20*.25) + Math.min(.12,e*1.8) + (right?.length===left.length?.05:0));
 return {energy,brightness,movement,transient,width,tonality:tonal.tonality,texture,darkness,density,warmth,root:tonal.root,bpm:Number.isFinite(+bpm)&&+bpm>0?+bpm:null,role,durationBars:(bpm&&duration)?duration/(60/bpm*4):null,confidence,source,technical:{rms:e,peak,zcr:avgZ,durationSeconds:duration,rootConfidence:tonal.confidence}};
}
function analyseSlices({left,right=null,sampleRate=44100,bpm=null,role='unknown',sliceSeconds=2,hopSeconds=null,minSeconds=.25}){
 const hop=hopSeconds||sliceSeconds, size=Math.max(1,Math.round(sliceSeconds*sampleRate)), step=Math.max(1,Math.round(hop*sampleRate)), out=[];
 for(let start=0;start<left.length;start+=step){const end=Math.min(left.length,start+size);if((end-start)/sampleRate<minSeconds)break;const dna=analysePCM({left:left.slice(start,end),right:right?right.slice(start,end):null,sampleRate,bpm,role,source:'slice'});out.push({id:`slice-${out.length+1}`,startSeconds:start/sampleRate,endSeconds:end/sampleRate,dna})}
 return out;
}
const api={analysePCM,analyseSlices,stereoWidth,VERSION:'0.2.0'};if(typeof module!=='undefined'&&module.exports)module.exports=api;global.NightWavesAudioDNA=api;
})(typeof window!=='undefined'?window:globalThis);
