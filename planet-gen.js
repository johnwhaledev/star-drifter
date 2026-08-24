/* planet-gen.js — generazione pianeta a griglia tile: genWorldPlanet (da world-pack, con
   garanzie di raggiungibilità) e genPlanet (procedurale + agganci VULKAN-9/PYRA/VERDIA),
   estratto verbatim da index.html nello split del monolite (PLAN_Cantieri.md, piano
   "split monolite + pack equip + strutture", filone A). Nessuna logica cambiata.
   Dipende da rand/TAU/clamp/dist/mulberry32 (core config), heroFrames (sprites.js),
   CRYSTALS_PER_PLANET (world-gen.js), window.ART_PACK.structures (art-pack.js, filone C
   split-monolite: footprint edifici G1-G5) — tutti definiti prima di questo file nel flusso
   originale. Definisce TS/MW/MH/planetCache, usati anche da planet-mode.js più avanti.
   hubCache (usato da genHub in planet-mode.js) resta dichiarato lì, non qui, perché nel
   file originale seguiva subito dopo genPlanet. */
"use strict";

/* ---------- Generazione pianeta (mappa a tile) ---------- */
const TS=34, MW=34, MH=30; // tile size a schermo, dimensioni mappa
const planetCache={};
/* Pianeta da world-pack: griglia a caratteri, centrata su MW×MH, con garanzie di raggiungibilità.
   Legenda: '.' suolo  ','fiore  '#'ostacolo  '~'pericolo  '@'spawn  '*'cristallo  'c'creatura
            'T'prop(albero/misc, placeholder art-pack)  'S'negozio  'A'alieno pacifico (def in w.npcs)
            'P'cancello: barriera che si apre con un segno della storia (def in `w.gates`, letti
               nell'ordine dei marcatori come per 'A'/npcs). Vale come suolo per la raggiungibilità:
               un cristallo dietro un cancello è previsto, non un errore da correggere.
   Strutture (edifici G1-G5, filone C split-monolite): campo SEPARATO `w.structures:[{id,x,y}]`,
   non un carattere della griglia — un edificio ha un footprint multi-cella (2×2/3×2), non 1 cella
   come props/alberi. `id` deve esistere in `ART_PACK.structures` (cellsW/cellsH/img), altrimenti
   ignorato (merge non distruttivo). x,y sono coordinate RAW della griglia (stesso sistema di
   spawn/shop/crystals: offset da ox/oy applicato qui dentro, non dal chiamante). */
function genWorldPlanet(p, w, rr){
  const T=[]; let sx=-1, sy=-1, shop=null;
  const packCry=[], packCrit=[], packNpc=[], props=[], packGate=[];
  const rows = w.grid, gh=rows.length, gw=rows.reduce((m,r)=>Math.max(m,r.length),0);
  const ox=Math.floor((MW-Math.min(gw,MW))/2), oy=Math.floor((MH-Math.min(gh,MH))/2);
  const cx0=Math.max(0,Math.floor((gw-MW)/2)), cy0=Math.max(0,Math.floor((gh-MH)/2));
  for(let y=0;y<MH;y++){ T[y]=[]; for(let x=0;x<MW;x++) T[y][x]=2; } // fuori griglia = montagna
  for(let y=0;y<Math.min(gh,MH);y++)for(let x=0;x<Math.min(gw,MW);x++){
    const ch=(rows[y+cy0]||'')[x+cx0], X=x+ox, Y=y+oy;
    let v = rr()<0.5?0:1;
    if(ch==='#') v=2; else if(ch==='~') v=3; else if(ch===',') v=4;
    else if(ch==='T'){ v=2; props.push({x:X,y:Y,kind:'prop'}); }
    else if(ch==='@'){ sx=X; sy=Y; }
    else if(ch==='*') packCry.push([X,Y]);
    else if(ch==='c') packCrit.push([X,Y]);
    else if(ch==='A') packNpc.push([X,Y]);
    else if(ch==='P'){ v=5; packGate.push([X,Y]); }
    else if(ch==='S'){ if(shop) console.warn('[WORLD-PACK] più negozi in '+p.name+': uso il primo'); else shop={x:X,y:Y}; }
    else if(ch===undefined) v=2;
    T[Y][X]=v;
  }
  if(w.spawn){ sx=clamp(w.spawn[0]+ox,1,MW-2); sy=clamp(w.spawn[1]+oy,1,MH-2); }
  if(sx<0){ // nessuno spawn dichiarato: cerca zona libera vicino al centro
    sx=MW>>1; sy=MH>>1;
    outer: for(let r=0;r<12;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      const X=(MW>>1)+dx, Y=(MH>>1)+dy;
      if(T[Y]&&T[Y][X]<2){ sx=X; sy=Y; break outer; }
    }
  }
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) // radura attorno alla navicella
    if(T[sy+dy]&&T[sy+dy][sx+dx]!==undefined) T[sy+dy][sx+dx]=0;
  if(!shop && w.shop) shop={x:clamp(w.shop[0]+ox,1,MW-2), y:clamp(w.shop[1]+oy,1,MH-2)};
  if(shop){ T[shop.y][shop.x]=0; if(T[shop.y][shop.x-1]!==undefined) T[shop.y][shop.x-1]=0; }
  // strutture (edifici G1-G5, ART_PACK.structures): footprint multi-cella, PRIMA della
  // raggiungibilità così crystal/critter/flood-fill vedono già le celle occupate come ostacolo.
  // Merge non distruttivo: id senza arte nel pack → nessuna struttura (stesso principio di icons/ships).
  const structures=[];
  for(const s of (w.structures||[])){
    const def = window.ART_PACK && window.ART_PACK.structures && window.ART_PACK.structures[s.id];
    if(!def) continue;
    const X=s.x+ox, Y=s.y+oy;
    for(let dy=0;dy<def.cellsH;dy++)for(let dx=0;dx<def.cellsW;dx++)
      if(T[Y+dy]) T[Y+dy][X+dx]=2;
    // `rot` (0/90/180/270) viaggia con la singola struttura: due mulini uguali possono
    // guardare da parti diverse pur condividendo la stessa voce nell'art-pack
    structures.push({id:s.id, x:X, y:Y, cellsW:def.cellsW, cellsH:def.cellsH, rot:s.rot||0});
  }
  // raggiungibilità (stesso flood fill del procedurale)
  const reach=new Set(), q=[[sx,sy]]; reach.add(sx+','+sy);
  while(q.length){
    const [x,y]=q.pop();
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const X=x+dx,Y=y+dy,k=X+','+Y;
      if(X<0||Y<0||X>=MW||Y>=MH||reach.has(k)) continue;
      if(T[Y][X]===2||T[Y][X]===3) continue;
      reach.add(k); q.push([X,Y]);
    }
  }
  const free=[...reach].map(k=>k.split(',').map(Number));
  // cristalli: prima quelli del pack (riposizionati se irraggiungibili), poi riempimento fino a quota
  if(w.crystals) for(const [x,y] of w.crystals) packCry.push([clamp(x+ox,1,MW-2), clamp(y+oy,1,MH-2)]);
  const crystals=[];
  const quota = (p.nCrystals != null) ? p.nCrystals : CRYSTALS_PER_PLANET;  // quanti ne vuole QUESTO corpo
  for(const [x,y] of packCry.slice(0,quota)){
    if(reach.has(x+','+y)){ crystals.push({x,y,got:false,ph:rr()*TAU}); continue; }
    let best=null,bd=1e9;
    for(const [fx,fy] of free){ const d=dist(fx,fy,x,y); if(d<bd){bd=d; best=[fx,fy];} }
    if(best){ console.warn('[WORLD-PACK] cristallo irraggiungibile in '+p.name+' ('+x+','+y+') → spostato'); crystals.push({x:best[0],y:best[1],got:false,ph:rr()*TAU}); }
  }
  const spots=free.filter(([x,y])=>dist(x,y,sx,sy)>7 && !crystals.some(c=>dist(c.x,c.y,x,y)<5));
  while(crystals.length<quota && spots.length){
    const [x,y]=spots.splice(Math.floor(rr()*spots.length),1)[0];
    crystals.push({x,y,got:false,ph:rr()*TAU});
    for(let k=spots.length-1;k>=0;k--) if(dist(spots[k][0],spots[k][1],x,y)<5) spots.splice(k,1);
  }
  // creature: marker 'c' → posizioni esatte; altrimenti w.critters (numero, anche 0); altrimenti 4 come il procedurale
  const critters=[];
  const mk=(x,y)=>critters.push({tx:x,ty:y,px:x,py:y,dir:'down',t:rr()*2,moving:false,fx:x,fy:y,hp:2,maxHp:2,aggro:false,atkCd:0});
  if(packCrit.length){ for(const [x,y] of packCrit) if(reach.has(x+','+y)) mk(x,y); }
  else {
    const n = (typeof w.critters==='number') ? w.critters : 4;
    const cs=free.filter(([x,y])=>dist(x,y,sx,sy)>5);
    for(let i=0;i<n && cs.length;i++){ const [x,y]=cs.splice(Math.floor(rr()*cs.length),1)[0]; mk(x,y); }
  }
  // alieni pacifici: marker 'A' arricchiti in ordine di lettura dalle definizioni in w.npcs
  const defs = w.npcs || [];
  packNpc.forEach(([x,y],i)=>{
    const def = defs[i] || {};
    const cr={tx:x,ty:y,px:x,py:y,dir:'down',t:rr()*2,moving:false,fx:x,fy:y,
      hp:1,maxHp:1,aggro:false,atkCd:0,passive:true,
      kind:def.kind||'humanoid', name:def.name||'ALIENO',
      lines:def.lines||['...','(ti osserva incuriosito)'], color:def.suit||'#b98cff'};
    if(cr.kind==='humanoid')
      cr.sprites=heroFrames(def.suit||'#7a5cff', def.skin||'#9fe0b0', def.hair||'#20242c', def.hairStyle||0);
    critters.push(cr);
  });
  /* cancelli: marcatori 'P' arricchiti in ordine di lettura da w.gates, come per 'A'/npcs.
     `gateAt` è la mappa cella→cancello che usa walkable() (planet-mode.js): senza un segno
     dichiarato il cancello resta chiuso per sempre, e va bene — è un muro voluto. */
  const gates=[], gateAt={};
  const gdefs = w.gates || [];
  packGate.forEach(([x,y],i)=>{
    const def = gdefs[i] || {};
    const g = {x, y, flag:def.flag||null, name:def.name||'PASSAGGIO'};
    gates.push(g); gateAt[x+','+y]=g;
  });
  return {T,sx,sy,crystals,critters,shop,props,structures,gates,gateAt,seed:p.seed,type:'planet'};
}
/* "Giardini" dimostrativi per pianeta (miscellanea CC0, vedi PLAN_Cantieri.md §3bis): id per
   nome pianeta, letti da genPlanet sotto. VULKAN-9 (world-pack) ha già il suo in world-pack.js,
   qui solo i 4 pianeti procedurali di PLANETS (world-gen.js). Ripetizioni volute (più istanze
   della stessa tile) per dare densità senza dover avere decine di id diversi per bioma. */
/* Che cosa cresce su un pianeta generato. **Questa e' solo la lista DI SERIE**: dal 06/08/2026
   ogni pianeta puo' dire la sua nel world-pack —
       WORLD_PACK.planets.VERDIA.garden = ['forest_tree_a','wild_flower']
   e vince sempre su quella qui sotto. `garden: []` significa **niente props**, mappa nuda.
   Nasce da una richiesta precisa dell'utente: «i luoghi hanno degli sprite di dubbio gusto
   iniettati, come gestisco quella parte?». Era l'ultimo contenuto rimasto scritto nel codice. */
const PLANET_GARDEN = {
  /* VUOTO DI PROPOSITO (06/08/2026, decisione dell'utente: «vorrei che tornassimo agli svg, o come
     facevi prima, e non caricare immagini sprite di ambiente nei pianeti»).
     Gli alberi, i cactus, gli abeti e le rocce che vedi sui pianeti sono DISEGNATI DAL CODICE in
     drawTile, uno per bioma: coerenti fra loro per costruzione, perche' nascono dalla stessa mano.
     Le immagini incollate sopra (art-pack) facevano a pugni con quel disegno.
     Il meccanismo resta: se un giorno un pianeta vuole oggetti veri, li chiede nel suo pack —
         WORLD_PACK.planets.NOME.garden = ['forest_rock','wild_flower']
     — oppure li piazzi a mano col world editor, dove decidi tu dove va ognuno. */
};

function genPlanet(p){
  if(planetCache[p.name]) return planetCache[p.name];
  const rr=mulberry32(p.seed);
  if(p.world && p.world.grid){ const data=genWorldPlanet(p,p.world,rr); planetCache[p.name]=data; return data; }
  const T=[]; // 0 erba1, 1 erba2, 2 ostacolo, 3 pericolo(liquido), 4 fiore
  for(let y=0;y<MH;y++){ T[y]=[];
    for(let x=0;x<MW;x++){
      let v = rr()<0.5?0:1;
      if(rr()<0.06) v=4;
      T[y][x]=v;
    }
  }
  // bordo montuoso irregolare
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    const b = Math.min(x,y,MW-1-x,MH-1-y);
    if(b===0 || (b===1&&rr()<0.6) || (b===2&&rr()<0.2)) T[y][x]=2;
  }
  /* ---------- Composizione invece di rumore (06/08/2026) ----------
     Prima gli ostacoli erano sparsi cella per cella all'11%: risultato uniforme, ogni punto della
     mappa valeva come ogni altro e il posto non si leggeva. Richiesta dell'utente ("i mondi a terra"),
     principi in New/IDEE_WORLD.md. Ora la mappa si COMPONE:
       - il punto di atterraggio si sceglie per primo,
       - c'e' UN LUOGO (il `centro`) a mezza mappa che fa da riferimento e da bussola,
       - un SENTIERO sgombro collega i due, cosi' appena scendi hai una direzione,
       - gli ostacoli crescono a BOSCHETTI (fitti al centro, radi ai bordi) invece che a caso,
       - restano RADURE aperte: senza vuoto non si legge il pieno.
     Le pozze di pericolo restano, ma fatte di due cerchi sovrapposti: si leggono come pozze e non
     come macchie tonde. */
  const libero=(x,y)=> x>2 && y>2 && x<MW-3 && y<MH-3;

  // 1. dove atterri: vicino al centro, poi si sgombera attorno
  let sx=MW>>1, sy=MH>>1;
  // 2. il luogo che fa da riferimento: abbastanza lontano da doverci andare, non ai bordi
  const ang=rr()*TAU, raggio=8+rr()*3;
  const centro={ x: Math.round(clamp(sx+Math.cos(ang)*raggio, 4, MW-5)),
                 y: Math.round(clamp(sy+Math.sin(ang)*raggio, 4, MH-5)) };
  // 3. radure: il punto di atterraggio, il luogo, e un paio di spiazzi sparsi
  const radure=[{x:sx,y:sy,r:2.6},{x:centro.x,y:centro.y,r:3.2}];
  for(let i=0;i<2;i++) radure.push({x:4+rr()*(MW-8), y:4+rr()*(MH-8), r:2+rr()*1.5});
  const inRadura=(x,y)=> radure.some(v=>dist(x,y,v.x,v.y)<v.r);

  // pozze di pericolo: due cerchi sovrapposti, e mai addosso al luogo o allo sbarco
  const lakes=3+Math.floor(rr()*3);
  for(let i=0;i<lakes;i++){
    const cx=4+rr()*(MW-8), cy=4+rr()*(MH-8), r=1.6+rr()*2.2;
    const cx2=cx+(rr()-0.5)*3, cy2=cy+(rr()-0.5)*3, r2=r*(0.6+rr()*0.5);
    for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
      if(T[y][x]===2 || inRadura(x,y)) continue;
      if(dist(x,y,cx,cy)<r+rr()*0.5 || dist(x,y,cx2,cy2)<r2) T[y][x]=3;
    }
  }

  // boschetti: densi nel loro cuore, radi ai margini
  const boschi=4+Math.floor(rr()*4);
  for(let i=0;i<boschi;i++){
    const bx=3+rr()*(MW-6), by=3+rr()*(MH-6), br=2+rr()*3;
    for(let y=2;y<MH-2;y++)for(let x=2;x<MW-2;x++){
      if(T[y][x]>=2 || inRadura(x,y)) continue;
      const d=dist(x,y,bx,by);
      if(d<br && rr() < 0.85*(1-d/br)) T[y][x]=2;
    }
  }
  // qualche masso isolato: rompe la regolarita' senza tornare al rumore
  for(let y=2;y<MH-2;y++)for(let x=2;x<MW-2;x++)
    if(T[y][x]<2 && !inRadura(x,y) && rr()<0.02) T[y][x]=2;

  // 4. il sentiero: dallo sbarco al luogo, sgombro. E' quello che ti da' una direzione
  {
    let x=sx, y=sy;
    let guardia=0;
    while((x!==centro.x || y!==centro.y) && guardia++<80){
      if(x!==centro.x && (y===centro.y || rr()<0.5)) x += Math.sign(centro.x-x);
      else y += Math.sign(centro.y-y);
      for(const [ox,oy] of [[0,0],[0,-1]]){
        const X=x+ox, Y=y+oy;
        if(libero(X,Y) && T[Y][X]>=2) T[Y][X]= rr()<0.5?0:1;
      }
    }
  }
  // radura attorno alla navicella e attorno al luogo
  for(const v of radure.slice(0,2))
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
      const X=Math.round(v.x)+dx, Y=Math.round(v.y)+dy;
      if(libero(X,Y) && dist(X,Y,v.x,v.y)<v.r && T[Y][X]>=2) T[Y][X]= rr()<0.5?0:1;
    }
  // raggiungibilità (flood fill)
  const reach=new Set(), q=[[sx,sy]]; reach.add(sx+','+sy);
  while(q.length){
    const [x,y]=q.pop();
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const X=x+dx,Y=y+dy,k=X+','+Y;
      if(X<0||Y<0||X>=MW||Y>=MH||reach.has(k)) continue;
      if(T[Y][X]===2||T[Y][X]===3) continue;
      reach.add(k); q.push([X,Y]);
    }
  }
  // cristalli su tile raggiungibili e lontani
  const spots=[...reach].map(k=>k.split(',').map(Number)).filter(([x,y])=>dist(x,y,sx,sy)>7);
  const crystals=[];
  const quota = (p.nCrystals != null) ? p.nCrystals : CRYSTALS_PER_PLANET;  // quanti ne vuole QUESTO corpo
  for(let i=0;i<quota && spots.length;i++){
    const j=Math.floor(rr()*spots.length);
    const [x,y]=spots.splice(j,1)[0];
    crystals.push({x,y,got:false,ph:rr()*TAU});
    // evita cristalli adiacenti
    for(let k=spots.length-1;k>=0;k--) if(dist(spots[k][0],spots[k][1],x,y)<5) spots.splice(k,1);
  }
  // creaturine che pattugliano
  const critters=[];
  const cs=[...reach].map(k=>k.split(',').map(Number)).filter(([x,y])=>dist(x,y,sx,sy)>5);
  for(let i=0;i<4 && cs.length;i++){
    const [x,y]=cs.splice(Math.floor(rr()*cs.length),1)[0];
    critters.push({tx:x,ty:y,px:x,py:y,dir:'down',t:rr()*2,moving:false,fx:x,fy:y,
      hp:2,maxHp:2,aggro:false,atkCd:0});
  }
  const data={T,sx,sy,crystals,critters,seed:p.seed,type:'planet',geysers:[],obsidian:[]};
  // PYRA: geyser eruttivi e frammenti di ossidiana
  if(p.biome==='magma'){
    const free=[];
    for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){
      if(T[y][x]>=2) continue;
      if(!reach.has(x+','+y)) continue;
      if(Math.abs(x-sx)+Math.abs(y-sy)<3) continue;
      free.push({x,y,nearLava:(T[y][x+1]===3||T[y][x-1]===3||T[y+1][x]===3||T[y-1][x]===3)});
    }
    // geyser: preferisci tile vicino alla lava
    const gPool=free.filter(f=>f.nearLava).concat(free);
    for(let i=0;i<6 && gPool.length;i++){
      const j=Math.floor(rr()*Math.min(gPool.length,20));
      const g=gPool.splice(j,1)[0];
      data.geysers.push({x:g.x,y:g.y,ph:rr()*6});
      const fi=free.indexOf(g); if(fi>=0)free.splice(fi,1);
    }
    // ossidiana: 5 frammenti da 15 PT
    for(let i=0;i<5 && free.length;i++){
      const j=Math.floor(rr()*free.length);
      const o=free.splice(j,1)[0];
      data.obsidian.push({x:o.x,y:o.y,got:false,ph:rr()*TAU});
    }
  }
  // VERDIA: tribù indigena e monoliti dei Precursori
  if(p.biome==='flora'){
    data.monoliths=[];
    const free2=[...reach].map(k=>k.split(',').map(Number))
      .filter(([x,y])=>dist(x,y,sx,sy)>4 && T[y][x]<2);
    const TRIBE=[
      {name:'SHUUR', suit:'#4a7a2a', skin:'#c9a37a', hair:'#2a1a0a', hairStyle:2,
       lines:['Il vento parla di te, straniero del cielo.','I monoliti custodiscono la nostra lingua. Toccali e ascolta.','Le pietre-luce che cerchi crescono dove l\'acqua canta.']},
      {name:'MAWA', suit:'#6a8a3a', skin:'#b98a5a', hair:'#3a2a1a', hairStyle:1,
       lines:['La giungla nutre chi rispetta. Divora chi ruba.','Le bestie temono il tuo bastone di fuoco. Anche noi.']},
      {name:'ONYEH', suit:'#3a6a4a', skin:'#d9b48a', hair:'#1a1a1a', hairStyle:0, gift:true,
       lines:['Io sono la voce degli antenati.','Quando capirai tutte le nostre parole, avrai un dono.','Gli antichi vennero dal cielo, come te. Poi... il silenzio.']}
    ];
    for(const def of TRIBE){
      if(!free2.length) break;
      const [x,y]=free2.splice(Math.floor(rr()*free2.length),1)[0];
      critters.push({tx:x,ty:y,px:x,py:y,dir:'down',t:rr()*2,moving:false,fx:x,fy:y,
        hp:1,maxHp:1,aggro:false,atkCd:0,passive:true,tribal:true,
        kind:'humanoid',name:def.name,lines:def.lines,color:def.suit,gift:def.gift,
        sprites:heroFrames(def.suit,def.skin,def.hair,def.hairStyle)});
    }
    for(let i=0;i<3 && free2.length;i++){
      const [x,y]=free2.splice(Math.floor(rr()*free2.length),1)[0];
      data.monoliths.push({x,y,used:false});
    }
  }
  // "Giardino" dimostrativo di miscellanea (rocce/piante/decor, id in ART_PACK.structures):
  // richiesto dall'utente su OGNI pianeta, stesso schema id->footprint già usato per gli edifici
  // G5 su VULKAN-9 — qui i punti si scelgono dal set di raggiungibilità già calcolato (stessa
  // tecnica di geyser/ossidiana/monoliti sopra), evitando le celle già occupate da cristalli/
  // creature/monoliti/geyser/ossidiana. Nessuna struttura se il pack non ha l'id (non distruttivo).
  // il pack ha l'ultima parola; senza, vale la lista di serie
  const gardenIds = (p.world && Array.isArray(p.world.garden)) ? p.world.garden : PLANET_GARDEN[p.name];
  if(gardenIds && window.ART_PACK && window.ART_PACK.structures){
    const occupied = crystals.concat(critters).concat(data.monoliths||[]).concat(data.geysers||[]).concat(data.obsidian||[]);
    /* Le strutture NON si spargono piu' a caso su tutta la mappa: si raccolgono attorno al
       `centro` — il luogo verso cui porta il sentiero. Cosi' quando atterri vedi qualcosa in
       lontananza e sai dove andare, invece di avere rocce e piante sparpagliate ovunque
       (06/08/2026, principio 1 di IDEE_WORLD.md: "il posto ha un centro"). */
    const spots = [...reach].map(k=>k.split(',').map(Number))
      .filter(([x,y])=>dist(x,y,sx,sy)>6 && T[y][x]<2 && !occupied.some(o=>dist(o.x,o.y,x,y)<1.5))
      .sort((a,b)=> dist(a[0],a[1],centro.x,centro.y) - dist(b[0],b[1],centro.x,centro.y));
    data.structures=[];
    for(const id of gardenIds){
      const def = window.ART_PACK.structures[id];
      if(!def || !spots.length) continue;
      // si pesca fra i posti PIU' VICINI al centro: si forma un gruppo, non una spruzzata
      const j=Math.floor(rr()*Math.min(6, spots.length)), [x,y]=spots.splice(j,1)[0];
      for(let dy=0;dy<def.cellsH;dy++)for(let dx=0;dx<def.cellsW;dx++) if(T[y+dy]) T[y+dy][x+dx]=2;
      data.structures.push({id,x,y,cellsW:def.cellsW,cellsH:def.cellsH});
      for(let k=spots.length-1;k>=0;k--) if(dist(spots[k][0],spots[k][1],x,y)<1.8) spots.splice(k,1);
    }
  }
  planetCache[p.name]=data;
  return data;
}
