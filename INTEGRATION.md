
# Night Waves — Intelligence Integration Plan v0.1

This package is intentionally sidecar-only. It does not alter the proven audio engine.

## Stage 1 — Shared Sound DNA
`nw-intelligence-bridge.js` defines a stable descriptor object used by both Track Intelligence and Sampling:
energy, brightness, movement, transient, width, tonality, texture, darkness, density, warmth, root, bpm, role, durationBars and confidence.

## Stage 2 — Track Intelligence → Find Sound
When Track Intelligence emits a producer recommendation, pass it to:
`NightWavesIntelligenceBridge.buildFindSoundRequest(recommendation)`

This turns human-facing advice into a machine-readable intent without changing the current Track Intelligence analysis code.

## Stage 3 — Sampling candidate ranking
Sampling slices/sounds can expose their own Sound DNA. Pass the Find Sound intent and candidate DNA objects to:
`NightWavesIntelligenceBridge.rankCandidates(intent, candidates)`

The result is ordered by producer relevance and returns concise reasons such as role match, movement match, tempo fit and tonal fit.

## Stage 4 — Confidence and safety
Every DNA object contains a confidence value. Approximate root/BPM data never becomes hard certainty.
The request records that it is non-destructive and does not touch the audio graph or DSP.

## Stage 5 — Analysis lifecycle
`AnalysisJob` supplies a minimal cancellation/progress abstraction for future long-running Track Intelligence analysis.
It can be used before moving heavy analysis into a Web Worker.

## Safe integration points
- Add the bridge script after the existing application script is proven stable, or bundle it separately.
- Add one FIND SOUND button beside recommendations.
- The button must only construct an intent and switch/open the Sampling workspace.
- Do not auto-change DSP, world, scene, input routing or recorder state.
- Sampling preview remains audition-only until the user explicitly commits or exports.
- Confidence must be visible for approximate key/root/BPM analysis.

## Regression gate before any live merge
1. Live Input monitor-off feedback test.
2. Live Input start/stop and permission-error test.
3. Recorder record/stop/export test.
4. Scenes collapse/expand and scene recall test.
5. Existing DSP world selection, Go Deeper and Surprise Me test.
6. Track Intelligence baseline analysis test.
7. FIND SOUND must work with no audio loaded and fail gracefully.
8. Candidate ranking with missing root/BPM must not throw.
9. Long-analysis cancellation must leave UI responsive.
10. Warm Studio Light identity must remain visually unchanged.

## v0.2 — Automatic Audio DNA
`nw-audio-dna.js` adds offline PCM analysis for loaded audio and slices. It derives energy, brightness, movement, transient character, stereo width, approximate tonality/root, texture, darkness, density, warmth, duration and confidence. It never connects to microphone input or the existing Web Audio graph.

### Sampling adapter pattern
For a loaded `AudioBuffer`, pass `getChannelData(0)` and, when present, `getChannelData(1)` to `NightWavesAudioDNA.analyseSlices(...)`. Use the returned `dna` objects as candidates for `NightWavesIntelligenceBridge.rankCandidates(...)`.

### Known limitation
Root detection is deliberately approximate and confidence-gated. It is suitable for ranking assistance, not authoritative key detection. Commercial-grade key/chord analysis should be a later MIR component.
