/* sprites.js — generatori di sprite pixel-art (navi, invader, cristallo, stazione, eroe/heroFrames)
   + drawEquipOverlay (filone B, 28/07/2026: aggancio di equip_lib.js nel gioco vero)
   + structureSprite (filone C, 28/07/2026: sprite edifici G1-G5 da ART_PACK.structures).
   heroFrames/ecc. estratti verbatim da index.html nello split del monolite
   (PLAN_Cantieri.md, piano "split monolite + pack equip + strutture", filone A). Nessuna logica
   cambiata lì. Dipende da `clamp` (definito nel blocco di configurazione core, ancora inline in
   index.html, caricato PRIMA di questo file — stessa posizione originale nel flusso).
   `refreshHeroLook()` legge `loadout` (definito più avanti, in equip-shop.js): funziona perché
   viene chiamata solo a runtime (dal negozio), non eseguita al parse.
   drawEquipOverlay dipende da `window.EQUIP_LIB` (equip_lib.js, script src caricato tra i pack
   in testa a index.html); structureSprite dipende da `window.ART_PACK.structures`
   (art-pack.js, stessa posizione) — entrambi solo a runtime, mai al parse. */
"use strict";

/* ---------- Sprite pixel-art ---------- */
function makeSprite(rows, pal, scale=1){
  const h=rows.length, w=rows[0].length;
  const c=document.createElement('canvas'); c.width=w*scale; c.height=h*scale;
  const g=c.getContext('2d');
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const ch=rows[y][x]; if(ch==='.'||!pal[ch]) continue;
    g.fillStyle=pal[ch]; g.fillRect(x*scale,y*scale,scale,scale);
  }
  return c;
}
function flipX(img){
  const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
  const g=c.getContext('2d'); g.translate(img.width,0); g.scale(-1,1); g.drawImage(img,0,0);
  return c;
}

/* Navicelle (vista dall'alto, punta in su) — generatore con forme e palette */
const HULL_SHAPES = {
  nomad: [
"......W......",
".....WCW.....",
".....CAC.....",
"....CAAAC....",
"....CAGAC....",
"...CAAGAAC...",
"...CAAGAAC...",
"..CAAAGAAAC..",
".CCAAAAAAACC.",
".CACAAAAACAC.",
"CAAC.AAA.CAAC",
"CCC..OOO..CCC",
".....OFO.....",
  ],
  falcon: [
"......W......",
".....WAW.....",
"....CAGAC....",
"....CAGAC....",
"...CAAGAAC...",
"...CAAAAAC...",
"..CAAAAAAAC..",
".CAACAAACAAC.",
"CAAC.AAA.CAAC",
"CAC..AAA..CAC",
"CC..CAAAC..CC",
"....COFOC....",
".....OFO.....",
  ],
  vespa: [
".....WCW.....",
".....CAC.....",
"....CAAAC....",
"..W.CAGAC.W..",
".WCCAAGAACCW.",
".CAAAAGAAAAC.",
"CAACAAAAACAAC",
"CAC.CAAAC.CAC",
"CC...AAA...CC",
"C....AAA....C",
".....AAA.....",
"....OO.OO....",
"....FF.FF....",
  ]
};
function shipSprite(shape, hull, glow, accent){
  return makeSprite(HULL_SHAPES[shape],
    {W:'#eaffff',C:shade(hull,45),A:hull,G:glow,O:'#ffcf5c',F:'#ff7847',D:shade(hull,-32),R:accent||'#c23b4e'});
}
/* Canvas placeholder 1x1 che si riempie in modo async quando l'immagine (data-URI) è decodificata —
   stesso oggetto canvas restituito subito, si aggiorna sul posto: sicuro anche se già in uso altrove (es. SHIPSPR). */
function imgSprite(dataUri){
  const c=document.createElement('canvas'); c.width=c.height=1;
  const img=new Image();
  img.onload=()=>{ c.width=img.naturalWidth; c.height=img.naturalHeight; c.getContext('2d').drawImage(img,0,0); };
  img.src=dataUri;
  return c;
}
/* Pirati: arte dedicata da ART_PACK.ships (raider_*) se presente, altrimenti scafi riusati con livree scure */
function raiderSprite(shape, hull, glow, packId){
  const skin=(typeof window!=='undefined' && window.ART_PACK && window.ART_PACK.ships) ? window.ART_PACK.ships[packId] : null;
  return skin ? imgSprite(skin.img) : shipSprite(shape, hull, glow);
}
/* ---------- FLOTTA (06/08/2026): il catalogo navi con i ruoli ----------
   `window.FLEET_PACK = { version:1, ships:{ id:{name, img, roles:[…], stats:{…}} } }`.
   Prima i predoni erano TRE, scritti qui dentro; l'unica cosa che un pack poteva fare era
   sostituirne l'immagine, uno per uno. Ora il numero e i ruoli li decide il pack: `predone`
   (quanti se ne vogliono), `elite`, `giocatore` (con le sue statistiche, merge in equip-db.js),
   `scena` (navi da mettere nello spazio con lo space editor, nessun effetto qui).
   Senza fleet-pack tutto resta identico a prima: i tre predoni e l'elite di sempre. */
const FLEET = (typeof window!=='undefined' && window.FLEET_PACK) || null;
function flottaPerRuolo(ruolo){
  const out=[];
  if(!FLEET || !FLEET.ships) return out;
  for(const id in FLEET.ships){
    const s=FLEET.ships[id];
    if(s && s.img && (s.roles||[]).indexOf(ruolo)>=0) out.push(Object.assign({id}, s));
  }
  return out;
}
const FLOTTA_PREDONI = flottaPerRuolo('predone');
const FLOTTA_ELITE   = flottaPerRuolo('elite');
const PIRATE_SPRS = FLOTTA_PREDONI.length
  ? FLOTTA_PREDONI.map(s => imgSprite(s.img))
  : [ raiderSprite('vespa','#5a2430','#ff5c74','marauder_fang'),
      raiderSprite('falcon','#3a3f4e','#ff8bd0','void_reaver'),
      raiderSprite('nomad','#4a3a1e','#ffcf5c','skull_breaker') ];
/* Elite: anche loro possono essere più d'una (l'ondata ne pesca a caso come per i predoni).
   Senza flotta resta l'unica di sempre, presa da `pirate_elite` nell'art-pack. */
const PIRATE_ELITES = FLOTTA_ELITE.length
  ? FLOTTA_ELITE.map(s => imgSprite(s.img))
  : [ raiderSprite('vespa','#2a1a3a','#e0b3ff','pirate_elite') ];
const PIRATE_ELITE = PIRATE_ELITES[0];
if(FLEET) console.log('[FLEET-PACK] '+Object.keys(FLEET.ships||{}).length+' navi: '+
  FLOTTA_PREDONI.length+' predoni, '+FLOTTA_ELITE.length+' elite, '+
  flottaPerRuolo('giocatore').length+' del giocatore, '+flottaPerRuolo('scena').length+' di scena');

/* Strutture pianeta (edifici G1-G5, filone C split-monolite): id → canvas, con cache per id
   (a differenza delle navi/pirati, gli id non sono noti a priori — arrivano da world-pack). */
const structureSprCache={};
function structureSprite(id){
  if(!(id in structureSprCache)){
    const def=window.ART_PACK && window.ART_PACK.structures && window.ART_PACK.structures[id];
    structureSprCache[id] = (def && def.img) ? imgSprite(def.img) : null;
  }
  return structureSprCache[id];
}
/* Strutture COMPONIBILI (06/08/2026, fase B2): invece di una sola immagine, una struttura può
   avere `parts:[{img,dx,dy,scale,rot,spin}]` — è il mulino con la pala che gira, già componibile
   nel catalog_editor e piazzabile nel world editor, che fino a ieri arrivava in partita come
   figurina ferma. Ogni parte è un'immagine sua, ruotata attorno al proprio centro: `rot` gradi
   fissi, `spin` gradi al secondo. Stessa cache per id, una voce per parte. */
function structureParts(id){
  const k = id+'#parts';
  if(!(k in structureSprCache)){
    const def=window.ART_PACK && window.ART_PACK.structures && window.ART_PACK.structures[id];
    structureSprCache[k] = (def && Array.isArray(def.parts) && def.parts.length)
      ? def.parts.map(p => Object.assign({}, p, {spr: imgSprite(p.img)}))
      : null;
  }
  return structureSprCache[k];
}

/* Invader classico, 2 frame */
const INV_PAL = {X:'#8dfd6a',E:'#dfffd0'};
const INV1 = makeSprite([
"..X.....X..",
"...X...X...",
"..XXXXXXX..",
".XX.XXX.XX.",
"XXXXXXXXXXX",
"X.XXXXXXX.X",
"X.X.....X.X",
"...XX.XX...",
], INV_PAL);
const INV2 = makeSprite([
"..X.....X..",
"X..X...X..X",
"X.XXXXXXX.X",
"XXX.XXX.XXX",
"XXXXXXXXXXX",
".XXXXXXXXX.",
"..X.....X..",
".X.......X.",
], INV_PAL);
const INV1b = makeSprite([
".XX.....XX.",
"..X.....X..",
".XXXXXXXXX.",
"XX.XXXXX.XX",
"XXXXXXXXXXX",
"..XXXXXXX..",
".X.X...X.X.",
"X.........X",
], {X:'#ff8bd0',E:'#ffe1f2'});

/* Cristallo */
const CRYSTAL = makeSprite([
"...W...",
"..WCC..",
".WCCCB.",
".WCCBB.",
"..CCB..",
"...B...",
], {W:'#ffffff',C:'#8ef7ff',B:'#3aa7d8'});

/* Stazione spaziale (icona per lo spazio) */
const STATION = makeSprite([
"....WWWW....",
"...W....W...",
"..W..CC..W..",
".W...CC...W.",
"WWWW.CC.WWWW",
"....WCCW....",
"WWWW.CC.WWWW",
".W...CC...W.",
"..W..CC..W..",
"...W....W...",
"....WWWW....",
], {W:'#8fa5c9',C:'#7df9ff'});

/* Personaggio stile GB: giù/su/lato, 2 frame ciascuno */
function heroFrames(suit,skin,hair,style=0){
  const P={H:hair,S:skin,U:suit,D:shade(suit,-40),B:'#20242c',V:'#7df9ff'};
  let down1=["..HHHH..","..HHHH..",".HSSSSH.",".HSBSBS.","..SSSS..",".UUUUUU.","USUVVUSU","USUVVUSU",".UUUUUU.",".DD..DD.",".BB..BB."];
  let down2=["..HHHH..","..HHHH..",".HSSSSH.",".HSBSBS.","..SSSS..",".UUUUUU.","USUVVUSU","USUVVUSU",".UUUUUU.","..DDDD..",".BB.BB.."];
  let up1  =["..HHHH..",".HHHHHH.",".HHHHHH.",".HHHHHH.","..HHHH..",".UUUUUU.","USUUUUSU","USUUUUSU",".UUUUUU.",".DD..DD.",".BB..BB."];
  let up2  =["..HHHH..",".HHHHHH.",".HHHHHH.",".HHHHHH.","..HHHH..",".UUUUUU.","USUUUUSU","USUUUUSU",".UUUUUU.","..DDDD..",".BB.BB.."];
  let side1=["..HHHH..","..HHHH..",".HSSSSH.","..SBSS..","..SSSS..",".UUUUUU.",".UUVUUS.",".UUVUUS.",".UUUUUU.","..DDDD..","..BB.B.."];
  let side2=["..HHHH..","..HHHH..",".HSSSSH.","..SBSS..","..SSSS..",".UUUUUU.",".UUVUUS.",".UUVUUS.",".UUUUUU.",".DD.DD..",".B...BB."];
  if(style===1){ // capelli lunghi
    for(const a of [down1,down2]){ a[2]='HHSSSSHH'; a[3]='HHSBSBSH'; a[4]='H.SSSS.H'; }
    for(const a of [up1,up2]){ a[4]='.HHHHHH.'; }
    for(const a of [side1,side2]){ a[2]='HHSSSSH.'; a[3]='H.SBSS..'; a[4]='H.SSSS..'; }
  } else if(style===2){ // casco con visiera
    P.H=shade(suit,30);
    for(const a of [down1,down2,side1,side2]){ a[1]='.HVVVVH.'; }
  }
  const mk=r=>makeSprite(r,P);
  const R1=mk(side1), R2=mk(side2);
  return { down:[mk(down1),mk(down2)], up:[mk(up1),mk(up2)],
           right:[R1,R2], left:[flipX(R1),flipX(R2)] };
}
function shade(hex,amt){
  const n=parseInt(hex.slice(1),16);
  const r=clamp(((n>>16)&255)+amt,0,255),g=clamp(((n>>8)&255)+amt,0,255),b=clamp((n&255)+amt,0,255);
  return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
}
/* ---------- Equip overlay (casco/arma procedurali HQ da equip_lib.js) ----------
   Filone B del piano split-monolite (PLAN_Cantieri.md §3bis): porta EQUIP_LIB (finora usata
   solo in rig_playground.html) sopra gli sprite heroFrames() del gioco vero. Stesso contratto
   di composizione già validato lì (drawHelmetProcHQ/drawWeaponProcHQ), solo generalizzato per
   accettare un ctx esplicito e qualunque entità (eroe o NPC humanoid), non il rig fisso del
   playground. Non chiamare mai se EQUIP_LIB non è caricato (script src mancante): i chiamanti
   passano sempre helmetSpec/weaponSpec, che restano undefined finché nessun pack li imposta.
   Regola permanente (anche in SPEC_art_pack.md): qualunque entità disegnata con heroFrames()
   (eroe, NPC in forge-pack.js) può avere campi opzionali `helmet:{archetype,color}` e/o
   `weapon:{id,metal,accent,lenPct}` accanto a suit/skin/hair — assenti = nessun disegno,
   comportamento identico a oggi (merge non distruttivo, stesso principio degli altri pack). */
function drawHelmetOverlay(ctx,dir,x,y,dw,spec){
  const imgs=EQUIP_LIB.getHelmetHQ(spec.archetype,spec.color);
  const Z=dw/8, s=(spec.sizePct||100)/100;
  const bottom=y+5.15*Z; // bordo inferiore fisso alla riga spalle, tocca il busto (vedi rig_playground.html)
  const w=dw*0.95*s, h=w;
  const hx=x+dw/2-w/2, hy=bottom-h, HQ=EQUIP_LIB.HQ_SIZE;
  const prevSmooth=ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled=true;
  if(dir==='down'){ ctx.drawImage(imgs.front,0,0,HQ,HQ, hx,hy,w,h); }
  else if(dir==='up'){ ctx.drawImage(imgs.back,0,0,HQ,HQ, hx,hy,w,h); }
  else if(dir==='right'){ ctx.drawImage(imgs.side,0,0,HQ,HQ, hx,hy,w,h); }
  else { ctx.save(); ctx.translate(hx+w,hy); ctx.scale(-1,1); ctx.drawImage(imgs.side,0,0,HQ,HQ, 0,0,w,h); ctx.restore(); }
  ctx.imageSmoothingEnabled=prevSmooth;
  // pallino sulla cucitura collo/busto (copre eventuale pixel residuo di pelle/capelli): colore
  // derivato dal casco stesso se non specificato altrimenti, stessa idea di shade(suit,-40).
  ctx.fillStyle=EQUIP_LIB.shade(spec.neckColor||spec.color,-40);
  ctx.beginPath(); ctx.arc(x+dw/2, y+5.05*Z, Z*0.3, 0, Math.PI*2); ctx.fill();
}
function drawWeaponOverlay(ctx,dir,x,y,dw,dh,spec){
  const hq=EQUIP_LIB.getWeaponHQ(spec.id,spec.metal,spec.accent,spec.lenPct||100);
  const prevSmooth=ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled=true;
  if(dir==='right'||dir==='down'){
    const w=dw*0.62, h=w*(hq.frame.height/hq.frame.width);
    const wx=x+dw*0.78, wy=y+dh*(dir==='right'?0.56:0.62)-h/2;
    ctx.drawImage(hq.frame,0,0,hq.frame.width,hq.frame.height, wx,wy,w,h);
  } else if(dir==='left'){
    const w=dw*0.62, h=w*(hq.frame.height/hq.frame.width);
    const wx=x+dw*0.22-w, wy=y+dh*0.56-h/2;
    ctx.save(); ctx.translate(wx+w,wy); ctx.scale(-1,1);
    ctx.drawImage(hq.frame,0,0,hq.frame.width,hq.frame.height, 0,0,w,h);
    ctx.restore();
  } else { // up — di spalle, solo la fondina resta visibile
    const w=dw*0.22, h=w;
    ctx.drawImage(hq.holster,0,0,hq.holster.width,hq.holster.height, x+dw*0.66,y+dh*0.72,w,h);
  }
  ctx.imageSmoothingEnabled=prevSmooth;
}
function drawEquipOverlay(ctx,dir,x,y,scale,helmetSpec,weaponSpec){
  if(!helmetSpec && !weaponSpec) return;
  const dw=8*scale, dh=11*scale;
  if(helmetSpec) drawHelmetOverlay(ctx,dir,x,y,dw,helmetSpec);
  if(weaponSpec) drawWeaponOverlay(ctx,dir,x,y,dw,dh,weaponSpec);
}
let HERO = heroFrames('#e0532f','#f2c9a0','#7a4a24'); // colore tuta esplorazione
function drawSbPortrait(){
  const c=document.getElementById('sb-portrait'), g=c.getContext('2d');
  g.imageSmoothingEnabled=false;
  g.fillStyle='#0a0f1e'; g.fillRect(0,0,19,19);
  const spr=HERO.down[0], dh=19, dw=dh*(spr.width/spr.height);
  g.drawImage(spr,0,0,spr.width,spr.height,(19-dw)/2,0,dw,dh);
}
drawSbPortrait();
function refreshHeroLook(){
  HERO = heroFrames(loadout.suit.color,'#f2c9a0','#7a4a24');
  drawSbPortrait();
}
