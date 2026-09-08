
const assert=require('assert');
const fs=require('fs');
const ui=fs.readFileSync('./nw-find-sound-ui.js','utf8');
const html=fs.readFileSync('./demo-v0.4.html','utf8');

assert(ui.includes('requestPreview'));
assert(ui.includes('AbortController'));
assert(ui.includes('decodeAudioData'));
assert(!ui.includes('getUserMedia'));
assert(!ui.includes('MediaRecorder'));
assert(!ui.includes('connectInput('));
assert(!ui.includes('applyDSP('));

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const dup=ids.filter((id,i)=>ids.indexOf(id)!==i);
assert.deepStrictEqual(dup,[]);

['nwFile','nwAnalyseBtn','nwCancelBtn','nwFindBtn','nwStopBtn','nwCandidates','nwResults'].forEach(id=>{
  assert(ids.includes(id), 'missing '+id);
});
console.log('PASS: Find Sound UI v0.4 static regression tests');
