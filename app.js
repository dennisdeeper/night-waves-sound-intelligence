(() => {
  const $ = (id) => document.getElementById(id);

  let ctx = null;
  let stream = null;
  let source = null;
  let analyser = null;
  let inputGain = null;
  let dryGain = null;
  let wetGain = null;
  let masterGain = null;
  let limiter = null;
  let currentChain = null;
  let currentWorld = "studio";
  let monitorOn = false;
  let bypassOn = false;
  let abMode = "A";
  let raf = null;

  const params = {
    dryWet: 0.50,
    space: 0.45,
    echo: 0.30,
    movement: 0.35,
    colour: 0.50,
    character: 0.35
  };

  const worldNames = {
    studio: "Studio Zero",
    dub: "Dub Matrix",
    tape: "Tape Bloom",
    liquid: "Liquid Atmosphere"
  };

  const worldHints = {
    studio: "Studio Zero · clean reference",
    dub: "Dub Matrix · tempo-like echo, filter and feedback",
    tape: "Tape Bloom · saturation, softening and drift",
    liquid: "Liquid Atmosphere · diffusion, width and evolving space"
  };

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function ramp(param, value, time = 0.04){
    if (!ctx) return;
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + time);
  }
  function equalPower(x){
    x = clamp(x,0,1);
    return {
      dry: Math.cos(x * 0.5 * Math.PI),
      wet: Math.sin(x * 0.5 * Math.PI)
    };
  }
  function updateMix(){
    if (!ctx || !dryGain || !wetGain || !masterGain) return;
    let mix = params.dryWet;
    if (bypassOn || abMode === "A") mix = 0;
    const g = equalPower(mix);
    ramp(dryGain.gain, monitorOn ? g.dry : 0);
    ramp(wetGain.gain, monitorOn ? g.wet : 0);
    ramp(masterGain.gain, monitorOn ? 0.82 : 0);
  }
  function makeDistortion(amount = 20){
    const n = 4096;
    const curve = new Float32Array(n);
    const k = Math.max(0.1, amount);
    for(let i=0;i<n;i++){
      const x = i * 2 / n - 1;
      curve[i] = ((3 + k) * x * 20 * Math.PI / 180) /
        (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
  function makeImpulse(seconds = 2.0, decay = 2.0){
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const impulse = ctx.createBuffer(2, len, rate);
    for (let ch=0; ch<2; ch++){
      const data = impulse.getChannelData(ch);
      for(let i=0;i<len;i++){
        const env = Math.pow(1 - i / len, decay);
        data[i] = (Math.random()*2-1) * env;
      }
    }
    return impulse;
  }

  function destroyChain(){
    if (!currentChain) return;
    try { inputGain.disconnect(currentChain.input); } catch(e){}
    try { currentChain.output.disconnect(wetGain); } catch(e){}
    (currentChain.nodes || []).forEach(n => {
      try { n.disconnect(); } catch(e){}
      if (n.stop) { try { n.stop(); } catch(e){} }
    });
    currentChain = null;
  }

  function chainStudio(){
    const g = ctx.createGain();
    g.gain.value = 1;
    return { input:g, output:g, nodes:[g], update(){} };
  }

  function chainDub(){
    const input = ctx.createGain();
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";

    const delay = ctx.createDelay(1.2);
    const feedback = ctx.createGain();
    const feedbackTone = ctx.createBiquadFilter();
    feedbackTone.type = "lowpass";
    const saturator = ctx.createWaveShaper();
    saturator.oversample = "2x";

    const direct = ctx.createGain();
    const wet = ctx.createGain();
    const out = ctx.createGain();

    input.connect(direct).connect(out);
    input.connect(tone).connect(delay).connect(wet).connect(out);
    delay.connect(feedback).connect(feedbackTone).connect(saturator).connect(delay);

    return {
      input, output:out,
      nodes:[input,tone,delay,feedback,feedbackTone,saturator,direct,wet,out],
      update(){
        const now = ctx.currentTime;
        tone.frequency.setTargetAtTime(650 + params.colour*6500, now, .03);
        feedbackTone.frequency.setTargetAtTime(900 + params.colour*4200, now, .03);
        delay.delayTime.setTargetAtTime(0.12 + params.echo*0.55, now, .03);
        feedback.gain.setTargetAtTime(0.08 + params.echo*0.68, now, .03);
        wet.gain.setTargetAtTime(0.35 + params.space*0.65, now, .03);
        direct.gain.setTargetAtTime(0.55, now, .03);
        saturator.curve = makeDistortion(8 + params.character*55);
      }
    };
  }

  function chainTape(){
    const input = ctx.createGain();
    const drive = ctx.createGain();
    const shaper = ctx.createWaveShaper();
    shaper.oversample = "4x";
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    const drift = ctx.createDelay(.08);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    const out = ctx.createGain();

    input.connect(drive).connect(shaper).connect(lowpass).connect(highpass).connect(drift).connect(comp).connect(out);
    lfo.connect(lfoGain).connect(drift.delayTime);
    lfo.start();

    return {
      input, output:out,
      nodes:[input,drive,shaper,lowpass,highpass,drift,lfo,lfoGain,comp,out],
      update(){
        const now = ctx.currentTime;
        drive.gain.setTargetAtTime(1 + params.character*2.8, now, .03);
        shaper.curve = makeDistortion(5 + params.character*75);
        lowpass.frequency.setTargetAtTime(4500 + params.colour*12000, now, .03);
        highpass.frequency.setTargetAtTime(18 + (1-params.space)*45, now, .03);
        drift.delayTime.setTargetAtTime(0.008 + params.movement*0.008, now, .03);
        lfo.frequency.setTargetAtTime(0.08 + params.movement*1.2, now, .03);
        lfoGain.gain.setTargetAtTime(0.0002 + params.movement*0.006, now, .03);
        comp.threshold.setTargetAtTime(-18 - params.character*10, now, .03);
        comp.ratio.setTargetAtTime(2 + params.character*3, now, .03);
      }
    };
  }

  function chainLiquid(){
    const input = ctx.createGain();
    const pre = ctx.createDelay(.4);
    const colour = ctx.createBiquadFilter();
    colour.type = "lowpass";
    const chorus = ctx.createDelay(.08);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const convolver = ctx.createConvolver();
    const dryish = ctx.createGain();
    const verb = ctx.createGain();
    const out = ctx.createGain();

    input.connect(dryish).connect(out);
    input.connect(pre).connect(colour).connect(chorus).connect(convolver).connect(verb).connect(out);
    lfo.connect(lfoGain).connect(chorus.delayTime);
    lfo.start();

    return {
      input, output:out,
      nodes:[input,pre,colour,chorus,lfo,lfoGain,convolver,dryish,verb,out],
      update(){
        const now = ctx.currentTime;
        pre.delayTime.setTargetAtTime(0.01 + params.echo*0.14, now, .03);
        colour.frequency.setTargetAtTime(3200 + params.colour*10500, now, .03);
        chorus.delayTime.setTargetAtTime(0.012 + params.movement*0.008, now, .03);
        lfo.frequency.setTargetAtTime(0.05 + params.movement*0.7, now, .03);
        lfoGain.gain.setTargetAtTime(0.0003 + params.movement*0.005, now, .03);
        verb.gain.setTargetAtTime(0.25 + params.space*0.95, now, .03);
        dryish.gain.setTargetAtTime(0.5 - params.space*0.18, now, .03);
        convolver.buffer = makeImpulse(1.2 + params.space*2.8, 1.4 + (1-params.space)*2.0);
      }
    };
  }

  function makeWorld(name){
    if (name === "dub") return chainDub();
    if (name === "tape") return chainTape();
    if (name === "liquid") return chainLiquid();
    return chainStudio();
  }

  function applyParams(){
    if (currentChain?.update) currentChain.update();
    updateMix();
  }

  async function rebuildWorld(name){
    currentWorld = name;
    $("worldState").textContent = worldNames[name];
    $("worldHint").textContent = worldHints[name];

    document.querySelectorAll(".world").forEach(b => {
      b.classList.toggle("active", b.dataset.world === name);
    });

    if (!ctx || !inputGain) return;

    const targetWet = wetGain.gain.value;
    ramp(wetGain.gain, 0, .035);
    await new Promise(r => setTimeout(r, 45));
    destroyChain();

    currentChain = makeWorld(name);
    inputGain.connect(currentChain.input);
    currentChain.output.connect(wetGain);
    currentChain.update();

    updateMix();
  }

  async function enumerateInputs(){
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter(d => d.kind === "audioinput");
    const select = $("inputSelect");
    const current = select.value;
    select.innerHTML = "";
    inputs.forEach((d, i) => {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || `Audio input ${i+1}`;
      select.appendChild(opt);
    });
    if (current && [...select.options].some(o => o.value === current)) select.value = current;
  }

  async function connectStream(deviceId){
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (source) { try{source.disconnect()}catch(e){} }

    const constraints = {
      audio: deviceId
        ? {deviceId:{exact:deviceId}, echoCancellation:false, noiseSuppression:false, autoGainControl:false}
        : {echoCancellation:false, noiseSuppression:false, autoGainControl:false}
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    source.connect(inputGain);

    $("inputState").textContent = "Connected";
    await enumerateInputs();
  }

  async function startAudio(){
    try{
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Audio input is not supported in this browser.");

      ctx = new (window.AudioContext || window.webkitAudioContext)({latencyHint:"interactive"});
      await ctx.resume();

      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      inputGain = ctx.createGain();
      dryGain = ctx.createGain();
      wetGain = ctx.createGain();
      masterGain = ctx.createGain();
      limiter = ctx.createDynamicsCompressor();

      limiter.threshold.value = -3;
      limiter.knee.value = 4;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.12;

      inputGain.connect(dryGain);
      dryGain.connect(masterGain);
      wetGain.connect(masterGain);
      masterGain.connect(limiter);
      limiter.connect(ctx.destination);

      await connectStream(null);
      await rebuildWorld(currentWorld);

      $("startBtn").textContent = "AUDIO READY";
      $("startBtn").disabled = true;
      $("monitorBtn").disabled = false;
      $("bypassBtn").disabled = false;
      $("aBtn").disabled = false;
      $("bBtn").disabled = false;
      $("inputSelect").disabled = false;
      $("refreshInputsBtn").disabled = false;
      $("audioState").textContent = ctx.state;
      $("statusPill").textContent = "AUDIO READY";
      $("statusPill").classList.add("live");

      updateMix();
      meterLoop();

      ctx.onstatechange = () => $("audioState").textContent = ctx.state;
    }catch(err){
      console.error(err);
      alert("Could not start audio: " + err.message + "\n\nCheck microphone permission and use HTTPS or localhost.");
      $("statusPill").textContent = "AUDIO ERROR";
    }
  }

  function meterLoop(){
    if (!analyser) return;
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (const x of data) sum += x*x;
    const rms = Math.sqrt(sum / data.length) || 0.000001;
    const db = 20 * Math.log10(rms);
    const norm = clamp((db + 60) / 60, 0, 1);
    $("meterFill").style.width = `${Math.round(norm*100)}%`;
    $("levelText").textContent = `${Math.round(db)} dB`;
    raf = requestAnimationFrame(meterLoop);
  }

  $("startBtn").addEventListener("click", startAudio);

  $("monitorBtn").addEventListener("click", () => {
    monitorOn = !monitorOn;
    $("monitorBtn").textContent = monitorOn ? "MONITOR ON" : "MONITOR OFF";
    $("monitorState").textContent = monitorOn ? "On" : "Off";
    updateMix();
  });

  $("bypassBtn").addEventListener("click", () => {
    bypassOn = !bypassOn;
    $("bypassBtn").textContent = bypassOn ? "BYPASS ON" : "BYPASS OFF";
    updateMix();
  });

  $("aBtn").addEventListener("click", () => {
    abMode = "A";
    $("aBtn").classList.add("active");
    $("bBtn").classList.remove("active");
    updateMix();
  });

  $("bBtn").addEventListener("click", () => {
    abMode = "B";
    $("bBtn").classList.add("active");
    $("aBtn").classList.remove("active");
    updateMix();
  });

  document.querySelectorAll(".world").forEach(btn => {
    btn.addEventListener("click", () => rebuildWorld(btn.dataset.world));
  });

  const macroIds = ["dryWet","space","echo","movement","colour","character"];
  macroIds.forEach(id => {
    const el = $(id);
    const out = $(id+"Out");
    el.addEventListener("input", () => {
      params[id] = Number(el.value)/100;
      out.textContent = `${el.value}%`;
      applyParams();
    });
  });

  $("refreshInputsBtn").addEventListener("click", enumerateInputs);
  $("inputSelect").addEventListener("change", async () => {
    if (!ctx) return;
    try{
      $("inputState").textContent = "Connecting…";
      await connectStream($("inputSelect").value);
    }catch(err){
      $("inputState").textContent = "Connection failed";
      alert("Could not switch input: " + err.message);
    }
  });

  $("midiBtn").addEventListener("click", async () => {
    if (!navigator.requestMIDIAccess){
      $("midiState").textContent = "Unavailable in this browser";
      return;
    }
    try{
      const midi = await navigator.requestMIDIAccess();
      const count = midi.inputs.size;
      $("midiState").textContent = count ? `${count} input${count===1?"":"s"} connected` : "Available · no input";
    }catch(err){
      $("midiState").textContent = "Permission denied / unavailable";
    }
  });
})();
