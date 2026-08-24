/* equip_lib.js — libreria di caschi/armi PROCEDURALI (canvas, gradienti, niente immagini AI).
   Decisione di sessione (PLAN_Cantieri.md §0, 28/07/2026): personaggi che si muovono/girano restano
   procedurali (heroFrames() e affini) — questa libreria è il "layer HQ" per i dettagli che si
   aggiungono sopra (casco, arma): stessa idea via codice ma a risoluzione fissa più alta (512px),
   poi rimpicciolita con smoothing acceso sopra lo sprite a pixel netti.
   File iniettabile via <script src>, come forge-pack.js/world-pack.js/art-pack.js, ma qui il
   contenuto sono FUNZIONI riutilizzabili + un catalogo di preset, non dati statici.
   Caschi: 8 archetipi = gli 8 tipi di tuta di ASSET_PROMPTS.md sez. C (C1+C2).
   Armi: 5 tipi = ASSET_PROMPTS.md sez. D (D1 fino a pulse pistol di D2; scanner escluso, non è un'arma).
   Uso: EQUIP_LIB.buildHelmetHQ(archetipo, colore, vista) / EQUIP_LIB.buildWeaponHQ(id, vista, overrides). */
window.EQUIP_LIB = (function(){
"use strict";
const HQ_SIZE = 512;

function shade(hex,amt){
  const n=parseInt(hex.slice(1),16);
  const cl=v=>Math.max(0,Math.min(255,v));
  const r=cl(((n>>16)&255)+amt),g=cl(((n>>8)&255)+amt),b=cl((n&255)+amt);
  return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
}
function mixColor(hexA,hexB,t){
  const pa=parseInt(hexA.slice(1),16), pb=parseInt(hexB.slice(1),16);
  const ra=(pa>>16)&255, ga=(pa>>8)&255, ba=pa&255;
  const rb=(pb>>16)&255, gb=(pb>>8)&255, bb=pb&255;
  const r=Math.round(ra+(rb-ra)*t), g=Math.round(ga+(gb-ga)*t), b=Math.round(ba+(bb-ba)*t);
  return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
}
function mkCanvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }

/* ============================================================
   CASCHI — sagoma per archetipo: cupola/cresta di forma diversa (round/angular/ridge, altezza
   domeH indipendente dalla semilarghezza rx) + fianchi DRITTI a larghezza costante rx fino a
   bottomY (invariato: un'ellisse si restringerebbe lontano dal centro e scoprirebbe le
   basette/orecchie sotto — bug reale trovato e corretto in rig_playground.html, rx resta >=0.47
   per TUTTI gli archetipi, la varietà sta nella cupola non nella larghezza di sicurezza).
   28/07/2026 — backlog "sagome tutte uguali": prima tutti gli archetipi usavano lo stesso arco
   con la cupola quasi interamente fuori canvas (domeFrac«rx, punta invisibile) — da qui la resa
   "capsula piatta" indistinguibile. Ora domeH è un parametro indipendente (non più legato a rx)
   e il punto di raccordo baseY varia per archetipo, così la cupola è realmente visibile e diversa.
   ============================================================ */
const HELMET_PRESETS = {
  esplorazione: { rx:0.47, baseY:0.32, domeH:0.22, crown:'round',   visor:'band'    },
  assalto:      { rx:0.50, baseY:0.24, domeH:0.15, crown:'angular', visor:'narrow', plated:true, browRidge:true },
  recon:        { rx:0.47, baseY:0.42, domeH:0.11, crown:'round',   visor:'slim',   fin:true },
  ignifuga:     { rx:0.48, baseY:0.30, domeH:0.20, crown:'round',   visor:'band',   plated:true, flare:0.05 },
  subacquea:    { rx:0.47, baseY:0.64, domeH:0.46, crown:'round',   visor:'porthole' },
  antitossine:  { rx:0.47, baseY:0.34, domeH:0.18, crown:'round',   visor:'mask',   snout:true },
  termica:      { rx:0.47, baseY:0.30, domeH:0.26, crown:'round',   visor:'band',   hood:true, flare:0.04 },
  cybernetica:  { rx:0.47, baseY:0.36, domeH:0.09, crown:'ridge',   visor:'slim',   circuits:true },

  // ---- archetipi alieni/esotici (28/07/2026, backlog "più mostruosi/organici") ----
  // Non ritinte degli 8 sopra: sagoma diversa (crown dedicato) pensata per la specie che la
  // indossa in forge-pack.js. rx resta >=0.47 anche qui (stessa garanzia anti-basette), tranne
  // 'psionico' che non è un casco pieno (vedi buildHaloHQ, non passa da helmetPath).
  carapace: { rx:0.47, baseY:0.34, domeH:0.20, crown:'segmented', visor:'compound', mandibles:true },   // insettoide (KLIXX)
  osseo:    { rx:0.47, baseY:0.36, domeH:0.14, crown:'crest',     visor:'narrow' },                     // rettiliano (SSKARR)
  psionico: { rx:0.30, baseY:0.30, crown:'halo' },                                                      // etereo (VESH'IEL) — non copre la testa
  ottico:   { rx:0.47, baseY:0.34, domeH:0.15, crown:'round',     visor:'multieye' },                   // drone (RATTLE-9)
  predone:  { rx:0.48, baseY:0.26, domeH:0.20, crown:'scrap',     visor:'narrow', patches:true }        // raider (GRIT/NYX)
};

function helmetPath(g,cx,rx,baseY,domeH,bottomY,crown,flare){
  g.beginPath();
  if(crown==='angular'){                                    // assalto: plateau sfaccettato, non tondo
    g.moveTo(cx-rx, baseY);
    g.lineTo(cx-rx*0.6, baseY-domeH*0.8);
    g.lineTo(cx-rx*0.32, baseY-domeH);
    g.lineTo(cx+rx*0.32, baseY-domeH);
    g.lineTo(cx+rx*0.6, baseY-domeH*0.8);
    g.lineTo(cx+rx, baseY);
  } else if(crown==='ridge'){                                // cybernetica: profilo basso + cresta sottile centrale
    g.moveTo(cx-rx, baseY);
    g.lineTo(cx-rx*0.85, baseY-domeH*0.5);
    g.lineTo(cx-rx*0.10, baseY-domeH*0.5);
    g.lineTo(cx-rx*0.07, baseY-domeH*2.4);
    g.lineTo(cx+rx*0.07, baseY-domeH*2.4);
    g.lineTo(cx+rx*0.10, baseY-domeH*0.5);
    g.lineTo(cx+rx*0.85, baseY-domeH*0.5);
    g.lineTo(cx+rx, baseY);
  } else if(crown==='segmented'){                            // carapace: 2 gobbe chitinose separate da un solco
    g.moveTo(cx-rx, baseY);
    g.lineTo(cx-rx, baseY-domeH*0.3);
    g.quadraticCurveTo(cx-rx*0.62, baseY-domeH*1.1, cx-rx*0.22, baseY-domeH*0.72);
    g.quadraticCurveTo(cx, baseY-domeH*0.5, cx+rx*0.22, baseY-domeH*0.72);
    g.quadraticCurveTo(cx+rx*0.62, baseY-domeH*1.1, cx+rx, baseY-domeH*0.3);
    g.lineTo(cx+rx, baseY);
  } else if(crown==='crest'){                                // osseo: fila di punte ossee irregolari sulla cresta
    const baseTop = baseY - domeH*0.35;
    g.moveTo(cx-rx, baseY);
    g.lineTo(cx-rx*0.75, baseTop);
    const spikeX=[-0.5,-0.2,0.12,0.42], spikeH=[1.2,1.9,1.6,1.0];
    for(let i=0;i<spikeX.length;i++){
      const bx=cx+rx*spikeX[i];
      g.lineTo(bx-rx*0.09, baseTop);
      g.lineTo(bx, baseY-domeH*spikeH[i]);
      g.lineTo(bx+rx*0.09, baseTop);
    }
    g.lineTo(cx+rx*0.75, baseTop);
    g.lineTo(cx+rx, baseY);
  } else if(crown==='scrap'){                                // predone: profilo irregolare/asimmetrico, rattoppato
    g.moveTo(cx-rx, baseY);
    g.lineTo(cx-rx*0.7, baseY-domeH*0.5);
    g.lineTo(cx-rx*0.42, baseY-domeH*1.1);
    g.lineTo(cx-rx*0.1, baseY-domeH*0.8);
    g.lineTo(cx+rx*0.2, baseY-domeH*0.95);
    g.lineTo(cx+rx*0.5, baseY-domeH*0.55);
    g.lineTo(cx+rx, baseY);
  } else {                                                   // round: arco ellittico, altezza domeH indipendente da rx
    g.ellipse(cx, baseY, rx, domeH, 0, Math.PI, 0, false);
  }
  if(flare){                                                 // ignifuga/termica: fianchi che si allargano verso il basso
    const waistY = baseY + (bottomY-baseY)*0.7;
    g.lineTo(cx+rx, waistY);
    g.lineTo(cx+rx*(1+flare), bottomY);
    g.lineTo(cx-rx*(1+flare), bottomY);
    g.lineTo(cx-rx, waistY);
  } else {
    g.lineTo(cx+rx, bottomY);
    g.lineTo(cx-rx, bottomY);
  }
  g.closePath();
}

function buildHelmetHQ(archetype, color, view){
  const preset = HELMET_PRESETS[archetype] || HELMET_PRESETS.esplorazione;
  if(preset.crown==='halo') return buildHaloHQ(preset,color,view);   // psionico: non passa dal sistema capsula+collare
  const c=mkCanvas(HQ_SIZE,HQ_SIZE), g=c.getContext('2d');
  const cx=HQ_SIZE*0.5, rx=HQ_SIZE*preset.rx;
  const baseY=HQ_SIZE*preset.baseY, domeH=HQ_SIZE*preset.domeH, bottomY=HQ_SIZE;
  const rimCol=shade(color,-50), outline=shade(color,-70);
  const path=()=>helmetPath(g,cx,rx,baseY,domeH,bottomY,preset.crown,preset.flare);

  // Gradiente d'ombra sull'intera sagoma: ancorato a rx/baseY (non a domeH), stessa identica
  // formula di prima con "domeCy"→"baseY" — la resa luce/ombra resta quella collaudata a
  // prescindere dalla forma di cupola scelta sopra.
  const dome=g.createRadialGradient(cx-rx*0.35,baseY-rx*0.2,rx*0.1, cx,baseY+rx*0.7,rx*1.6);
  dome.addColorStop(0, shade(color, preset.hood?40:75));   // cofano termico: meno lucido, più opaco
  dome.addColorStop(0.5, color);
  dome.addColorStop(0.85, rimCol);
  dome.addColorStop(1, outline);
  g.fillStyle=dome; path(); g.fill();

  g.save(); path(); g.clip();
  g.fillStyle=rimCol; g.fillRect(cx-rx, HQ_SIZE*0.78, rx*2, HQ_SIZE*0.22);  // fascia paranuca inferiore

  if(preset.plated){                                                        // piastre rinforzate (assalto/ignifuga)
    g.strokeStyle=outline; g.lineWidth=HQ_SIZE*0.012;
    for(const fy of [0.42,0.58,0.72]){ g.beginPath(); g.moveTo(cx-rx,HQ_SIZE*fy); g.lineTo(cx+rx,HQ_SIZE*fy); g.stroke(); }
  }
  if(preset.circuits){                                                      // linee luminose (cybernetica)
    g.strokeStyle=mixColor(color,'#8dfd6a',0.7); g.lineWidth=HQ_SIZE*0.008; g.globalAlpha=0.8;
    for(const fx of [-0.5,0,0.5]){ g.beginPath(); g.moveTo(cx+rx*fx,baseY-domeH*0.3); g.lineTo(cx+rx*fx,HQ_SIZE*0.75); g.stroke(); }
    g.globalAlpha=1;
  }
  if(preset.browRidge){                                                     // cresta pesante sopra il visore (assalto)
    g.fillStyle=outline; g.fillRect(cx-rx*0.9, HQ_SIZE*0.36, rx*1.8, HQ_SIZE*0.05);
  }
  if(preset.patches){                                                       // rattoppi/rivetti sparsi (predone)
    g.fillStyle=outline;
    for(const [px,py] of [[-0.55,0.55],[0.1,0.68],[0.4,0.5],[-0.15,0.82]]){
      g.beginPath(); g.arc(cx+rx*px, HQ_SIZE*py, rx*0.025,0,Math.PI*2); g.fill();
    }
  }

  const visorY=HQ_SIZE*0.42, front = (view==='front');
  const vx = front ? cx-rx*0.85 : cx+rx*0.05;
  const vw = front ? rx*1.7 : rx*0.85;
  if(preset.visor==='porthole'){                                            // subacquea: oblò tondo
    const pr = rx*(front?0.42:0.32), pcx = front?cx:cx+rx*0.15;
    const glow=g.createRadialGradient(pcx,visorY,pr*0.15, pcx,visorY,pr);
    glow.addColorStop(0,'#eafcff'); glow.addColorStop(0.55,'#3aa7d8'); glow.addColorStop(1,rimCol);
    g.fillStyle=glow; g.beginPath(); g.arc(pcx,visorY,pr,0,Math.PI*2); g.fill();
    g.strokeStyle=outline; g.lineWidth=HQ_SIZE*0.02; g.stroke();
  } else if(preset.visor==='mask'){                                         // antitossine: muso a maschera + 2 lenti
    g.fillStyle=rimCol;
    g.beginPath(); g.moveTo(cx-rx*0.4,visorY); g.lineTo(cx+rx*0.4,visorY);
    g.lineTo(cx+rx*0.22,HQ_SIZE*0.68); g.lineTo(cx-rx*0.22,HQ_SIZE*0.68); g.closePath(); g.fill();
    for(const sx of front?[-0.4,0.4]:[0.15]){
      const lg=g.createRadialGradient(cx+rx*sx,visorY*0.92,2, cx+rx*sx,visorY*0.92,rx*0.16);
      lg.addColorStop(0,'#eafcff'); lg.addColorStop(0.6,'#3aa7d8'); lg.addColorStop(1,rimCol);
      g.fillStyle=lg; g.beginPath(); g.arc(cx+rx*sx,visorY*0.92,rx*0.16,0,Math.PI*2); g.fill();
    }
  } else if(preset.visor==='compound'){                                     // carapace: cluster di faccette (occhi composti)
    const baseX = front ? cx-rx*0.5 : cx+rx*0.02;
    const facets = front
      ? [[0,-0.03,0.11],[0.26,0,0.09],[0.5,-0.02,0.10],[0.13,0.09,0.08],[0.38,0.1,0.07]]
      : [[0,0,0.10],[0.2,0.06,0.07]];
    for(const [fx,fy,fr] of facets){
      const px=baseX+rx*fx, py=visorY+HQ_SIZE*fy, pr=rx*fr;
      const fg=g.createRadialGradient(px,py,pr*0.1, px,py,pr);
      fg.addColorStop(0,'#eafcff'); fg.addColorStop(0.55,'#3aa7d8'); fg.addColorStop(1,rimCol);
      g.fillStyle=fg; g.beginPath(); g.arc(px,py,pr,0,Math.PI*2); g.fill();
    }
  } else if(preset.visor==='multieye'){                                     // drone ottico: grappolo asimmetrico di lenti
    const eyes = front
      ? [[-0.34,0,0.16],[0.02,-0.06,0.11],[0.30,0.08,0.13],[-0.05,0.22,0.08]]
      : [[0.05,0,0.14],[0.28,-0.1,0.09]];
    for(const [ex,ey,er] of eyes){
      const px=cx+rx*ex, py=visorY+HQ_SIZE*ey, pr=rx*er;
      const lg=g.createRadialGradient(px,py,pr*0.1, px,py,pr);
      lg.addColorStop(0,'#eafcff'); lg.addColorStop(0.55,'#3aa7d8'); lg.addColorStop(1,rimCol);
      g.fillStyle=lg; g.beginPath(); g.arc(px,py,pr,0,Math.PI*2); g.fill();
      g.strokeStyle=outline; g.lineWidth=HQ_SIZE*0.008; g.stroke();
    }
  } else {                                                                  // band/narrow/slim: fascia orizzontale
    const vh = HQ_SIZE*(preset.visor==='narrow'?0.1:preset.visor==='slim'?0.11:0.16);
    const glow=g.createLinearGradient(vx,0,vx+vw,0);
    glow.addColorStop(0,'rgba(125,249,255,0)'); glow.addColorStop(front?0.2:0.3,'#3aa7d8');
    glow.addColorStop(front?0.5:0.7,'#eafcff'); glow.addColorStop(front?0.8:1,'#3aa7d8');
    if(front) glow.addColorStop(1,'rgba(125,249,255,0)');
    g.fillStyle=glow; g.fillRect(vx, visorY-vh/2, vw, vh);
  }
  if(view==='side'){                                                        // presa d'aria sul retro, tutte le sagome
    g.fillStyle=rimCol; g.beginPath(); g.ellipse(cx-rx*0.72, HQ_SIZE*0.46, rx*0.13, rx*0.11, 0,0,Math.PI*2); g.fill();
  }
  if(view==='back'){
    g.fillStyle=rimCol; g.fillRect(cx-rx*0.06, HQ_SIZE*0.08, rx*0.12, HQ_SIZE*0.8);  // cresta centrale
  }
  const hi=g.createRadialGradient(cx-rx*0.4,baseY-rx*0.1,1, cx-rx*0.4,baseY-rx*0.1,rx*0.22);
  hi.addColorStop(0,'rgba(255,255,255,'+(preset.hood?0.4:0.85)+')'); hi.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=hi; g.fillRect(cx-rx,0,rx*2,HQ_SIZE*0.4);
  g.restore();

  g.strokeStyle=outline; g.lineWidth=HQ_SIZE*0.012; path(); g.stroke();
  g.fillStyle=rimCol;
  for(const sx of [-0.82,0.82]){ g.beginPath(); g.ellipse(cx+rx*sx, HQ_SIZE*0.46, rx*0.06,rx*0.05,0,0,Math.PI*2); g.fill(); }

  if(preset.snout){                                       // canister/filtro sporgente al mento (antitossine)
    const sw=rx*0.55, sh=HQ_SIZE*0.11, sy=bottomY-sh*0.7;
    g.fillStyle=rimCol; g.fillRect(cx-sw/2, sy, sw, sh);
    g.strokeStyle=outline; g.lineWidth=HQ_SIZE*0.015; g.strokeRect(cx-sw/2, sy, sw, sh);
  }
  if(preset.mandibles){                                   // 2 pinze chitinose curve ai lati del muso (carapace)
    const my=bottomY-HQ_SIZE*0.08, mw=rx*0.22, mh=HQ_SIZE*0.16;
    for(const sx of [-1,1]){
      g.fillStyle=rimCol;
      g.beginPath();
      g.moveTo(cx+sx*rx*0.62, my-mh*0.6);
      g.quadraticCurveTo(cx+sx*(rx*0.62+mw), my+mh*0.1, cx+sx*rx*0.5, my+mh*0.55);
      g.quadraticCurveTo(cx+sx*rx*0.58, my-mh*0.1, cx+sx*rx*0.62, my-mh*0.6);
      g.closePath(); g.fill();
      g.strokeStyle=outline; g.lineWidth=HQ_SIZE*0.01; g.stroke();
    }
  }
  if(preset.fin && view!=='front'){                       // aletta aerodinamica vista di lato/dietro (recon)
    g.fillStyle=outline;
    g.beginPath();
    g.moveTo(cx+rx*0.15, baseY-domeH*0.7);
    g.lineTo(cx+rx*0.55, baseY-domeH*1.8);
    g.lineTo(cx+rx*0.32, baseY-domeH*0.55);
    g.closePath(); g.fill();
  }
  return c;
}

/* psionico: NON un casco pieno — un sottile anello luminoso (halo/circlet) che lascia visibile
   la testa vera sotto (niente fascia paranuca, niente clip): coerente con un etereo che non
   indossa equipaggiamento militare ma porta solo un accessorio psionico. */
function buildHaloHQ(preset,color,view){
  const c=mkCanvas(HQ_SIZE,HQ_SIZE), g=c.getContext('2d');
  const cx=HQ_SIZE*0.5, rx=HQ_SIZE*preset.rx, ringY=HQ_SIZE*preset.baseY;
  const glowCol=shade(color,60), core=shade(color,90);
  const front=(view==='front');
  const ringRx = front? rx*0.62 : rx*0.34, ringRy=HQ_SIZE*0.05;
  g.save();
  g.shadowColor=color; g.shadowBlur=HQ_SIZE*0.05;
  const grad=g.createLinearGradient(cx-ringRx,ringY,cx+ringRx,ringY);
  grad.addColorStop(0,'rgba(255,255,255,0)'); grad.addColorStop(0.15,core);
  grad.addColorStop(0.5,glowCol); grad.addColorStop(0.85,core); grad.addColorStop(1,'rgba(255,255,255,0)');
  g.strokeStyle=grad; g.lineWidth=HQ_SIZE*0.028; g.globalAlpha=0.95;
  g.beginPath(); g.ellipse(cx,ringY,ringRx,ringRy,0,0,Math.PI*2); g.stroke();
  g.restore();
  const shards = front ? [-0.85,0,0.85] : [0.7];              // frammenti fluttuanti, meno vista di lato
  for(const sx of shards){
    const fx=cx+ringRx*sx*1.05, fy=ringY-HQ_SIZE*0.07;
    const fg=g.createRadialGradient(fx,fy,0, fx,fy,HQ_SIZE*0.022);
    fg.addColorStop(0,'#fff'); fg.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=fg; g.beginPath(); g.arc(fx,fy,HQ_SIZE*0.022,0,Math.PI*2); g.fill();
  }
  return c;
}

const helmetCache={};
function getHelmetHQ(archetype,color){
  const key=archetype+'|'+color;
  if(!helmetCache[key]) helmetCache[key]={
    front:buildHelmetHQ(archetype,color,'front'),
    side:buildHelmetHQ(archetype,color,'side'),
    back:buildHelmetHQ(archetype,color,'back')
  };
  return helmetCache[key];
}

/* ============================================================
   ARMI — famiglie di forma: 'barrel' (impugnatura+canna+puntale, parametrizzata), 'blade' (lama)
   e, 28/07/2026, 3 forme esotiche/aliene (backlog "non solo canna+grilletto o lama"): 'claw'
   (artiglio organico curvo), 'staff' (asta psionica con nucleo cristallino), 'scrap' (cannone
   raffazzonato/asimmetrico). Tutte direction-aware: è l'arma, non il casco, che DEVE cambiare
   aspetto girando (limite segnalato dall'utente).
   ============================================================ */
const WEAPON_PRESETS = {
  phaser:       { shape:'barrel', metal:'#7a828c', accent:'#3aa7d8', length:0.85, thickness:0.9 },
  blaster:      { shape:'barrel', metal:'#5c6570', accent:'#ff8b3d', length:1.15, thickness:1.25 },
  shotgun:      { shape:'barrel', metal:'#6b5a4a', accent:'#ff8b3d', length:1.0,  thickness:1.3, doubleBarrel:true },
  pulse_pistol: { shape:'barrel', metal:'#9aa5b0', accent:'#eafcff', length:0.55, thickness:0.75 },
  blade:        { shape:'blade',  metal:'#7a8272', accent:'#8dfd6a', length:1.0 },

  artiglio:          { shape:'claw',  metal:'#5a6b4a', accent:'#8dfd6a', length:0.9  },
  bastone_psionico:  { shape:'staff', metal:'#6a7a8a', accent:'#b98dff', length:1.05 },
  improvvisata:      { shape:'scrap', metal:'#7a6a4a', accent:'#ffcf5c', length:1.05, thickness:1.2 }
};

function buildBarrelHQ(preset,lenPct){
  const L=(lenPct/100)*preset.length, T=preset.thickness;
  const W=HQ_SIZE, H=HQ_SIZE*0.5;
  const c=mkCanvas(W,H), g=c.getContext('2d');
  const color=preset.metal, accent=preset.accent;
  const dark=shade(color,-55), light=shade(color,60), darker=shade(color,-75);
  const accentGlow=shade(accent,80), accentDark=shade(accent,-20);
  const gripW=W*0.16, barrelW=W*0.62*L, bh=H*0.34*Math.min(T,1.4);
  const midY=H*0.5;
  function drawOne(oy){
    g.fillStyle=dark; g.fillRect(0, midY+oy-bh*0.95, gripW, bh*1.9);
    g.strokeStyle=darker; g.lineWidth=H*0.035;
    g.beginPath(); g.arc(gripW*0.5, midY+oy+bh*1.05, gripW*0.42, 0.1*Math.PI, 0.95*Math.PI); g.stroke();
    const barGrad=g.createLinearGradient(0,midY+oy-bh/2,0,midY+oy+bh/2);
    barGrad.addColorStop(0, light); barGrad.addColorStop(0.5, color); barGrad.addColorStop(1, dark);
    g.fillStyle=barGrad;
    g.beginPath();
    g.moveTo(gripW, midY+oy-bh/2);
    g.lineTo(gripW+barrelW, midY+oy-bh*0.32);
    g.lineTo(gripW+barrelW, midY+oy+bh*0.32);
    g.lineTo(gripW, midY+oy+bh/2);
    g.closePath(); g.fill();
    g.strokeStyle=light; g.lineWidth=H*0.025; g.globalAlpha=0.85;
    g.beginPath(); g.moveTo(gripW+barrelW*0.08, midY+oy-bh*0.34); g.lineTo(gripW+barrelW*0.94, midY+oy-bh*0.16); g.stroke();
    g.globalAlpha=1;
    g.fillStyle=accentDark; g.fillRect(gripW+barrelW*0.32, midY+oy-bh*0.42, barrelW*0.08, bh*0.84);
    g.fillStyle=darker; g.fillRect(gripW+barrelW*0.1, midY+oy-bh*0.6, barrelW*0.05, bh*0.3);
    const mx=gripW+barrelW, mr=H*0.14;
    const mg=g.createRadialGradient(mx,midY+oy,2, mx,midY+oy,mr);
    mg.addColorStop(0,'#fff'); mg.addColorStop(0.45,accentGlow); mg.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=mg; g.beginPath(); g.arc(mx,midY+oy,mr,0,Math.PI*2); g.fill();
  }
  if(preset.doubleBarrel){ drawOne(-bh*0.55); drawOne(bh*0.55); } else { drawOne(0); }
  return c;
}
function buildBladeHQ(preset,lenPct){
  const L=(lenPct/100)*preset.length;
  const W=HQ_SIZE, H=HQ_SIZE*0.5;
  const c=mkCanvas(W,H), g=c.getContext('2d');
  const color=preset.metal, accent=preset.accent;
  const dark=shade(color,-50), light=shade(color,55);
  const hiltW=W*0.18, bladeW=W*0.68*L, midY=H*0.5, hh=H*0.22;
  g.fillStyle=dark; g.fillRect(0, midY-hh*0.5, hiltW, hh);                    // elsa/impugnatura
  g.fillStyle=shade(color,-70); g.fillRect(hiltW*0.35, midY-hh*0.85, hiltW*0.3, hh*1.7); // guardia
  const bladeGrad=g.createLinearGradient(0,midY-hh,0,midY+hh);
  bladeGrad.addColorStop(0, light); bladeGrad.addColorStop(0.5, '#e8ecef'); bladeGrad.addColorStop(1, light);
  g.fillStyle=bladeGrad;
  g.beginPath();                                                             // lama affusolata a punta
  g.moveTo(hiltW, midY-hh*0.55);
  g.lineTo(hiltW+bladeW*0.85, midY-hh*0.22);
  g.lineTo(hiltW+bladeW, midY);
  g.lineTo(hiltW+bladeW*0.85, midY+hh*0.22);
  g.lineTo(hiltW, midY+hh*0.55);
  g.closePath(); g.fill();
  g.strokeStyle=accent; g.lineWidth=H*0.02; g.globalAlpha=0.9;                // filo incandescente (bio-energia)
  g.beginPath(); g.moveTo(hiltW*1.1, midY); g.lineTo(hiltW+bladeW*0.95, midY); g.stroke();
  g.globalAlpha=1;
  return c;
}
function buildClawHQ(preset,lenPct){                                        // artiglio: lama organica curva, non dritta
  const L=(lenPct/100)*preset.length;
  const W=HQ_SIZE, H=HQ_SIZE*0.5;
  const c=mkCanvas(W,H), g=c.getContext('2d');
  const color=preset.metal, accent=preset.accent;
  const dark=shade(color,-50), light=shade(color,55);
  const hiltW=W*0.16, clawLen=W*0.62*L, midY=H*0.5, hh=H*0.20;
  g.fillStyle=dark; g.fillRect(0, midY-hh*0.6, hiltW, hh*1.2);              // impugnatura organica
  const grad=g.createLinearGradient(hiltW,midY-hh,hiltW+clawLen,midY);
  grad.addColorStop(0,light); grad.addColorStop(0.5,color); grad.addColorStop(1,dark);
  g.fillStyle=grad;
  g.beginPath();                                                            // dorso curvo verso l'alto poi punta, ventre di ritorno
  g.moveTo(hiltW, midY-hh*0.5);
  g.quadraticCurveTo(hiltW+clawLen*0.55, midY-hh*1.8, hiltW+clawLen, midY-hh*0.15);
  g.quadraticCurveTo(hiltW+clawLen*0.7, midY+hh*0.25, hiltW, midY+hh*0.5);
  g.closePath(); g.fill();
  g.strokeStyle=accent; g.lineWidth=H*0.02; g.globalAlpha=0.85;             // filo bio-luminescente lungo il dorso
  g.beginPath(); g.moveTo(hiltW*1.05, midY-hh*0.35); g.quadraticCurveTo(hiltW+clawLen*0.55, midY-hh*1.6, hiltW+clawLen*0.98, midY-hh*0.2); g.stroke();
  g.globalAlpha=1;
  return c;
}
function buildStaffHQ(preset,lenPct){                                       // bastone psionico: asta + nucleo cristallino
  const L=(lenPct/100)*preset.length;
  const W=HQ_SIZE, H=HQ_SIZE*0.5;
  const c=mkCanvas(W,H), g=c.getContext('2d');
  const color=preset.metal, accent=preset.accent;
  const dark=shade(color,-50), light=shade(color,50);
  const gripW=W*0.14, midY=H*0.5, rodH=H*0.10, rodLen=W*0.62*L;
  g.fillStyle=dark; g.fillRect(0, midY-rodH*1.3, gripW, rodH*2.6);          // impugnatura
  const rodGrad=g.createLinearGradient(0,midY-rodH/2,0,midY+rodH/2);
  rodGrad.addColorStop(0,light); rodGrad.addColorStop(0.5,color); rodGrad.addColorStop(1,dark);
  g.fillStyle=rodGrad; g.fillRect(gripW, midY-rodH/2, rodLen, rodH);        // asta sottile, non una canna
  const ccx=gripW+rodLen, cr=H*0.24;                                        // nucleo cristallino alla punta, non un puntale metallico
  const glow=g.createRadialGradient(ccx,midY,2, ccx,midY,cr);
  glow.addColorStop(0,'#fff'); glow.addColorStop(0.4, shade(accent,60)); glow.addColorStop(0.75,accent); glow.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=glow;
  g.beginPath();
  for(let i=0;i<=6;i++){ const a=i/6*Math.PI*2, r=cr*(i%2?0.55:1); const px=ccx+Math.cos(a)*r, py=midY+Math.sin(a)*r*0.75; i===0?g.moveTo(px,py):g.lineTo(px,py); }
  g.closePath(); g.fill();
  return c;
}
function buildScrapCannonHQ(preset,lenPct){                                  // improvvisata: canna raffazzonata/asimmetrica
  const L=(lenPct/100)*preset.length;
  const W=HQ_SIZE, H=HQ_SIZE*0.5;
  const c=mkCanvas(W,H), g=c.getContext('2d');
  const color=preset.metal, accent=preset.accent;
  const dark=shade(color,-55), light=shade(color,50), darker=shade(color,-75);
  const gripW=W*0.16, barrelW=W*0.58*L, midY=H*0.5, bh=H*0.4;
  g.fillStyle=dark; g.fillRect(0, midY-bh*0.5, gripW, bh);
  const grad=g.createLinearGradient(0,midY-bh/2,0,midY+bh/2);
  grad.addColorStop(0,light); grad.addColorStop(0.5,color); grad.addColorStop(1,dark);
  g.fillStyle=grad;
  g.beginPath();                                                            // canna principale leggermente storta
  g.moveTo(gripW, midY-bh*0.42);
  g.lineTo(gripW+barrelW, midY-bh*0.30-6);
  g.lineTo(gripW+barrelW, midY+bh*0.34-6);
  g.lineTo(gripW, midY+bh*0.42);
  g.closePath(); g.fill();
  g.fillStyle=darker;                                                       // secondo cilindro rattoppato sopra, disassato
  g.fillRect(gripW+barrelW*0.15, midY-bh*0.75, barrelW*0.4, bh*0.32);
  g.strokeStyle=shade(color,-90); g.lineWidth=H*0.012;
  g.strokeRect(gripW+barrelW*0.15, midY-bh*0.75, barrelW*0.4, bh*0.32);
  g.strokeStyle=accent; g.lineWidth=H*0.03; g.globalAlpha=0.8;               // nastro/fascetta di fortuna
  g.beginPath(); g.moveTo(gripW+barrelW*0.55, midY-bh*0.5); g.lineTo(gripW+barrelW*0.62, midY+bh*0.48); g.stroke();
  g.globalAlpha=1;
  g.fillStyle=darker; g.fillRect(gripW+barrelW*0.85, midY-bh*0.62, barrelW*0.04, bh*0.3); // mirino storto
  return c;
}
function buildWeaponHolsterHQ(color){
  const c=mkCanvas(HQ_SIZE*0.3,HQ_SIZE*0.3), g=c.getContext('2d');
  g.fillStyle=shade(color,-55); g.fillRect(c.width*0.2,c.height*0.2,c.width*0.6,c.height*0.6);
  return c;
}
function buildWeaponFrame(preset,lenPct){
  if(preset.shape==='blade') return buildBladeHQ(preset,lenPct);
  if(preset.shape==='claw')  return buildClawHQ(preset,lenPct);
  if(preset.shape==='staff') return buildStaffHQ(preset,lenPct);
  if(preset.shape==='scrap') return buildScrapCannonHQ(preset,lenPct);
  return buildBarrelHQ(preset,lenPct);
}
const weaponCache={};
/* metal/accent sono override: selezionare il TIPO imposta i default del preset (colori "naturali"
   dell'arma, sobri) ma restano modificabili a mano, stessa idea del casco (archetipo=sagoma,
   colore=separato). Passare null/undefined per usare i default del preset senza override. */
function getWeaponHQ(id,metal,accent,lenPct){
  const base = WEAPON_PRESETS[id] || WEAPON_PRESETS.phaser;
  const preset = Object.assign({}, base, { metal: metal||base.metal, accent: accent||base.accent });
  const key=id+'|'+preset.metal+'|'+preset.accent+'|'+lenPct;
  if(!weaponCache[key]) weaponCache[key]={ frame:buildWeaponFrame(preset,lenPct), holster:buildWeaponHolsterHQ(preset.metal), preset };
  return weaponCache[key];
}

return { HQ_SIZE, shade, mixColor, HELMET_PRESETS, WEAPON_PRESETS, getHelmetHQ, getWeaponHQ };
})();
