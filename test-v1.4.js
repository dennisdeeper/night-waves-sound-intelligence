
const fs=require('fs'), assert=require('assert');
const h=fs.readFileSync('./connected-studio-v1.4.html','utf8');
const css=fs.readFileSync('./nw-brand-identity.css','utf8');
const js=fs.readFileSync('./nw-brand-identity.js','utf8');

assert(h.includes('data-nw-corporate-identity="warm-studio-light-v1"'));
assert(h.includes('./night-waves-corporate-logo-warm.png'));
assert(h.includes('./nw-brand-identity.css'));
assert(h.includes('./nw-brand-identity.js'));
assert(js.includes("document.querySelectorAll('.appview')"));
assert(js.includes('.studio-frame-wrap'));
assert(!js.includes('getUserMedia'));
assert(!js.includes('MediaRecorder'));
assert(!js.includes('applyDSP('));
assert(!js.includes('connectInput('));
assert(h.includes('src="./index.html"'));

const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.strictEqual(ids.length,new Set(ids).size,'duplicate IDs');
console.log('PASS: v1.4 corporate identity static regression');
