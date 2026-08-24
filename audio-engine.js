/* audio-engine.js — SFX (WebAudio synth) + music engine procedurale, estratto verbatim da
   index.html (righe 267-467) nello split del monolite (PLAN_Cantieri.md, piano
   "split monolite + pack equip + strutture", filone A). Nessuna logica cambiata: stesso
   comportamento, solo spostato in file separato caricato con <script src> PRIMA dello script
   principale (ordine invariato). Zero dipendenze esterne al file: `music.target()` legge
   `state`/`invaders`/`ship`/`currentPlanet`, tutte globali definite più avanti nello script
   principale — funziona perché queste funzioni vengono CHIAMATE solo a runtime (dal loop e da
   audio.unlock()), non eseguite al parse, esattamente come già oggi nel file unico. */
"use strict";

/* ---------- Audio (synth WebAudio) ---------- */
const audio = {
  ctx:null, on:true,
  unlock(){ if(!this.ctx){ try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
            if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); },
  beep(f0,f1,dur,type='square',vol=0.05){
    if(!this.on||!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(f0,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20,f1), t+dur);
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t+dur+0.02);
  },
  noise(dur,vol=0.08){
    if(!this.on||!this.ctx) return;
    const t=this.ctx.currentTime, n=this.ctx.sampleRate*dur;
    const buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const s=this.ctx.createBufferSource(); s.buffer=buf;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(g); g.connect(this.ctx.destination); s.start(t);
  },
  laser(){ this.beep(880,180,0.12,'square',0.04); },
  boom(){ this.noise(0.35,0.12); this.beep(160,40,0.3,'sawtooth',0.06); },
  hit(){ this.beep(220,90,0.15,'sawtooth',0.06); },
  pickup(){ this.beep(660,1320,0.09,'square',0.05); setTimeout(()=>this.beep(990,1980,0.12,'square',0.05),80); },
  land(){ this.beep(520,130,0.5,'triangle',0.06); },
  takeoff(){ this.beep(130,720,0.6,'triangle',0.06); },
  step(){ this.beep(140,120,0.04,'square',0.015); },
  bump(){ this.beep(90,70,0.08,'square',0.04); }
};
document.getElementById('mute').addEventListener('click',e=>{
  audio.unlock(); audio.on=!audio.on;
  e.target.textContent = audio.on?'♪':'✕'; e.stopPropagation();
});

/* =========================================================
   MUSIC ENGINE — sintesi procedurale situazionale (Web Audio)
   Zero file audio. Si aggancia da solo a audio.unlock().
   ========================================================= */
const music = {
  ctx:null, master:null, droneG:null, songG:null,
  drone:null, wind:null, lfo:null,
  cur:'', bgmOn:false, timer:null, step:0, trackId:'',
  TRACKS:{
    SPACE:{ name:'NEBULA AURA', bpm:78, drums:true, dvol:0.5,
      chords:[[220.00,261.63,329.63,392.00],[174.61,220.00,261.63,329.63],
              [261.63,329.63,392.00,493.88],[196.00,246.94,293.66,329.63]],
      melody:[60,64,67,0,69,67,64,0,62,60,59,60,62,64,67,0] },
    COMBAT:{ name:'HYPER DRIVE', bpm:102, drums:true, dvol:1,
      chords:[[146.83,174.61,220.00,293.66],[164.81,196.00,246.94,329.63],
              [146.83,174.61,220.00,293.66],[110.00,138.59,164.81,220.00]],
      melody:[62,62,65,62,67,65,62,69,70,69,65,67,62,0,62,0] },
    HUB:{ name:'STATION LULLABY', bpm:70, drums:false, dvol:0,
      chords:[[261.63,329.63,392.00,523.25],[174.61,220.00,261.63,349.23],
              [293.66,349.23,440.00,587.33],[196.00,246.94,293.66,392.00]],
      melody:[72,0,76,0,79,76,72,0,69,0,72,0,74,0,67,0] },
    PLANET:{ name:'FROZEN FIELDS', bpm:84, drums:false, dvol:0,
      chords:[[220.00,261.63,329.63,440.00],[174.61,220.00,261.63,349.23],
              [196.00,246.94,293.66,392.00],[164.81,196.00,246.94,329.63]],
      melody:[69,0,72,0,74,72,69,0,67,0,64,0,67,69,0,0] }
  },
  init(ctx){
    if(this.ctx || !ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0.85;
    this.master.connect(ctx.destination);
    this.droneG = ctx.createGain(); this.droneG.gain.value = 0;
    this.droneG.connect(this.master);
    this.songG = ctx.createGain(); this.songG.gain.value = 0;
    this.songG.connect(this.master);
    this.drone = ctx.createOscillator(); this.drone.type='sawtooth';
    this.drone.frequency.value = 55;
    const df = ctx.createBiquadFilter(); df.type='lowpass'; df.frequency.value=75;
    this.drone.connect(df); df.connect(this.droneG); this.drone.start();
    const n = ctx.sampleRate*2, buf = ctx.createBuffer(1,n,ctx.sampleRate), d = buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
    this.wind = ctx.createBufferSource(); this.wind.buffer=buf; this.wind.loop=true;
    const wf = ctx.createBiquadFilter(); wf.type='bandpass'; wf.frequency.value=140; wf.Q.value=4;
    const wg = ctx.createGain(); wg.gain.value=0.35;
    this.lfo = ctx.createOscillator(); this.lfo.frequency.value=0.08;
    const lg = ctx.createGain(); lg.gain.value=60;
    this.lfo.connect(lg); lg.connect(wf.frequency); this.lfo.start();
    this.wind.connect(wf); wf.connect(wg); wg.connect(this.droneG); this.wind.start();
    setInterval(()=>this.sync(), 400);
    this.sync();
  },
  target(){
    if(!audio.on) return 'OFF';
    if(state==='space' || state==='takeoff'){
      let danger=false;
      for(const inv of invaders){
        const dx=inv.x-ship.x, dy=inv.y-ship.y;
        if(dx*dx+dy*dy < 560*560){ danger=true; break; }
      }
      if(!danger && ebullets.length>0) danger=true;
      return danger ? 'COMBAT' : 'SPACE';
    }
    if(state==='planet' || state==='landing')
      return (currentPlanet && currentPlanet.type==='hub') ? 'HUB' : 'PLANET';
    if(state==='win') return 'HUB';
    return 'VOID';
  },
  sync(){
    const tgt = this.target();
    if(tgt===this.cur) return;
    this.cur = tgt;
    const t = this.ctx.currentTime;
    if(tgt==='OFF'){
      this.stopBGM();
      this.droneG.gain.cancelScheduledValues(t);
      this.droneG.gain.linearRampToValueAtTime(0, t+0.3);
      this.songG.gain.cancelScheduledValues(t);
      this.songG.gain.linearRampToValueAtTime(0, t+0.3);
      return;
    }
    if(tgt==='VOID'){
      this.stopBGM();
      this.songG.gain.cancelScheduledValues(t);
      this.songG.gain.linearRampToValueAtTime(0, t+1.2);
      this.droneG.gain.cancelScheduledValues(t);
      this.droneG.gain.linearRampToValueAtTime(0.12, t+1.2);
      return;
    }
    this.songG.gain.cancelScheduledValues(t);
    this.songG.gain.linearRampToValueAtTime(0, t+0.5);
    this.droneG.gain.cancelScheduledValues(t);
    this.droneG.gain.linearRampToValueAtTime(0.04, t+0.5);
    const id = tgt;
    setTimeout(()=>{
      if(this.cur!==id) return;
      this.stopBGM(); this.trackId=id; this.step=0; this.startBGM();
      const t2=this.ctx.currentTime;
      this.songG.gain.cancelScheduledValues(t2);
      this.songG.gain.linearRampToValueAtTime(1, t2+0.6);
    }, 520);
  },
  startBGM(){
    const tr = this.TRACKS[this.trackId]; if(!tr) return;
    this.bgmOn = true;
    const dur = 60/tr.bpm/2;
    const loop = ()=>{
      if(!this.bgmOn) return;
      this.playStep(tr);
      this.timer = setTimeout(loop, dur*1000);
    };
    loop();
  },
  stopBGM(){
    this.bgmOn=false;
    if(this.timer){ clearTimeout(this.timer); this.timer=null; }
  },
  playStep(tr){
    const t = this.ctx.currentTime;
    const sub = this.step % 16;
    const chord = tr.chords[Math.floor(this.step/16) % tr.chords.length];
    if(tr.drums){
      if(sub===0||sub===8||sub===14) this.kick(t, tr.dvol);
      if(sub===4||sub===12) this.snare(t, tr.dvol);
    }
    const m = tr.melody[sub];
    if(m>0) this.note(Math.pow(2,(m-69)/12)*440, t, 0.55, 0.05);
    if(sub===0) chord.forEach(f=>this.note(f, t, 1.8, 0.028));
    this.step++;
  },
  note(freq, start, dur, vol){
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type='triangle';
    o.frequency.setValueAtTime(freq+(Math.random()*2-1)*2.2, start);
    g.gain.setValueAtTime(0,start);
    g.gain.linearRampToValueAtTime(vol, start+0.04);
    g.gain.exponentialRampToValueAtTime(0.001, start+dur);
    o.connect(g); g.connect(this.songG);
    o.start(start); o.stop(start+dur+0.05);
  },
  kick(t, v){
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type='sine';
    o.frequency.setValueAtTime(120,t);
    o.frequency.exponentialRampToValueAtTime(40,t+0.12);
    g.gain.setValueAtTime(0.12*v,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.15);
    o.connect(g); g.connect(this.songG); o.start(t); o.stop(t+0.16);
  },
  snare(t, v){
    const n=Math.floor(this.ctx.sampleRate*0.08);
    const buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const s=this.ctx.createBufferSource(); s.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=1100;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(0.07*v,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.08);
    s.connect(f); f.connect(g); g.connect(this.songG); s.start(t);
  }
};
(function(){
  const _u = audio.unlock.bind(audio);
  audio.unlock = function(){ _u(); if(audio.ctx) music.init(audio.ctx); };
})();
