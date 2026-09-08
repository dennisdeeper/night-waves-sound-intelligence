
"use strict";
const assert = require("assert");
const NW = require("./nw-intelligence-bridge.js");

function near(v, target, eps=0.001){ return Math.abs(v-target) <= eps; }

const intent = NW.recommendationToIntent({
  message: "Transition needs more energy, brighter movement and a transient lift",
  confidence: 0.78,
  bpm: 124,
  root: "F#",
  durationBars: 2
});

assert.equal(intent.role, "transition");
assert(intent.energy >= 0.78);
assert(intent.brightness >= 0.72);
assert(intent.movement >= 0.76);
assert(intent.transient >= 0.80);
assert.equal(intent.bpm, 124);
assert.equal(intent.root, "F#");

const candidates = [
  {name:"Soft dark pad", role:"atmosphere", energy:.30, brightness:.28, movement:.22, transient:.12, width:.82, tonality:.8, texture:.7, root:"C", bpm:124, confidence:.9},
  {name:"Bright transition sweep", role:"transition", energy:.82, brightness:.80, movement:.84, transient:.74, width:.75, tonality:.52, texture:.66, root:"F#", bpm:124, confidence:.86},
  {name:"Perc hit", role:"percussion", energy:.92, brightness:.62, movement:.55, transient:.98, width:.36, tonality:.25, texture:.34, root:null, bpm:124, confidence:.95}
];

const ranked = NW.rankCandidates(intent, candidates);
assert.equal(ranked.length, 3);
assert.equal(ranked[0].candidate.name, "Bright transition sweep");
assert(ranked[0].score > ranked[1].score);

const req = NW.buildFindSoundRequest({
  message:"Need a wider atmosphere with less attack",
  confidence:.7
});
assert.equal(req.schema, "nw.find-sound/0.1");
assert.equal(req.safety.destructive, false);
assert.equal(req.safety.touchesAudioGraph, false);
assert.equal(req.safety.changesDSP, false);

const job = new NW.AnalysisJob("x");
job.setProgress(150);
assert.equal(job.progress, 100);
job.cancel();
assert.throws(() => job.assertActive(), e => e && e.name === "AbortError");

console.log("PASS: Night Waves Intelligence Bridge unit tests");
console.log(JSON.stringify({intent, ranked: ranked.map(x => ({name:x.candidate.name, score:x.score, confidence:x.confidence, reasons:x.reasons}))}, null, 2));
