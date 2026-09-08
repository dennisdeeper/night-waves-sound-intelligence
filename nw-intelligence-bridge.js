
/**
 * Night Waves Sound Intelligence — Intelligence Bridge v0.1
 * Sidecar-only module. It does not connect to Web Audio, recorder, Live Input,
 * Scenes, DSP graphs, Track Intelligence analysis, or UI styling.
 *
 * Purpose:
 * 1) normalize Track Intelligence observations into a shared Sound DNA object
 * 2) translate recommendations into searchable sound intent
 * 3) rank sample/slice candidates by producer relevance
 * 4) expose confidence and reasons rather than false certainty
 */

(function (global) {
  "use strict";

  const VERSION = "0.1.0";
  const clamp01 = v => Math.max(0, Math.min(1, Number.isFinite(+v) ? +v : 0));
  const clamp100 = v => Math.max(0, Math.min(100, Number.isFinite(+v) ? +v : 0));

  const DEFAULT_DNA = Object.freeze({
    energy: 0.5,
    brightness: 0.5,
    movement: 0.5,
    transient: 0.5,
    width: 0.5,
    tonality: 0.5,
    texture: 0.5,
    darkness: 0.5,
    density: 0.5,
    warmth: 0.5,
    root: null,
    bpm: null,
    role: "unknown",
    durationBars: null,
    confidence: 0.5,
    source: "unknown"
  });

  function normalizeDNA(input = {}) {
    const dna = {...DEFAULT_DNA, ...input};
    [
      "energy","brightness","movement","transient","width",
      "tonality","texture","darkness","density","warmth","confidence"
    ].forEach(k => dna[k] = clamp01(dna[k]));
    dna.bpm = Number.isFinite(+dna.bpm) && +dna.bpm > 0 ? +dna.bpm : null;
    dna.durationBars = Number.isFinite(+dna.durationBars) && +dna.durationBars > 0 ? +dna.durationBars : null;
    dna.root = typeof dna.root === "string" && dna.root.trim() ? dna.root.trim() : null;
    dna.role = typeof dna.role === "string" && dna.role.trim() ? dna.role.trim().toLowerCase() : "unknown";
    dna.source = typeof dna.source === "string" && dna.source.trim() ? dna.source.trim() : "unknown";
    return dna;
  }

  const ROLE_HINTS = {
    transition: { movement: 0.78, transient: 0.62, texture: 0.58, role: "transition" },
    impact:     { energy: 0.90, transient: 0.92, density: 0.72, role: "impact" },
    percussion: { transient: 0.88, movement: 0.72, tonality: 0.22, role: "percussion" },
    bass:       { energy: 0.72, darkness: 0.78, brightness: 0.22, tonality: 0.72, role: "bass" },
    vocal:      { tonality: 0.78, texture: 0.48, width: 0.55, role: "vocal" },
    atmosphere: { texture: 0.88, transient: 0.18, width: 0.82, movement: 0.46, role: "atmosphere" },
    fx:         { texture: 0.80, movement: 0.72, role: "fx" },
    melodic:    { tonality: 0.88, transient: 0.42, role: "melodic" },
    texture:    { texture: 0.92, transient: 0.28, role: "texture" }
  };

  function inferRole(text = "") {
    const t = String(text).toLowerCase();
    if (/transition|riser|lift|build|sweep/.test(t)) return "transition";
    if (/impact|hit|slam|drop/.test(t)) return "impact";
    if (/kick|snare|hat|perc|drum|rhythm/.test(t)) return "percussion";
    if (/bass|sub|low end/.test(t)) return "bass";
    if (/vocal|voice|vox/.test(t)) return "vocal";
    if (/atmos|ambient|space|bed|wash/.test(t)) return "atmosphere";
    if (/melod|lead|chord|harmon|tonal/.test(t)) return "melodic";
    if (/texture|grain|noise/.test(t)) return "texture";
    if (/fx|effect/.test(t)) return "fx";
    return "unknown";
  }

  function recommendationToIntent(rec = {}) {
    const text = [rec.title, rec.message, rec.reason, rec.type].filter(Boolean).join(" ");
    const role = rec.role || inferRole(text);
    const hint = ROLE_HINTS[role] || {};

    const intent = normalizeDNA({
      ...hint,
      role,
      source: "track-intelligence-recommendation",
      confidence: clamp01(rec.confidence ?? 0.62),
      root: rec.root ?? null,
      bpm: rec.bpm ?? null,
      durationBars: rec.durationBars ?? null
    });

    const t = text.toLowerCase();
    if (/more energy|lift|bigger|stronger|drive/.test(t)) intent.energy = Math.max(intent.energy, 0.78);
    if (/less energy|calm|reduce|lighter/.test(t)) intent.energy = Math.min(intent.energy, 0.34);
    if (/bright|air|sparkle|open/.test(t)) intent.brightness = Math.max(intent.brightness, 0.72);
    if (/dark|warm|dull|soft top/.test(t)) intent.brightness = Math.min(intent.brightness, 0.34);
    if (/move|movement|motion|rhythm|pulse/.test(t)) intent.movement = Math.max(intent.movement, 0.76);
    if (/wide|wider|stereo|space/.test(t)) intent.width = Math.max(intent.width, 0.75);
    if (/center|mono|focused|narrow/.test(t)) intent.width = Math.min(intent.width, 0.34);
    if (/transient|punch|attack|hit/.test(t)) intent.transient = Math.max(intent.transient, 0.80);
    if (/smooth|wash|sustain|pad/.test(t)) intent.transient = Math.min(intent.transient, 0.30);
    if (/tonal|pitch|key|harmon|melod/.test(t)) intent.tonality = Math.max(intent.tonality, 0.78);
    if (/textur|noise|grain|abstract/.test(t)) intent.texture = Math.max(intent.texture, 0.78);

    return intent;
  }

  const NOTE_MAP = {
    "C":0,"C#":1,"DB":1,"D":2,"D#":3,"EB":3,"E":4,"F":5,
    "F#":6,"GB":6,"G":7,"G#":8,"AB":8,"A":9,"A#":10,"BB":10,"B":11
  };

  function noteClass(root) {
    if (!root) return null;
    const m = String(root).trim().toUpperCase().match(/^([A-G])([#B]?)/);
    return m ? NOTE_MAP[m[1] + (m[2] || "")] ?? null : null;
  }

  function tonalCompatibility(a, b) {
    const x = noteClass(a), y = noteClass(b);
    if (x == null || y == null) return {score: 0.5, known: false};
    const d = Math.min((x-y+12)%12, (y-x+12)%12);
    if (d === 0) return {score: 1.0, known: true};
    if (d === 5 || d === 7) return {score: 0.86, known: true};
    if (d === 3 || d === 4 || d === 8 || d === 9) return {score: 0.72, known: true};
    if (d === 2 || d === 10) return {score: 0.56, known: true};
    return {score: 0.36, known: true};
  }

  function similarity(a, b) {
    return 1 - Math.abs(clamp01(a) - clamp01(b));
  }

  function scoreCandidate(intentInput, candidateInput, opts = {}) {
    const intent = normalizeDNA(intentInput);
    const c = normalizeDNA(candidateInput);

    const weights = {
      energy: 1.2, brightness: 0.9, movement: 1.15, transient: 1.1,
      width: 0.65, tonality: 0.8, texture: 0.75, darkness: 0.45,
      density: 0.55, warmth: 0.4
    };

    let weighted = 0, total = 0;
    const reasons = [];

    for (const [k,w] of Object.entries(weights)) {
      const s = similarity(intent[k], c[k]);
      weighted += s*w; total += w;
      if (w >= 0.8 && s >= 0.84) reasons.push(`${k} match`);
    }

    if (intent.role !== "unknown" && c.role !== "unknown") {
      const roleScore = intent.role === c.role ? 1 : 0.35;
      weighted += roleScore * 1.3; total += 1.3;
      if (roleScore === 1) reasons.unshift("role match");
    }

    if (intent.bpm && c.bpm) {
      const ratio = Math.min(intent.bpm,c.bpm)/Math.max(intent.bpm,c.bpm);
      const bpmScore = ratio > 0.97 ? 1 : ratio > 0.90 ? 0.82 : ratio > 0.80 ? 0.62 : 0.38;
      weighted += bpmScore * 0.7; total += 0.7;
      if (bpmScore >= 0.82) reasons.push("tempo fit");
    }

    const tonal = tonalCompatibility(intent.root, c.root);
    if (intent.tonality >= 0.65 && tonal.known) {
      weighted += tonal.score * 0.85; total += 0.85;
      if (tonal.score >= 0.72) reasons.push("tonal fit");
    }

    const raw = total ? weighted / total : 0;
    const confidenceBlend = 0.65 + 0.35 * Math.min(intent.confidence, c.confidence);
    const score = clamp100(raw * 100 * confidenceBlend);

    return {
      score: Math.round(score * 10) / 10,
      confidence: Math.round(Math.min(intent.confidence, c.confidence) * 100),
      reasons: [...new Set(reasons)].slice(0, 4),
      tonalKnown: tonal.known
    };
  }

  function rankCandidates(intent, candidates = [], opts = {}) {
    return candidates
      .map((candidate, index) => ({
        index,
        candidate,
        ...scoreCandidate(intent, candidate, opts)
      }))
      .sort((a,b) => b.score - a.score);
  }

  function buildFindSoundRequest(recommendation) {
    const intent = recommendationToIntent(recommendation);
    return {
      schema: "nw.find-sound/0.1",
      createdAt: new Date().toISOString(),
      intent,
      query: {
        role: intent.role,
        energy: intent.energy,
        brightness: intent.brightness,
        movement: intent.movement,
        transient: intent.transient,
        width: intent.width,
        tonality: intent.tonality,
        texture: intent.texture,
        root: intent.root,
        bpm: intent.bpm,
        durationBars: intent.durationBars
      },
      safety: {
        destructive: false,
        touchesAudioGraph: false,
        changesDSP: false,
        autoCommitsAudio: false
      }
    };
  }

  class AnalysisJob {
    constructor(id) {
      this.id = id;
      this.cancelled = false;
      this.progress = 0;
    }
    cancel() { this.cancelled = true; }
    setProgress(v) { this.progress = clamp100(v); }
    assertActive() {
      if (this.cancelled) {
        const e = new Error("Analysis cancelled");
        e.name = "AbortError";
        throw e;
      }
    }
  }

  const api = {
    VERSION,
    DEFAULT_DNA,
    normalizeDNA,
    inferRole,
    recommendationToIntent,
    tonalCompatibility,
    scoreCandidate,
    rankCandidates,
    buildFindSoundRequest,
    AnalysisJob
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.NightWavesIntelligenceBridge = api;

})(typeof window !== "undefined" ? window : globalThis);
