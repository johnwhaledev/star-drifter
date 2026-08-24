/* dialogue-ui.js — pannello dialoghi NPC + Omni-Decoder (traduzione glifi progressiva), estratto
   verbatim da index.html nello split del monolite (PLAN_Cantieri.md, piano "split
   monolite + pack equip + strutture", filone A). Nessuna logica cambiata.
   Dipende da TAU (core config, inline prima di questo file), ship.score/audio (definiti prima
   nel flusso originale) — stessa posizione. */
"use strict";

/* ---------- Dialoghi ---------- */
let dlgOpen=false, dlgLines=[], dlgIdx=0;
const dlgPanelEl=document.getElementById('dlgPanel');
const dlgNameEl=document.getElementById('dlgName');
const dlgTextEl=document.getElementById('dlgText');
function drawDlgPortrait(cr){
  const c=document.getElementById('dlgPortrait'), g=c.getContext('2d');
  g.imageSmoothingEnabled=false;
  g.fillStyle='#0a0f1e'; g.fillRect(0,0,22,22);
  if(cr.kind==='humanoid'){
    const spr=cr.sprites.down[0], dh=22, dw=dh*(spr.width/spr.height);
    g.drawImage(spr,0,0,spr.width,spr.height,(22-dw)/2,0,dw,dh);
  } else if(cr.kind==='log'){
    // voce senza corpo (un registro di bordo, una radio): uno schermo, non una creatura
    const col=cr.color||'#7df9ff';
    g.fillStyle='#050a14'; g.fillRect(2,3,18,16);
    g.strokeStyle=col; g.lineWidth=1; g.strokeRect(2.5,3.5,17,15);
    g.fillStyle=col; g.globalAlpha=0.75;
    for(let i=0;i<4;i++) g.fillRect(5, 6+i*3, (i%2?9:12), 1);
    g.globalAlpha=1;
  } else {
    g.fillStyle=cr.color||'#b98cff';
    g.beginPath(); g.ellipse(11,14,8,7,0,0,TAU); g.fill();
    g.fillStyle='#101418'; g.fillRect(7,11,2,3); g.fillRect(13,11,2,3);
  }
}
/* ---------- Omni-Decoder: traduzione progressiva ---------- */
const decoder={ lang:0, MAX:3 };
const GLYPHS='◈⌖✶⟟⋔☌⏃⌰⍾⌇⟒⏚';
function wordHash(w){ let h=0; for(let i=0;i<w.length;i++) h=(h*31+w.charCodeAt(i))>>>0; return h; }
function glyphify(w){
  let out=''; const h=wordHash(w);
  for(let i=0;i<w.length;i++){
    out += /[a-zà-ú]/i.test(w[i]) ? GLYPHS[(h+i*7)%GLYPHS.length] : w[i];
  }
  return out;
}
function translateLine(line){
  if(decoder.lang>=decoder.MAX) return line;
  return line.split(' ').map(w=>{
    const clean=w.replace(/[^a-zà-úA-ZÀ-Ú]/g,'');
    if(!clean) return w;
    return (wordHash(clean.toLowerCase())%decoder.MAX < decoder.lang) ? w : glyphify(w);
  }).join(' ');
}

/* La storia parla PER ULTIMA (06/08/2026). Prima l'evento `talk` veniva emesso all'inizio: il
   dialogo messo da un trigger veniva aperto e subito dopo sovrascritto dalle battute normali del
   personaggio, quindi non si vedeva mai. Trovato provando a montare "Il portello della Vega":
   il trigger di KAELA scritto il 04/08 non aveva mai mostrato niente in partita.
   Ora l'evento esce a schermata gia' pronta, cosi' un dialogo della storia la rimpiazza; e la
   guardia `dlgDaStoria` evita che il dialogo aperto dalla storia riemetta `talk` all'infinito. */
let dlgDaStoria=false;
/* Un momento della storia deve leggersi diverso da una chiacchiera qualunque: pannello con un
   bordo suo (classe 'story', stile in index.html) e, alla chiusura, un attimo di
   dissolvenza invece dello scatto immediato al gameplay (23/08/2026, vedi PLAN_Cantieri §3bis). */
let dlgClosing=false;
function openDialog(cr){
  dlgOpen=true;
  dlgClosing=false;
  dlgLines = cr.tribal ? cr.lines.map(translateLine) : cr.lines;
  if(cr.tribal && decoder.lang>=decoder.MAX && cr.gift && !cr.gifted){
    cr.gifted=true; ship.score+=30;
    dlgLines=dlgLines.concat(['(Ti porge cristalli lavorati dagli antenati: +30 PT)']);
  }
  dlgIdx=0;
  dlgNameEl.textContent = (cr.tribal && decoder.lang<1) ? glyphify(cr.name) : cr.name;
  dlgTextEl.textContent=dlgLines[0];
  drawDlgPortrait(cr);
  dlgPanelEl.classList.remove('hidden','closing');
  dlgPanelEl.classList.toggle('story', !!cr.fromStory);
  audio.pickup();
  if(window.STORY && !dlgDaStoria){
    dlgDaStoria=true;
    try { STORY.fire('talk',{npc:cr.name}); } finally { dlgDaStoria=false; }
  }
}
function advanceDialog(){
  if(dlgClosing) return;
  dlgIdx++;
  if(dlgIdx<dlgLines.length){ dlgTextEl.textContent=dlgLines[dlgIdx]; return; }
  if(dlgPanelEl.classList.contains('story')){
    dlgClosing=true;
    dlgPanelEl.classList.add('closing');
    setTimeout(()=>{
      dlgOpen=false; dlgClosing=false;
      dlgPanelEl.classList.add('hidden'); dlgPanelEl.classList.remove('closing','story');
    }, 1400);
  } else {
    dlgOpen=false; dlgPanelEl.classList.add('hidden');
  }
}
dlgPanelEl.addEventListener('click', e=>{ e.stopPropagation(); audio.unlock(); advanceDialog(); });
dlgPanelEl.addEventListener('touchstart', e=>{ e.preventDefault(); e.stopPropagation(); audio.unlock(); advanceDialog(); },{passive:false});
