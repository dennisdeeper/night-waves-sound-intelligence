'use strict';
const assert=require('assert'); const A=require('./nw-audio-dna.js');
const sr=44100, sec=4, n=sr*sec;
const sine=new Float32Array(n); for(let i=0;i<n;i++)sine[i]=.35*Math.sin(2*Math.PI*220*i/sr);
const tonal=A.analysePCM({left:sine,sampleRate:sr,bpm:120,role:'bass'}); assert(tonal.tonality>.35); assert(tonal.root); assert(tonal.energy>0);
const noise=new Float32Array(n); let s=1; for(let i=0;i<n;i++){s=(s*1664525+1013904223)>>>0; noise[i]=(((s/4294967296)*2-1)*.25)}
const noisy=A.analysePCM({left:noise,sampleRate:sr}); assert(noisy.brightness>tonal.brightness); assert(noisy.texture>tonal.texture || noisy.tonality<tonal.tonality);
const impulse=new Float32Array(n); for(let k=0;k<4;k++){const p=k*sr; for(let i=0;i<200&&p+i<n;i++)impulse[p+i]=Math.exp(-i/28)}
const hit=A.analysePCM({left:impulse,sampleRate:sr}); assert(hit.transient>tonal.transient);
const rightSame=sine.slice(); const rightInv=Float32Array.from(sine,v=>-v); assert(A.stereoWidth(sine,rightInv)>A.stereoWidth(sine,rightSame));
const slices=A.analyseSlices({left:sine,sampleRate:sr,bpm:120,sliceSeconds:1}); assert.equal(slices.length,4); assert(slices.every(x=>x.dna.durationBars>0));
console.log('PASS audio DNA v0.2'); console.log(JSON.stringify({tonal,noise:noisy,hit,slices:slices.length},null,2));
