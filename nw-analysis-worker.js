/**
 * Night Waves Analysis Worker v0.5
 * Offline slice-DNA analysis only. No Web Audio graph access.
 */
'use strict';
importScripts('./nw-audio-dna.js');

let cancelled = false;

self.onmessage = (event) => {
  const msg = event.data || {};
  if (msg.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (msg.type !== 'analyse') return;

  cancelled = false;
  try {
    const left = new Float32Array(msg.left);
    const right = msg.right ? new Float32Array(msg.right) : null;
    const sampleRate = Number(msg.sampleRate) || 44100;
    const sliceSeconds = Math.max(.25, Number(msg.sliceSeconds) || 2);
    const hopSeconds = Math.max(.25, Number(msg.hopSeconds) || sliceSeconds);
    const bpm = Number.isFinite(+msg.bpm) && +msg.bpm > 0 ? +msg.bpm : null;
    const role = typeof msg.role === 'string' ? msg.role.slice(0, 80) : 'unknown';

    const size = Math.max(1, Math.round(sliceSeconds * sampleRate));
    const step = Math.max(1, Math.round(hopSeconds * sampleRate));
    const total = Math.max(1, Math.ceil(left.length / step));
    const candidates = [];

    for (let start = 0, index = 0; start < left.length; start += step, index++) {
      if (cancelled) {
        self.postMessage({type:'cancelled'});
        return;
      }

      const end = Math.min(left.length, start + size);
      if ((end - start) / sampleRate < .25) break;

      const dna = self.NightWavesAudioDNA.analysePCM({
        left: left.slice(start, end),
        right: right ? right.slice(start, end) : null,
        sampleRate,
        bpm,
        role,
        source: 'slice'
      });

      candidates.push({
        id: `slice-${candidates.length + 1}`,
        startSeconds: start / sampleRate,
        endSeconds: end / sampleRate,
        ...dna,
        metadata: {auditionOnly: true}
      });

      self.postMessage({
        type: 'progress',
        value: Math.min(99, Math.round(((index + 1) / total) * 100))
      });
    }

    self.postMessage({type:'done', candidates});
  } catch (error) {
    self.postMessage({type:'error', message:String(error && error.message || error)});
  }
};
