/* world-gen.js — BIOMES/PLANETS + merge WORLD_PACK + texture procedurali pianeta/stazione +
   starfield parallasse, estratto verbatim da index.html nello split del monolite
   (PLAN_Cantieri.md, piano "split monolite + pack equip + strutture", filone A).
   Nessuna logica cambiata. Dipende da rand/TAU/mulberry32/ctx/W/H (core config, inline prima
   di questo file) — stessa posizione originale. genWorldPlanet/genPlanet (che leggono
   BIOMES/PLANETS/WORLD qui definiti) restano più avanti nel file, non spostati qui: dipendono
   anche da funzioni di genHub/pianeta non ancora estratte — vedi PLAN_Cantieri.md. */
"use strict";

const BIOMES = {
  flora:  {sky:'#123b2a', g1:'#2e7d4f', g2:'#37945d', ob:'#194a2e', haz:'#2c72c9', hazName:'acqua',
           planet:['#5dd08a','#2e7d4f','#1b5636'], atmo:'rgba(120,255,180,0.25)'},
  sabbia: {sky:'#4a3b1e', g1:'#d8b365', g2:'#c9a355', ob:'#8a6b32', haz:'#e8d089', hazName:'sabbie mobili',
           planet:['#f0d08a','#c9a355','#8a6b32'], atmo:'rgba(255,214,130,0.22)'},
  cryo:   {sky:'#1c2c44', g1:'#bcd9e8', g2:'#a8cbdd', ob:'#6f93ad', haz:'#7db8e8', hazName:'lago gelato',
           planet:['#e8f4fb','#a8cbdd','#5f86a3'], atmo:'rgba(160,220,255,0.28)'},
  magma:  {sky:'#2a1212', g1:'#4a3a3a', g2:'#3f3131', ob:'#241a1a', haz:'#ff6a2a', hazName:'lava',
           planet:['#7a4a3a','#4a3030','#2a1a1a'], atmo:'rgba(255,120,60,0.28)'},
  stazione:{sky:'#0c1420', g1:'#2a3550', g2:'#243049', ob:'#101722', haz:'#2c72c9', hazName:'vuoto',
           planet:['#8fa5c9','#4a5d80','#2a3550'], atmo:'rgba(140,190,255,0.22)'}
};
const PLANETS = [
  {name:'VERDIA', biome:'flora',  orbit:620,  a:rand()*TAU, spd:0.010, r:64, seed:101},
  {name:'DUNAR',  biome:'sabbia', orbit:980,  a:rand()*TAU, spd:0.007, r:56, seed:202},
  {name:'GELIDA', biome:'cryo',   orbit:1340, a:rand()*TAU, spd:0.005, r:60, seed:303},
  {name:'PYRA',   biome:'magma',  orbit:1720, a:rand()*TAU, spd:0.004, r:70, seed:404},
];
/* World pack: pianeti costruiti a mano (file opzionale, come forge-pack).
   Schema: window.WORLD_PACK = { version:1, biomes:{...}, planets:{ NOME:{biome,orbit,spd,r,seed,grid,...} } }
   Merge non distruttivo: nome esistente = override, nome nuovo = pianeta aggiunto. Senza pack, tutto procedurale. */
const WORLD = (typeof window!=='undefined' && window.WORLD_PACK) || null;
/* Quanti cristalli ha un pianeta se il pack non dice altro. NON è più una regola del gioco:
   ogni corpo porta il suo numero (campo `nCrystals`), questo è solo il valore di serie. */
const CRYSTALS_PER_PLANET = 3;
/* Stazioni e satelliti dal pack: raccolti qui durante il giro sui pianeti e completati
   (texture, elenchi) subito dopo la definizione di HUB, che sta più sotto. */
const PACK_STATIONS = [], PACK_MOONS = [], PACK_WEATHER = [];
if(WORLD){
  /* Biomi del pack (06/08/2026, fase B3): si parte dal bioma indicato da `look` — o da flora —
     e si sovrascrivono solo i campi presenti. `look` decide anche a quali SAGOME assomiglia il
     terreno (drawTile in planet-mode.js), e `weather` gli dà un meteo estremo tutto suo. */
  if(WORLD.biomes) for(const b in WORLD.biomes){
    const w = WORLD.biomes[b];
    const base = (w.look && BIOMES[w.look]) ? BIOMES[w.look] : BIOMES.flora;
    BIOMES[b] = Object.assign({}, base, w);
    if(w.weather) PACK_WEATHER.push([b, w.weather]);   // registrato più sotto, dove vive il meteo
  }
  let wNew=0, wOvr=0;
  if(WORLD.planets) for(const id in WORLD.planets){
    const w = WORLD.planets[id];
    /* Le stazioni stanno nella STESSA lista dei pianeti (richiesta 05/08/2026: "la stazione
       spaziale deve essere gestita come pianeta"): le distingue `type:'hub'`. Non orbitano
       (x,y fissi), non contano per i cristalli, ci si attracca come alla Kepler. */
    if(w.type==='hub'){
      const s = Object.assign({name:id, biome:'stazione', type:'hub', x:0, y:0, r:60, seed:(id.length*997)|0}, w);
      s.r = Math.max(24, +s.r||60); s.done=0; s.world = w;
      PACK_STATIONS.push(s); continue;
    }
    /* Satellite: un corpo come gli altri, ma orbita attorno a `of` invece che attorno al sole.
       Atterrabile o no lo dice `dock` come per tutti (05/08/2026: gli editor costruiscono
       ambienti, non descrivono il gioco di oggi). */
    if(w.type==='moon'){
      const m = Object.assign({name:id, biome:'cryo', type:'moon', of:null, orbit:150, spd:0.3,
        r:16, seed:(id.length*997)|0}, w);
      m.r = Math.max(4, +m.r||16); m.a = rand()*TAU; m.x = 0; m.y = 0; m.done = 0; m.world = w;
      if(!BIOMES[m.biome]){ console.warn('[WORLD-PACK] bioma "'+m.biome+'" sconosciuto per il satellite '+id+' — uso cryo'); m.biome='cryo'; }
      PACK_MOONS.push(m); continue;
    }
    if(w.biome && !BIOMES[w.biome]){ console.warn('[WORLD-PACK] bioma "'+w.biome+'" sconosciuto per '+id+' — uso flora'); w.biome='flora'; }
    let p = PLANETS.find(q=>q.name===id);
    if(p){ wOvr++; }
    else { p={name:id, biome:'flora', orbit:2100, a:rand()*TAU, spd:0.004, r:60, seed:(id.length*997)|0}; PLANETS.push(p); wNew++; }
    for(const k of ['biome','orbit','spd','r','seed']) if(w[k]!=null) p[k]=w[k];
    p.world = w; // genPlanet leggerà grid/spawn/crystals/critters da qui
  }
  console.log('[WORLD-PACK] v'+(WORLD.version||'?')+': '+wNew+' pianeti nuovi, '+wOvr+' override'+
    (PACK_STATIONS.length?', '+PACK_STATIONS.length+' stazioni':'')+
    (PACK_MOONS.length?', '+PACK_MOONS.length+' satelliti':''));
}
for(const p of PLANETS){ p.x=Math.cos(p.a)*p.orbit; p.y=Math.sin(p.a)*p.orbit; p.done=0; p.type='planet'; }
const HUB = {name:'STAZIONE KEPLER', biome:'stazione', type:'hub', x:680, y:-60, r:60, seed:707};
/* La stazione può essere spostata/ridimensionata dal pack (04/08/2026, space_editor):
   `WORLD_PACK.hub = {name,x,y,r,seed}`, solo i campi presenti. Va qui, PRIMA di
   `stationTexture(HUB)` più sotto, che legge r e seed. Senza pack resta com'è sempre stata. */
if(WORLD && WORLD.hub){
  for(const k of ['name','x','y','r','seed']) if(WORLD.hub[k]!=null) HUB[k]=WORLD.hub[k];
  HUB.world = WORLD.hub;   // così dock/nCrystals/img passano dal giro comune sui corpi, più sotto
  console.log('[WORLD-PACK] stazione: '+HUB.name+' a ('+HUB.x+','+HUB.y+') r='+HUB.r);
}
/* Tutte le stazioni in un elenco solo (la Kepler + quelle del pack): la texture si assegna
   qui perché stationTexture è definita più sotto ma dichiarata come function, quindi già
   disponibile. Le stazioni restano fuori da PLANETS: non orbitano attorno al sole. */
const STATIONS = [HUB];
for(const s of PACK_STATIONS){ s.tex = stationTexture(s); STATIONS.push(s); }
const MOONS = PACK_MOONS;
for(const m of MOONS) m.tex = planetTexture(m);

/* ---------- Atterrabilità e cristalli: proprietà del CORPO, non regole del gioco ----------
   (05/08/2026, richiesta dell'utente: "l'editor deve dirmi se sono atterrabili o meno... qui
   stiamo creando ambienti macro"). Prima erano cablati: 4 pianeti, tutti atterrabili, 3
   cristalli l'uno, e ogni corpo nuovo spostava il traguardo della vittoria. Ora ogni corpo
   dichiara `dock` (ci si può scendere) e `nCrystals` (quanti ne ha, 0 = non conta), e il
   totale è la somma. Senza pack i valori di serie riproducono esattamente il gioco di prima.
   Un'immagine propria (`img`) può sostituire la texture procedurale: vale per qualunque corpo. */
const BODIES = [...PLANETS, ...STATIONS, ...MOONS];
for(const b of BODIES){
  const w = b.world || {};
  b.dock = (w.dock != null) ? !!w.dock : true;
  b.dockIf = w.dockIf || null;      // serratura: si scende solo con quel segno della storia
  b.nCrystals = (w.nCrystals != null) ? Math.max(0, w.nCrystals|0)
              : (b.type === 'planet' ? CRYSTALS_PER_PLANET : 0);
  if(b.done == null) b.done = 0;
  if(!b.dock && b.nCrystals){ console.warn('[WORLD-PACK] '+b.name+': ha cristalli ma non è atterrabile — nessuno potrà prenderli'); }
  if(w.img){ const im = new Image(); im.src = w.img; b.im = im; }
}
// satelliti: prima posizione subito, così il primo fotogramma li disegna già al posto giusto
for(const m of MOONS){
  const par = BODIES.find(b => b.name === m.of && b !== m);
  if(!par && m.of) console.warn('[WORLD-PACK] il satellite '+m.name+' orbita attorno a "'+m.of+'" che non esiste — resta sul sole');
  m.x = (par?par.x:0)+Math.cos(m.a)*m.orbit; m.y = (par?par.y:0)+Math.sin(m.a)*m.orbit;
}

/* ---------- Spazio aperto: fenomeni e oggetti (05/08/2026, PLAN_Tool_Scalabili §16 B1) ----------
   `WORLD_PACK.space = { pois:[…], objects:[…] }`. File opzionale come tutto il resto: senza
   pack le due liste restano vuote e lo spazio è identico a prima.

   POI = zona circolare. `kind` è solo l'ASPETTO (nebula/storm/star/zone), `effect` è solo il
   COMPORTAMENTO (slow/damage/block/none): si combinano liberamente, così una nebulosa può
   anche bloccare e una zona interdetta può limitarsi a rallentare. Gli effetti valgono per la
   nave del giocatore, NON per pirati/asteroidi/proiettili — scelta v1 per non rendere
   illeggibile il combattimento.

   OBJECT = cosa che sta nello spazio: una forma procedurale dal bioma oppure un'immagine libera
   in data-URI (PNG/SVG — una nave di passaggio, un relitto). Non fa collisione, ma **può essere
   atterrabile** come un corpo (`dock`, `nCrystals`) — richiesta 05/08/2026: "anche sui relitti
   ci si può atterrare". Sceso, il terreno è quello del suo `biome` (di serie `stazione`: interno
   metallico), generato come per un pianeta.
   Si muove in quattro modi: `fermo` (x,y) · `deriva` (vx,vy, rientra dal lato opposto del
   sistema) · `orbita` (attorno al corpo `of`, a distanza `orbit`, `spd` in radianti al secondo)
   · `rotta` (tappe in `points`, `speed` in unità al secondo, `loop` = ciclo|avanti-indietro).
   Su un relitto in movimento si scende lo stesso: si atterra dove si trova in quel momento. */
const POI_KINDS = {
  nebula:{effect:'slow',   power:0.55, color:'#7a3fe6', color2:'#2fd6c0'},
  storm: {effect:'damage', power:1,    color:'#9678ff', color2:'#d2beff'},
  star:  {effect:'damage', power:1,    color:'#ffcf5c', color2:'#ff9040'},
  zone:  {effect:'block',  power:1,    color:'#ff5c74', color2:'#ffb0bb'}
};
const POI_EFFECTS = ['slow','damage','block','none'];
const SPACE_POIS = [], SPACE_OBJS = [];
if(WORLD && WORLD.space){
  for(const raw of (WORLD.space.pois||[])){
    let k = raw.kind;
    if(!POI_KINDS[k]){ console.warn('[WORLD-PACK] fenomeno "'+k+'" sconosciuto — uso nebula'); k='nebula'; }
    const z = Object.assign({kind:k, name:'ANOMALIA', x:0, y:0, r:300, seed:0}, POI_KINDS[k], raw);
    z.kind = k; z.r = Math.max(60, +z.r||300);
    z.seed = (+z.seed) || ((String(z.name).length*613 + Math.abs(z.x|0) + 1)|0);
    if(POI_EFFECTS.indexOf(z.effect)<0){ console.warn('[WORLD-PACK] effetto "'+z.effect+'" sconosciuto su '+z.name+' — nessun effetto'); z.effect='none'; }
    const rr = mulberry32(z.seed);
    z.blobs = [];
    for(let i=0;i<3;i++) z.blobs.push({dx:(rr()-0.5)*z.r*0.8, dy:(rr()-0.5)*z.r*0.8,
      r:z.r*(0.45+rr()*0.4), ph:rr()*TAU, sp:0.4+rr()*0.5});
    z.hitT=0; z.inside=false; z.flash=0; z.nextFlash=1; z.bolt=null; z.warnT=-9;
    SPACE_POIS.push(z);
  }
  for(const raw of (WORLD.space.objects||[])){
    const o = Object.assign({name:'OGGETTO', motion:'fermo', x:0, y:0, vx:0, vy:0,
      of:null, orbit:140, spd:0.3, speed:60, loop:'ciclo', r:18, rot:0, spin:0,
      biome:'cryo', seed:0, label:false}, raw);
    o.r = Math.max(4, +o.r||18);
    o.a = (typeof raw.a==='number') ? raw.a : rand()*TAU;
    o.type = 'wreck'; o.done = 0;
    o.world = raw;                 // se ha una `grid`, l'interno è disegnato col world editor
    o.dock = !!o.dock;
    o.dockIf = o.dockIf || null;
    o.nCrystals = o.dock ? Math.max(0, (o.nCrystals|0)) : 0;
    if(o.dock && !BIOMES[o.biome]) o.biome = 'stazione';   // interno metallico: il caso tipico
    if(o.motion==='rotta'){
      o.points = (Array.isArray(o.points)?o.points:[]).filter(p=>Array.isArray(p)&&p.length>=2)
        .map(p=>[+p[0]||0, +p[1]||0]);
      if(o.points.length<2){ console.warn('[WORLD-PACK] la rotta di '+o.name+' ha meno di 2 tappe — resta fermo'); o.motion='fermo'; }
      else { o.seg=0; o.segT=0; o.verso=1; o.x=o.points[0][0]; o.y=o.points[0][1]; }
    }
    o.wx = o.x; o.wy = o.y;
    if(o.img){ const im = new Image(); im.src = o.img; o.im = im; }
    if(!o.im || o.dock){
      // la texture serve comunque a chi ci atterra (transizione di sbarco) e a chi non ha immagine
      if(!BIOMES[o.biome]){ console.warn('[WORLD-PACK] bioma "'+o.biome+'" sconosciuto per l\'oggetto '+o.name+' — uso cryo'); o.biome='cryo'; }
      o.tex = planetTexture({r:Math.max(8,o.r), biome:o.biome, seed:(+o.seed)||((String(o.name).length*331+7)|0)});
    }
    SPACE_OBJS.push(o);
  }
  if(SPACE_POIS.length || SPACE_OBJS.length)
    console.log('[WORLD-PACK] spazio: '+SPACE_POIS.length+' fenomeni, '+SPACE_OBJS.length+' oggetti'+
      (SPACE_OBJS.filter(o=>o.dock).length ? ' ('+SPACE_OBJS.filter(o=>o.dock).length+' atterrabili)' : ''));
}
/* Tutti i posti dove si può stare: corpi + oggetti atterrabili (i relitti). Da qui in poi
   "luogo" è l'unità del gioco — cristalli, attracco e conteggi guardano questa lista. */
const LUOGHI = [...BODIES, ...SPACE_OBJS];
const DOCKABLE = LUOGHI.filter(b => b.dock);

/* ---------- Serrature: il mondo dichiara, la storia apre (05/08/2026) ----------
   Richiesta dell'utente: «zone interdette e non — queste si sbloccheranno con l'editor della
   storia, quindi forse è meglio che sia lui a gestire se bloccano e fino a quando».
   Scelta di design: il motore della storia NON cresce di vocabolario. Sa già mettere e
   togliere "segni" (`setFlag`/`clearFlag`, SPEC_story_pack §4); è il MONDO che dichiara a
   quale segno è legata una serratura:
     - fenomeno:  `activeIf:'segno'` (l'effetto vale solo col segno) · `endIf:'segno'` (smette quando arriva)
     - luogo:     `dockIf:'segno'`   (ci si scende solo dopo quel segno)
     - cancello a terra: marcatore 'P' nella griglia + `gates:[{flag,name}]` (planet-gen.js)
   Senza story-engine non esiste nessun segno: le serrature con `activeIf`/`dockIf` restano
   chiuse e quelle con `endIf` restano attive — comportamento prevedibile, nessun errore. */
function segno(nome){
  if(!nome) return false;
  try { return !!(window.STORY && STORY.state && STORY.state.flags && STORY.state.flags[nome]); }
  catch(e){ return false; }
}
function zonaAttiva(z){
  if(z.activeIf && !segno(z.activeIf)) return false;
  if(z.endIf && segno(z.endIf)) return false;
  return true;
}
function dockOk(b){ return !!b.dock && (!b.dockIf || segno(b.dockIf)); }
// Somma di quello che i luoghi dichiarano: con i valori di serie fa 12 come sempre.
const TOTAL_CRYSTALS = LUOGHI.reduce((s,b)=>s+(b.nCrystals||0), 0);

/* ---------- Meteo estremo (28/07/2026, richiesta utente: "condizioni estreme che non
   permettono lo sbarco o fanno danni e costringono ad aspettare") ----------
   Derivato dal bioma, non da una lista per-pianeta: qualunque pianeta (procedurale o
   world-pack, presente oggi o aggiunto in futuro) prende automaticamente il meteo del suo
   bioma, zero dati nuovi da scrivere per pianeta. VERDIA (flora) e la stazione (stazione)
   restano SENZA meteo estremo — coerente con la battuta già in gioco di KAELA ("VERDIA è
   dolce. PYRA... porta un kit medico"), non un'aggiunta a caso.
   Ciclo deterministico sul tempo di gioco `t` (stessa tecnica già usata per i geyser di PYRA,
   `(t+fase)%periodo`): 'clear' la maggior parte del tempo, 'building' (preavviso) per
   WEATHER_WARN secondi prima dell'estremo, poi 'extreme' per WEATHER_EXTREME secondi.
   `fase` deriva dal seed del pianeta così i pianeti non sono mai tutti in tempesta insieme. */
const BIOME_WEATHER = { magma:'firestorm', cryo:'blizzard', sabbia:'sandstorm' };
const WEATHER_KINDS = {
  firestorm: { name:'PIOGGIA DI CENERE', color:'#ff7847' },
  blizzard:  { name:'BLIZZARD ESTREMA',  color:'#8ef7ff' },
  sandstorm: { name:'TEMPESTA DI SABBIA',color:'#e0b070' }
};
/* Meteo dei biomi del pack (fase B3): stesso ciclo dei tre di serie, nome e colore scelti da
   chi scrive il bioma. Va qui e non nel merge più sopra perché queste due tabelle sono `const`
   e prima di questa riga non esistono ancora. */
for(const [b, w] of PACK_WEATHER){
  const k = 'pack_'+b;
  WEATHER_KINDS[k] = { name: w.name || ('TEMPESTA SU '+String(b).toUpperCase()), color: w.color || '#8dfd6a' };
  BIOME_WEATHER[b] = k;
}
const WEATHER_PERIOD=90, WEATHER_EXTREME=14, WEATHER_WARN=10;
function getWeather(p,t){
  const kind = p && BIOME_WEATHER[p.biome];
  if(!kind) return {state:'clear'};
  const phase = p.seed%97;
  const ph = (t+phase)%WEATHER_PERIOD;
  const extStart = WEATHER_PERIOD-WEATHER_EXTREME;
  const k = WEATHER_KINDS[kind];
  if(ph>=extStart) return {state:'extreme', kind, name:k.name, color:k.color};
  if(ph>=extStart-WEATHER_WARN) return {state:'building', kind, name:k.name, color:k.color};
  return {state:'clear'};
}

/* Texture pianeta (dischi con macchie, generati una volta) */
function planetTexture(p){
  const d = p.r*2, c=document.createElement('canvas'); c.width=d; c.height=d;
  const g=c.getContext('2d'), col=BIOMES[p.biome].planet, rr=mulberry32(p.seed);
  const grad=g.createRadialGradient(d*0.35,d*0.32,p.r*0.2, d/2,d/2,p.r);
  grad.addColorStop(0,col[0]); grad.addColorStop(0.65,col[1]); grad.addColorStop(1,col[2]);
  g.fillStyle=grad; g.beginPath(); g.arc(d/2,d/2,p.r,0,TAU); g.fill();
  g.globalCompositeOperation='source-atop';
  for(let i=0;i<26;i++){
    g.fillStyle = rr()<0.5?col[2]:col[0];
    g.globalAlpha = 0.18+rr()*0.2;
    const bx=rr()*d, by=rr()*d, br=3+rr()*p.r*0.35;
    g.beginPath(); g.ellipse(bx,by,br,br*(0.4+rr()*0.5),rr()*TAU,0,TAU); g.fill();
  }
  g.globalAlpha=0.35; g.fillStyle='#000';
  g.beginPath(); g.arc(d*0.72,d*0.7,p.r*1.05,0,TAU); g.fill();
  g.globalAlpha=1; g.globalCompositeOperation='source-over';
  return c;
}
for(const p of PLANETS) p.tex = planetTexture(p);

/* Texture stazione (anello + raggi + nucleo, illuminazione coerente coi pianeti) */
function stationTexture(p){
  const d=p.r*2, c=document.createElement('canvas'); c.width=d; c.height=d;
  const g=c.getContext('2d'), cx=d/2, cy=d/2, R=p.r, rr=mulberry32(p.seed);
  // gradiente metallico con luce dall'alto-sinistra (come i pianeti)
  const met=g.createRadialGradient(d*0.35,d*0.32,R*0.15, cx,cy,R);
  met.addColorStop(0,'#c3d3ee'); met.addColorStop(0.55,'#8fa5c9'); met.addColorStop(1,'#3a4a6e');
  const dark=g.createRadialGradient(d*0.35,d*0.32,R*0.15, cx,cy,R);
  dark.addColorStop(0,'#6f83a8'); dark.addColorStop(1,'#22304e');
  // anello principale
  const ringR=R*0.72, ringW=R*0.26;
  g.strokeStyle=met; g.lineWidth=ringW;
  g.beginPath(); g.arc(cx,cy,ringR,0,TAU); g.stroke();
  // bordi dell'anello
  g.strokeStyle='#1a2438'; g.lineWidth=2;
  g.beginPath(); g.arc(cx,cy,ringR+ringW/2,0,TAU); g.stroke();
  g.beginPath(); g.arc(cx,cy,ringR-ringW/2,0,TAU); g.stroke();
  // paratie radiali sull'anello
  g.strokeStyle='rgba(20,30,52,0.65)'; g.lineWidth=2;
  for(let i=0;i<12;i++){
    const a=i/12*TAU;
    g.beginPath();
    g.moveTo(cx+Math.cos(a)*(ringR-ringW/2), cy+Math.sin(a)*(ringR-ringW/2));
    g.lineTo(cx+Math.cos(a)*(ringR+ringW/2), cy+Math.sin(a)*(ringR+ringW/2));
    g.stroke();
  }
  // oblò illuminati lungo l'anello
  for(let i=0;i<18;i++){
    const a=(i+0.5)/18*TAU;
    const wx=cx+Math.cos(a)*ringR, wy=cy+Math.sin(a)*ringR;
    g.fillStyle = rr()<0.7 ? '#ffcf5c' : '#7df9ff';
    g.globalAlpha=0.55+rr()*0.45;
    g.fillRect(wx-1.5,wy-1.5,3,3);
  }
  g.globalAlpha=1;
  // 4 raggi di collegamento
  g.save(); g.translate(cx,cy);
  for(let i=0;i<4;i++){
    g.save(); g.rotate(i*Math.PI/2 + Math.PI/4);
    g.fillStyle=dark; g.fillRect(-R*0.045, 0, R*0.09, ringR);
    g.strokeStyle='#1a2438'; g.lineWidth=1.5; g.strokeRect(-R*0.045, 0, R*0.09, ringR);
    g.restore();
  }
  g.restore();
  // nucleo centrale
  const coreR=R*0.30;
  g.fillStyle=met; g.beginPath(); g.arc(cx,cy,coreR,0,TAU); g.fill();
  g.strokeStyle='#1a2438'; g.lineWidth=2; g.beginPath(); g.arc(cx,cy,coreR,0,TAU); g.stroke();
  // finestrone del nucleo, incandescente
  const glow=g.createRadialGradient(cx,cy,1, cx,cy,coreR*0.62);
  glow.addColorStop(0,'#eafcff'); glow.addColorStop(0.5,'#7df9ff'); glow.addColorStop(1,'rgba(125,249,255,0)');
  g.fillStyle=glow; g.beginPath(); g.arc(cx,cy,coreR*0.62,0,TAU); g.fill();
  // antenna d'attracco in alto
  g.fillStyle='#8fa5c9'; g.fillRect(cx-1.5, cy-R*0.98, 3, R*0.26);
  g.fillStyle='#ff5c74'; g.fillRect(cx-2, cy-R*0.99, 4, 4);
  // ombra terminatore in basso a destra (come i pianeti)
  g.globalCompositeOperation='source-atop';
  g.globalAlpha=0.35; g.fillStyle='#000';
  g.beginPath(); g.arc(d*0.72,d*0.7,R*1.05,0,TAU); g.fill();
  g.globalAlpha=1; g.globalCompositeOperation='source-over';
  return c;
}
HUB.tex = stationTexture(HUB);

/* ---------- Starfield parallasse ---------- */
const STARS=[];
for(let L=0;L<3;L++){
  const n=[140,90,50][L];
  for(let i=0;i<n;i++) STARS.push({x:rand()*2000,y:rand()*2000,l:L,
    s:[1,1.5,2.5][L], c:rand()<0.75?'#cfe4ff':(rand()<0.5?'#7df9ff':'#ffcf5c'),
    tw:rand()*TAU});
}
function drawStars(camx,camy,t){
  for(const s of STARS){
    const f=[0.15,0.35,0.6][s.l];
    let x=(s.x - camx*f)%2000, y=(s.y - camy*f)%2000;
    if(x<0)x+=2000; if(y<0)y+=2000;
    if(x>W||y>H) continue;
    const a = 0.5+0.5*Math.sin(t*2+s.tw);
    ctx.globalAlpha = 0.35+0.6*a*(s.l===2?1:0.7);
    ctx.fillStyle=s.c; ctx.fillRect(x,y,s.s,s.s);
  }
  ctx.globalAlpha=1;
}
