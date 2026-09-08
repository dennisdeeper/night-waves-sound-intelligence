const assert=require('assert'),fs=require('fs');
const runner=fs.readFileSync('./nw-analysis-runner.js','utf8');
const worker=fs.readFileSync('./nw-analysis-worker.js','utf8');
const ui=fs.readFileSync('./nw-find-sound-ui.js','utf8');
const html=fs.readFileSync('./demo-v0.5.html','utf8');

assert(runner.includes('Worker'));
assert(runner.includes('setTimeout(resolve,0)'));
assert(runner.includes('AbortError'));
assert(/type\s*:\s*['"]progress['"]/.test(worker));
assert(/type\s*:\s*['"]cancelled['"]/.test(worker));
assert(ui.includes("setTheme"));
assert(ui.includes("'pulse'"));
assert(ui.includes("'warm'"));
assert(html.includes('Cyan / Red Pulse'));
assert(html.includes('Warm Studio'));
assert(!runner.includes('getUserMedia'));
assert(!runner.includes('MediaRecorder'));
assert(!worker.includes('AudioContext'));

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.deepStrictEqual(ids.filter((id,i)=>ids.indexOf(id)!==i),[]);
console.log('PASS: v0.5 responsiveness + theme regression tests');
