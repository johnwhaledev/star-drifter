/* planet-mode.js — hub stazione (genHub+BASE_NPCS), stato/movimento eroe su pianeta
   (enterPlanet/walkable/stickDir/chaseDir/updPlanet), rendering pianeta (drawTile/
   drawPlanetMode/drawPlanetHUD). Estratto verbatim da index.html nello split del
   monolite (PLAN_Cantieri.md, piano "split monolite + pack equip + strutture", filone A).
   Nessuna logica cambiata. Ultimo pezzo del filone A: dopo questo file lo script principale
   resta con stato di gioco, transizioni/title/win, loop.
   Dipende da mulberry32/clamp/dist/rand/TAU/ctx/W/H/keys/stick/take/say (core config, stato
   di gioco), FORGE (forge-pack.js), heroFrames/HERO/SHIPSPR/CRYSTAL/structureSprite (sprites.js),
   loadout (equip-db.js), BIOMES/PLANETS/TOTAL_CRYSTALS/getWeather (world-gen.js — meteo estremo,
   PLAN_Cantieri.md §3bis: enterPlanet(p,t) ora prende anche il tempo di gioco), CRYSTALS_PER_PLANET/
   genPlanet/MW/MH/TS/planetCache (planet-gen.js), window.ART_PACK.structures (art-pack.js,
   miscellanea/edifici — genHub piazza casse/pod stazione con lo stesso schema), puff/
   updParticles/drawParticles/killCritter/damageHero/gbullets/ship (space-combat.js), decoder/
   dlgOpen/advanceDialog/openDialog (dialogue-ui.js), shopOpen/shopPanelEl/openShop (shop.js) —
   tutti definiti prima di questo file nel flusso originale. */
"use strict";

/* Una mappa per stazione, non una sola: dal 05/08/2026 il pack può aggiungere stazioni
   (WORLD_PACK.planets con type:'hub'), e con una cache unica avrebbero tutte l'interno
   della Kepler. Chiave = nome della stazione. */
const hubCache={};
const BASE_NPCS=[
  {kind:'humanoid', name:'ZYX-9', suit:'#7a3bb8', skin:'#8dfd6a', hair:'#2a1a3a',
   lines:['Bzzt... un terrestre! Non se ne vedevano da cicli.','La stazione è tranquilla. Troppo tranquilla, dicono i vecchi.','Se cerchi provviste, il mercante non ti frega... quasi mai.']},
  {kind:'humanoid', name:'KAELA', suit:'#b88a2a', skin:'#e8b4f0', hair:'#ffffff', hairStyle:1,
   lines:['Benvenuto sulla Kepler, viandante.','Ho visto i pianeti là fuori. VERDIA è dolce. PYRA... porta un kit medico.','I cristalli che raccogli? Valgono più di quanto pensi.']},
  {kind:'slime', name:'BLOB', suit:'#b98cff',
   lines:['...blub?','*il piccolo alieno gorgoglia amichevolmente*','...blub blub! ♪']}
];
function genHub(p){
  if(hubCache[p.name]) return hubCache[p.name];
  const rr=mulberry32(p.seed);
  const T=[];
  for(let y=0;y<MH;y++){ T[y]=[];
    for(let x=0;x<MW;x++){
      let v = rr()<0.5?0:1;
      if(rr()<0.03) v=4; // luce console
      T[y][x]=v;
    }
  }
  // pareti perimetrali della stazione
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    const b=Math.min(x,y,MW-1-x,MH-1-y);
    if(b===0 || (b===1 && rr()<0.3)) T[y][x]=2;
  }
  // qualche pilastro/cassa interna
  for(let i=0;i<9;i++){
    const px=4+Math.floor(rr()*(MW-8)), py=4+Math.floor(rr()*(MH-8));
    T[py][px]=2;
  }
  // piazzola d'attracco centrale
  const sx=MW>>1, sy=MH>>1;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) if(T[sy+dy]) T[sy+dy][sx+dx]=0;
  // banco del mercante, non lontano dalla piazzola
  const shop={x:clamp(sx+7,3,MW-4), y:sy};
  T[shop.y][shop.x]=0; if(T[shop.y][shop.x-1]!==undefined) T[shop.y][shop.x-1]=0;
  // alieni che passeggiano in pace, nessuna ostilità
  const NPC_DEFS = BASE_NPCS.concat((FORGE&&FORGE.npcs)||[]);
  const critters=[];
  const spots=[];
  for(let y=2;y<MH-2;y++)for(let x=2;x<MW-2;x++)
    if(T[y][x]<2 && dist(x,y,sx,sy)>3 && dist(x,y,shop.x,shop.y)>1.5) spots.push([x,y]);
  for(let i=0;i<NPC_DEFS.length && spots.length;i++){
    const def=NPC_DEFS[i];
    const [x,y]=spots.splice(Math.floor(rr()*spots.length),1)[0];
    const cr={tx:x,ty:y,px:x,py:y,dir:'down',t:rr()*2,moving:false,fx:x,fy:y,
      hp:1,maxHp:1,aggro:false,atkCd:0,passive:true,
      kind:def.kind,name:def.name,lines:def.lines,color:def.suit};
    if(def.kind==='humanoid') cr.sprites=heroFrames(def.suit,def.skin,def.hair,def.hairStyle||0);
    critters.push(cr);
  }
  /* Niente casse/pod incollati alla stazione (23/08/2026, richiesta dell'utente: «nelle stazioni
     abbiamo ancora degli sprite»). Come sui pianeti, quello che si vede alla Kepler è disegnato dal
     codice: pavimento, negozio, alieni. Le immagini restano disponibili per chi le piazza a mano. */
  const structures=[];
  const data={T,sx,sy,crystals:[],critters,shop,structures,seed:p.seed,type:'hub'};
  hubCache[p.name]=data;
  return data;
}

/* ---------- Creature aliene (06/08/2026) ----------
   Prima erano una pallina che pulsava con due quadratini per occhi: leggevano come "blob", non
   come bestie. Richiesta dell'utente: "rendile piu' animalesche aliene".
   Non sono cinque bestie disegnate a mano: e' UNA bestia parametrica (zampe, coda, cresta, occhi,
   colori) i cui parametri vengono dal BIOMA — cosi' ogni mondo ha la sua specie — piu' una
   variazione per individuo presa dalla sua posizione, che resta stabile perche' deterministica.
   Si muovono: le zampe alternano il passo, il corpo respira da fermo, la coda ondeggia, e quando
   ti hanno visto si abbassano verso di te e l'occhio si accende. */
const SPECIE = {
  flora:    { zampe:6, coda:0, cresta:3, occhi:2, corpo:[13,9],  base:'#7bd15a', scuro:'#2f6b28', occhio:'#ffe066' },
  sabbia:   { zampe:8, coda:1, cresta:0, occhi:2, corpo:[12,7],   base:'#d8a44a', scuro:'#7a5418', occhio:'#fff0a0' },
  cryo:     { zampe:4, coda:0, cresta:5, occhi:3, corpo:[12,10],   base:'#9fd8e8', scuro:'#3c6f85', occhio:'#eaffff' },
  magma:    { zampe:6, coda:1, cresta:4, occhi:1, corpo:[13,9],  base:'#e0623a', scuro:'#5e1d10', occhio:'#ffd06a' },
  stazione: { zampe:0, coda:2, cresta:0, occhi:3, corpo:[11,10],   base:'#a98cff', scuro:'#3c2a6b', occhio:'#d9ffff' },
  tossico:  { zampe:6, coda:1, cresta:2, occhi:2, corpo:[13,9],  base:'#a6d84a', scuro:'#3d5a12', occhio:'#e8ff7a' }
};
function drawCritter(ctx, cr, cx, cy, t){
  const S = SPECIE[currentPlanet.biome] || SPECIE.flora;
  const rr = mulberry32((cr.tx*73 + cr.ty*131 + 7)|0);
  const scala = 0.85 + rr()*0.3;                 // ogni bestia e' un po' diversa
  const passo = cr.moving ? Math.sin(t*14)*1 : 0;
  const respiro = cr.moving ? 0 : Math.sin(t*3 + cr.tx)*0.6;
  const x = cx + TS/2, y = cy + TS - 11 + respiro;
  const w = S.corpo[0]*scala, h = S.corpo[1]*scala;
  const versoDx = (cr.dir==='left') ? -1 : 1;
  const chino = cr.aggro ? 1.6 : 0;              // quando ti ha visto si abbassa
  const base = cr.passive ? (cr.color||S.base) : S.base;
  const scuro = cr.passive ? (cr.color||S.scuro) : S.scuro;

  ctx.save();
  ctx.translate(x, y + chino);
  ctx.scale(versoDx, 1);

  // zampe: si alternano a coppie, cosi' il passo si legge
  ctx.strokeStyle = 'rgba(8,12,20,0.9)'; ctx.lineWidth = 2.2; ctx.lineCap='round';
  for(let i=0;i<S.zampe;i++){
    const lato = i%2 ? 1 : -1;
    const q = Math.floor(i/2);
    const px = (-w*0.55 + q*(w*1.1/Math.max(1,S.zampe/2-1)));
    const sfasa = (i%2 ? passo : -passo);
    /* le zampe partono dal FIANCO e si divaricano in fuori: sotto il corpo non si vedevano e
       la bestia sembrava una rana. Il gomito le fa leggere come artropode. */
    const fuori = (px < 0 ? -1 : 1);
    const gx = px + fuori*3, gy = -1 + h*0.35;
    ctx.beginPath();
    ctx.moveTo(px*0.8, -1);
    ctx.lineTo(gx + sfasa*0.5, gy);
    ctx.lineTo(gx + fuori*2.5 + sfasa*1.6, h*1.15 + Math.abs(sfasa)*0.5);
    ctx.stroke();
  }
  // coda
  for(let i=0;i<S.coda;i++){
    const on = Math.sin(t*4 + i*1.7 + cr.ty)*3;
    ctx.beginPath(); ctx.moveTo(-w*0.7, -1);
    ctx.quadraticCurveTo(-w*1.2, -3+on, -w*1.5, -7+on);
    ctx.stroke();
  }
  // corpo, con un contorno scuro: senza, su un prato fitto la bestia sparisce nel fondo
  ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, 0, TAU);
  ctx.fillStyle = base; ctx.fill();
  ctx.strokeStyle = 'rgba(8,12,20,0.85)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = scuro; ctx.globalAlpha = 0.45;
  ctx.beginPath(); ctx.ellipse(0, h*0.35, w*0.85, h*0.45, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  // cresta / spine
  ctx.fillStyle = scuro;
  for(let i=0;i<S.cresta;i++){
    const px = -w*0.5 + i*(w/Math.max(1,S.cresta-1));
    const alt = 3 + rr()*3;
    ctx.beginPath();
    ctx.moveTo(px-1.5, -h*0.7); ctx.lineTo(px, -h*0.7-alt); ctx.lineTo(px+1.5, -h*0.7);
    ctx.closePath(); ctx.fill();
  }
  // occhi: si accendono quando ti ha visto
  const acceso = cr.aggro ? 1 : 0.75;
  ctx.fillStyle = cr.aggro ? '#ff5c74' : S.occhio;
  ctx.globalAlpha = acceso;
  for(let i=0;i<S.occhi;i++){
    const ox = (S.occhi===1) ? 0 : (-w*0.35 + i*(w*0.7/(S.occhi-1)));
    const chiuso = (!cr.aggro && (Math.sin(t*0.9 + cr.tx*2) > 0.97));   // ogni tanto sbatte
    ctx.beginPath(); ctx.ellipse(ox + w*0.15, -h*0.25, 1.9, chiuso ? 0.4 : 2.1, 0, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ---------- Modalità pianeta ---------- */
const hero={tx:0,ty:0,px:0,py:0,dir:'down',frame:0,moving:false,fx:0,fy:0,mt:0,cool:0,
  maxHp:loadout.suit.maxHP, hp:loadout.suit.maxHP, fireCd:0};
let planetMap=null;
function enterPlanet(p,t){
  currentPlanet=p;
  if(window.STORY){ STORY.fire('land',{planet:p.name}); STORY.save(); }
  planetMap = p.type==='hub' ? genHub(p) : genPlanet(p);
  hero.tx=hero.fx=planetMap.sx; hero.ty=hero.fy=planetMap.sy;
  hero.px=hero.tx; hero.py=hero.ty; hero.dir='down'; hero.moving=false;
  hero.weatherT=0;
  hero.heatT=0;
  shopOpen=false; shopPanelEl.classList.add('hidden');
  state='planet';
  const wx = p.type!=='hub' ? getWeather(p,t||0) : {state:'clear'};
  if(wx.state==='extreme') say('⚠ '+wx.name+' — sei arrivato nel pieno della tempesta!',3);
  else if(p.type==='hub') say('BENVENUTO ALLA '+p.name+' — visita il mercato',3);
  else if(p.nCrystals>0) say('BENVENUTO SU '+p.name+' — trova '+(p.nCrystals-p.done)+' cristalli',3);
  else say('BENVENUTO SU '+p.name,3);
}
function walkable(x,y){
  if(x<0||y<0||x>=MW||y>=MH) return false;
  const t=planetMap.T[y][x];
  if(t===2||t===3) return false;
  // cancello (marcatore 'P' del world-pack): passa solo se la storia ha messo il suo segno
  if(t===5){
    const g = planetMap.gateAt && planetMap.gateAt[x+','+y];
    if(g && !segno(g.flag)) return false;
  }
  if(x===planetMap.sx&&y===planetMap.sy) return true;
  return true;
}
const DIRV={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
function stickDir(){
  if(!stick.active || stick.mag<=0.35) return null;
  const a=stick.angle;
  if(a>-Math.PI/4 && a<=Math.PI/4) return 'right';
  if(a>Math.PI/4 && a<=3*Math.PI/4) return 'down';
  if(a>3*Math.PI/4 || a<=-3*Math.PI/4) return 'left';
  return 'up';
}
function chaseDir(cr){
  const dx=hero.tx-cr.tx, dy=hero.ty-cr.ty;
  if(dx===0 && dy===0) return null;
  const order = Math.abs(dx)>=Math.abs(dy)
    ? [dx>0?'right':'left', dy>0?'down':(dy<0?'up':null)]
    : [dy>0?'down':'up', dx>0?'right':(dx<0?'left':null)];
  for(const d of order){
    if(!d) continue;
    const [ddx,ddy]=DIRV[d], nx=cr.tx+ddx, ny=cr.ty+ddy;
    if(walkable(nx,ny) && !(nx===planetMap.sx&&ny===planetMap.sy) && !(nx===hero.tx&&ny===hero.ty)) return d;
  }
  return null;
}
function updPlanet(dt,t){
  if(dlgOpen){ if(take('e')) advanceDialog(); return; }
  if(shopOpen) return;
  const MOVE=0.16/loadout.suit.moveMul; // secondi per tile
  if(!hero.moving){
    let d=null;
    if(keys['ArrowUp'])d='up'; else if(keys['ArrowDown'])d='down';
    else if(keys['ArrowLeft'])d='left'; else if(keys['ArrowRight'])d='right';
    else d=stickDir();
    if(d){
      hero.dir=d;
      const [dx,dy]=DIRV[d], nx=hero.tx+dx, ny=hero.ty+dy;
      if(walkable(nx,ny)){
        hero.moving=true; hero.mt=0; hero.fx=nx; hero.fy=ny; audio.step();
      } else if(hero.cool<=0){
        audio.bump(); hero.cool=0.25;
        // sbattere contro un cancello chiuso dice almeno COSA blocca, non solo "bump"
        const g = planetMap.gateAt && planetMap.gateAt[nx+','+ny];
        if(g && !segno(g.flag)) say('⛔ '+g.name+' — chiuso',1.6);
      }
    }
  } else {
    hero.mt+=dt/MOVE;
    if(hero.mt>=1){
      hero.tx=hero.fx; hero.ty=hero.fy; hero.px=hero.tx; hero.py=hero.ty; hero.moving=false;
      // raccolta cristalli
      for(const c of planetMap.crystals){
        if(!c.got && c.x===hero.tx && c.y===hero.ty){
          c.got=true; currentPlanet.done++;
          // quota e totale vengono dai corpi (world-gen.js), non più da "4 pianeti × 3"
          audio.pickup(); say('CRISTALLO! '+currentPlanet.done+'/'+currentPlanet.nCrystals,1.6);
          const got=LUOGHI.reduce((s,p)=>s+(p.done||0),0);
          if(window.STORY) STORY.fire('crystal',{planet:currentPlanet.name, planetDone:currentPlanet.done, total:got});
          if(currentPlanet.done>=currentPlanet.nCrystals){
            say(currentPlanet.name+' COMPLETO! Torna alla navicella',2.5);
            if(window.STORY) STORY.fire('planetComplete',{planet:currentPlanet.name});
          }
          // l'evento esce PRIMA del cambio di stato: un pack puo' reagire al finale (SPEC §4)
          if(got>=TOTAL_CRYSTALS){ if(window.STORY) STORY.fire('allCrystals',{}); state='win'; audio.takeoff(); }
        }
      }
      // raccolta ossidiana (PYRA)
      for(const o of (planetMap.obsidian||[])){
        if(!o.got && o.x===hero.tx && o.y===hero.ty){
          o.got=true; ship.score+=15;
          audio.pickup(); say('OSSIDIANA! +15 PT',1.4);
        }
      }
    } else {
      hero.px=lerp(hero.tx,hero.fx,hero.mt);
      hero.py=lerp(hero.ty,hero.fy,hero.mt);
    }
  }
  // calore ambientale (PYRA senza tuta ignifuga)
  if(currentPlanet.biome==='magma' && !loadout.suit.heatProof){
    let rate=1;
    const hx=hero.tx, hy=hero.ty, T=planetMap.T;
    if((T[hy]&&(T[hy][hx+1]===3||T[hy][hx-1]===3)) ||
       (T[hy+1]&&T[hy+1][hx]===3) || (T[hy-1]&&T[hy-1][hx]===3)) rate=3;
    hero.heatT=(hero.heatT||0)+dt*rate;
    if(hero.heatT>=5){
      hero.heatT=0;
      damageHero(1,'CALORE ESTREMO — serve la Tuta Ignifuga');
    }
  } else hero.heatT=0;
  // meteo estremo (28/07/2026, PLAN_Cantieri.md §3bis): danno periodico indipendente dalla
  // tuta indossata — "condizioni estreme" volutamente senza scappatoia di equip, a differenza
  // del calore PYRA sopra (che la tuta ignifuga annulla). Stesso pattern di accumulo/scarico.
  if(currentPlanet.type!=='hub' && getWeather(currentPlanet,t).state==='extreme'){
    hero.weatherT=(hero.weatherT||0)+dt;
    if(hero.weatherT>=4){
      hero.weatherT=0;
      damageHero(1,getWeather(currentPlanet,t).name+' — torna alla navicella!');
    }
  } else hero.weatherT=0;
  // geyser eruttivi
  for(const g of (planetMap.geysers||[])){
    const ph=(t+g.ph)%6;
    if(ph>=5.2 && ph<5.8){
      const dx=Math.abs(hero.tx-g.x), dy=Math.abs(hero.ty-g.y);
      if(dx+dy<=1) damageHero(1,'GEYSER DI LAVA!');
      if(Math.random()<0.3) puff((g.x+0.5)*TS,(g.y+0.2)*TS,3,'#ff8a3a',90,0.4);
    }
  }
  if(hero.cool>0)hero.cool-=dt;
  if(hero.inv>0)hero.inv-=dt;
  if(hero.fireCd>0)hero.fireCd-=dt;
  hero.frame = hero.moving ? Math.floor(t*8)%2 : 0;

  // sparo (Phaser)
  if(keys['Space'] && hero.fireCd<=0){
    const GW=loadout.groundWeapon;
    hero.fireCd=GW.fireRate*((GW.id==='phaser'&&AMMO_ITEM.bought)?AMMO_FIRE_MUL:1);
    const [ddx,ddy]=DIRV[hero.dir];
    gbullets.push({x:(hero.px+0.5)*TS,y:(hero.py+0.5)*TS,vx:ddx*GW.bulletSpeed,vy:ddy*GW.bulletSpeed,t:0.5,dmg:GW.dmg});
    audio.laser();
  }
  // proiettili a terra
  for(let i=gbullets.length-1;i>=0;i--){
    const b=gbullets[i]; b.t-=dt; b.x+=b.vx*dt; b.y+=b.vy*dt;
    let hit=false;
    for(const cr of planetMap.critters){
      if(cr.passive) continue;
      if(dist(b.x,b.y,(cr.px+0.5)*TS,(cr.py+0.5)*TS)<15){
        cr.hp-=(b.dmg||1); hit=true;
        if(cr.hp<=0) killCritter(cr);
        else { puff(b.x,b.y,4,'#ff8bd0',60,0.3); audio.hit(); }
        break;
      }
    }
    if(hit||b.t<=0) gbullets.splice(i,1);
  }
  updParticles(dt);

  // creaturine
  for(const cr of planetMap.critters){
    const mdist=Math.abs(hero.tx-cr.tx)+Math.abs(hero.ty-cr.ty);
    cr.aggro = !cr.passive && mdist<=3;
    if(cr.atkCd>0) cr.atkCd-=dt;
    if(!cr.moving){
      if(cr.aggro){
        const d=chaseDir(cr);
        if(d){ const [ddx,ddy]=DIRV[d]; cr.dir=d; cr.moving=true; cr.mt=0; cr.fx=cr.tx+ddx; cr.fy=cr.ty+ddy; }
      } else {
        cr.t-=dt;
        if(cr.t<=0){
          cr.t=0.8+rand()*1.6;
          const dirs=['up','down','left','right'];
          const d=dirs[Math.floor(rand()*4)];
          const [dx,dy]=DIRV[d], nx=cr.tx+dx, ny=cr.ty+dy;
          cr.dir=d;
          if(walkable(nx,ny) && !(nx===planetMap.sx&&ny===planetMap.sy)){
            cr.moving=true; cr.mt=0; cr.fx=nx; cr.fy=ny;
          }
        }
      }
    } else {
      cr.mt=(cr.mt||0)+dt/(cr.aggro?0.28:0.4);
      if(cr.mt>=1){ cr.tx=cr.fx; cr.ty=cr.fy; cr.px=cr.tx; cr.py=cr.ty; cr.moving=false; }
      else { cr.px=lerp(cr.tx,cr.fx,cr.mt); cr.py=lerp(cr.ty,cr.fy,cr.mt); }
    }
    if(cr.px===undefined){cr.px=cr.tx;cr.py=cr.ty;}
    // contatto con l'eroe
    if(!cr.passive && hero.inv<=0 && cr.atkCd<=0 && dist(hero.px,hero.py,cr.px,cr.py)<0.62){
      damageHero(1,'colpito!'); cr.atkCd=1.0;
    }
  }
  if(msgT>0)msgT-=dt;
  // decollo
  if(hero.tx===planetMap.sx && hero.ty===planetMap.sy && take('e')){
    trans={t:0,dur:1.2,to:'space',planet:currentPlanet};
    if(window.STORY){ STORY.fire('takeoff',{planet:currentPlanet.name}); STORY.save(); }
    state='takeoff'; audio.takeoff();
  } else if(currentPlanet.type==='hub' && planetMap.shop &&
      Math.abs(hero.tx-planetMap.shop.x)+Math.abs(hero.ty-planetMap.shop.y)<=1 && take('e')){
    openShop();
  } else if(take('e')){
    // scansiona un monolite adiacente (Omni-Decoder)
    let acted=false;
    for(const m of (planetMap.monoliths||[])){
      if(!m.used && Math.abs(hero.tx-m.x)+Math.abs(hero.ty-m.y)<=1){
        m.used=true; decoder.lang=Math.min(decoder.MAX,decoder.lang+1);
        if(window.STORY) STORY.fire('monolith',{planet:currentPlanet.name, decoderLevel:decoder.lang});
        audio.pickup(); puff((m.x+0.5)*TS,(m.y+0.3)*TS,10,'#8dfd6a',100,0.6);
        say(decoder.lang>=decoder.MAX ? 'OMNI-DECODER COMPLETO — ora comprendi la tribù!'
            : 'FRAMMENTO LINGUISTICO '+decoder.lang+'/'+decoder.MAX+' acquisito', 2.4);
        acted=true; break;
      }
    }
    // parla con un NPC pacifico adiacente
    if(!acted) for(const cr of planetMap.critters){
      if(cr.passive && cr.lines && Math.abs(hero.tx-cr.tx)+Math.abs(hero.ty-cr.ty)<=1){
        // l'NPC si gira verso l'eroe
        if(cr.tx<hero.tx) cr.dir='right'; else if(cr.tx>hero.tx) cr.dir='left';
        else if(cr.ty<hero.ty) cr.dir='down'; else cr.dir='up';
        cr.moving=false;
        openDialog(cr); break;
      }
    }
  }
}

/* ---------- Rendering pianeta ---------- */
function drawTile(bioma,tt,x,y,t,seedv){
  const B=BIOMES[bioma];
  /* I COLORI vengono dal bioma, le FORME (albero/cactus/abete/pannello/roccia) da `look`
     (06/08/2026, fase B3): così un bioma nuovo scritto nel pack — un pianeta tossico, per dire —
     sceglie a quale famiglia di sagome assomigliare invece di finire per forza fra le rocce
     vulcaniche. Senza `look` vale il nome del bioma: i 5 di serie si comportano come sempre. */
  const b=(B && B.look) || bioma;
  if(tt===3){ // liquido animato
    ctx.fillStyle=B.haz; ctx.fillRect(x,y,TS,TS);
    ctx.fillStyle='rgba(255,255,255,0.25)';
    const w=Math.sin(t*2+seedv)*3;
    ctx.fillRect(x+6+w,y+8,8,2); ctx.fillRect(x+18-w,y+22,8,2);
    if(b==='magma'){ ctx.fillStyle='rgba(255,220,120,0.5)';
      ctx.fillRect(x+10-w,y+14,5,3); }
    return;
  }
  ctx.fillStyle = (tt===1)?B.g2:B.g1;
  ctx.fillRect(x,y,TS,TS);
  // texture puntinata deterministica
  const rr=mulberry32(seedv);
  ctx.fillStyle='rgba(0,0,0,0.10)';
  for(let i=0;i<3;i++) ctx.fillRect(x+2+rr()*(TS-6), y+2+rr()*(TS-6), 2,2);
  if(tt===4){ // decorazione: fiore/sasso/fiocco/brace
    const cx=x+TS/2, cy=y+TS/2;
    if(b==='flora'){ ctx.fillStyle='#ffd9f0'; ctx.fillRect(cx-3,cy-1,2,2); ctx.fillRect(cx+1,cy-1,2,2);
      ctx.fillRect(cx-1,cy-3,2,2); ctx.fillRect(cx-1,cy+1,2,2); ctx.fillStyle='#ffcf5c'; ctx.fillRect(cx-1,cy-1,2,2); }
    else if(b==='sabbia'){ ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(cx-2,cy,5,3); }
    else if(b==='cryo'){ ctx.fillStyle='#ffffff'; ctx.fillRect(cx-1,cy-1,2,2); ctx.fillRect(cx-4,cy+2,2,2); ctx.fillRect(cx+2,cy+3,2,2); }
    else if(b==='stazione'){ const gl=0.5+0.5*Math.sin(t*4+seedv); ctx.fillStyle='rgba(125,249,255,'+gl+')'; ctx.fillRect(cx-2,cy-1,4,2); }
    else { const gl=0.4+0.4*Math.sin(t*3+seedv); ctx.fillStyle='rgba(255,120,50,'+gl+')'; ctx.fillRect(cx-2,cy-2,4,4); }
  }
  if(tt===2){ // ostacolo
    if(b==='flora'){ // albero
      ctx.fillStyle='#6b4a2a'; ctx.fillRect(x+13,y+20,8,10);
      ctx.fillStyle='#1b5e38'; ctx.beginPath(); ctx.arc(x+17,y+13,11,0,TAU); ctx.fill();
      ctx.fillStyle='#2c8a52'; ctx.beginPath(); ctx.arc(x+14,y+10,7,0,TAU); ctx.fill();
    } else if(b==='sabbia'){ // cactus
      ctx.fillStyle='#3f7d3a'; ctx.fillRect(x+14,y+6,7,22);
      ctx.fillRect(x+7,y+10,7,4); ctx.fillRect(x+7,y+10,3,8);
      ctx.fillRect(x+21,y+14,7,4); ctx.fillRect(x+25,y+8,3,10);
      ctx.fillStyle='#5aa353'; ctx.fillRect(x+15,y+7,2,20);
    } else if(b==='cryo'){ // abete innevato
      ctx.fillStyle='#1e5a4a';
      ctx.beginPath(); ctx.moveTo(x+17,y+3); ctx.lineTo(x+28,y+26); ctx.lineTo(x+6,y+26); ctx.fill();
      ctx.fillStyle='#eaf6ff';
      ctx.beginPath(); ctx.moveTo(x+17,y+3); ctx.lineTo(x+23,y+14); ctx.lineTo(x+11,y+14); ctx.fill();
      ctx.fillStyle='#5a3a22'; ctx.fillRect(x+15,y+26,4,5);
    } else if(b==='stazione'){ // pannello/cassa metallica
      ctx.fillStyle='#1c2740'; ctx.fillRect(x+4,y+4,TS-8,TS-8);
      ctx.strokeStyle='#3f5a8a'; ctx.lineWidth=2; ctx.strokeRect(x+4,y+4,TS-8,TS-8);
      const gl=0.4+0.35*Math.sin(t*3+seedv);
      ctx.fillStyle='rgba(125,249,255,'+gl+')'; ctx.fillRect(x+TS/2-2,y+TS/2-2,4,4);
    } else { // roccia vulcanica
      ctx.fillStyle='#241a1a'; ctx.beginPath();
      ctx.moveTo(x+6,y+27); ctx.lineTo(x+12,y+8); ctx.lineTo(x+22,y+12); ctx.lineTo(x+29,y+27); ctx.fill();
      ctx.fillStyle='#4a3434'; ctx.fillRect(x+13,y+12,6,4);
      const gl=0.3+0.3*Math.sin(t*4+seedv);
      ctx.fillStyle='rgba(255,110,42,'+gl+')'; ctx.fillRect(x+16,y+20,4,2);
    }
  }
}
function drawPlanetMode(t){
  const B=BIOMES[currentPlanet.biome];
  ctx.fillStyle=B.sky; ctx.fillRect(0,0,W,H);
  const pkx=(rand()-0.5)*shake, pky=(rand()-0.5)*shake;
  ctx.save(); ctx.translate(pkx,pky);
  // camera
  let camx=hero.px*TS - W/2 + TS/2, camy=hero.py*TS - H/2 + TS/2;
  camx=clamp(camx, -40, MW*TS-W+40); camy=clamp(camy, -60, MH*TS-H+40);
  ctx.save(); ctx.translate(-camx,-camy);
  const x0=Math.max(0,Math.floor(camx/TS)-1), x1=Math.min(MW-1,Math.ceil((camx+W)/TS)+1);
  const y0=Math.max(0,Math.floor(camy/TS)-1), y1=Math.min(MH-1,Math.ceil((camy+H)/TS)+1);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)
    drawTile(currentPlanet.biome, planetMap.T[y][x], x*TS, y*TS, t, planetMap.seed*31+y*MW+x);
  // cancelli chiusi: barriera di energia sopra il pavimento (aperti = non si disegna niente)
  for(const g of (planetMap.gates||[])){
    if(segno(g.flag)) continue;
    const gx=g.x*TS, gy=g.y*TS, pul=0.55+0.35*Math.sin(t*4+g.x+g.y);
    ctx.fillStyle='rgba(255,92,116,'+(0.18*pul)+')'; ctx.fillRect(gx,gy,TS,TS);
    ctx.strokeStyle='rgba(255,92,116,'+(0.5+0.4*pul)+')'; ctx.lineWidth=2;
    ctx.strokeRect(gx+2,gy+2,TS-4,TS-4);
    ctx.fillStyle='rgba(255,180,190,'+(0.35+0.35*pul)+')';
    for(let i=0;i<3;i++) ctx.fillRect(gx+5, gy+7+i*9+Math.sin(t*3+i)*1.5, TS-10, 2);
  }
  // strutture (edifici G1-G5, filone C split-monolite): ancorate al bordo inferiore del
  // footprint, come l'ombra della nave atterrata sotto — l'immagine può salire più in alto del
  // footprint (un edificio si erge sopra la sua base, stessa idea degli alberi che sforano la
  // singola cella in drawTile). Nessuna struttura se il pianeta non ne definisce (world-pack) o
  // se lo sprite non è ancora decodificato (imgSprite è async, salta un frame senza errori).
  for(const st of (planetMap.structures||[])){
    const fw=st.cellsW*TS, fh=st.cellsH*TS;
    const bx=st.x*TS, by=st.y*TS, bottom=by+fh;
    const parti=structureParts(st.id);
    if(parti){
      /* Componibile: ogni parte al suo posto nella griglia della struttura, ruotata attorno al
         proprio centro (fase B2). L'ombra e l'ancoraggio restano quelli della struttura intera:
         il mulino sta per terra, la pala gira in alto. */
      ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath();
      ctx.ellipse(bx+fw/2, bottom-3, fw*0.42, 6, 0, 0, TAU); ctx.fill();
      ctx.save();
      if(st.rot){ // il pezzo intero ruota attorno al centro dell'impronta, come nell'editor
        ctx.translate(bx+fw/2, by+fh/2);
        ctx.rotate(st.rot*Math.PI/180);
        ctx.translate(-fw/2, -fh/2);
      } else ctx.translate(bx, by);
      for(const p of parti){
        if(!p.spr || p.spr.width<=1) continue;
        const sc=p.scale||1, pw=(p.cellsW||1)*TS*sc, ph=(p.cellsH||1)*TS*sc;
        const cx=((p.dx||0)+(p.cellsW||1)*sc/2)*TS;
        const cy=((p.dy||0)+(p.cellsH||1)*sc/2)*TS;
        ctx.save(); ctx.translate(cx,cy);
        const ang=((p.rot||0)+(p.spin||0)*t)*Math.PI/180;
        if(ang) ctx.rotate(ang);
        ctx.drawImage(p.spr,0,0,p.spr.width,p.spr.height, -pw/2, -ph/2, pw, ph);
        ctx.restore();
      }
      ctx.restore();
      continue;
    }
    const spr=structureSprite(st.id);
    if(!spr || spr.width<=1) continue;
    const w=fw, h=fw*(spr.height/spr.width);
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath();
    ctx.ellipse(bx+fw/2, bottom-3, fw*0.42, 6, 0, 0, TAU); ctx.fill();
    ctx.drawImage(spr,0,0,spr.width,spr.height, bx, bottom-h, w, h);
  }
  // piazzola + navicella parcheggiata
  const shx=planetMap.sx*TS, shy=planetMap.sy*TS;
  ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath();
  ctx.ellipse(shx+TS/2, shy+TS-4, 15, 5, 0, 0, TAU); ctx.fill();
  ctx.drawImage(SHIPSPR,0,0,SHIPSPR.width,SHIPSPR.height, shx-4, shy-18, 42,42);
  // cristalli
  for(const c of planetMap.crystals){
    if(c.got) continue;
    const bob=Math.sin(t*3+c.ph)*3;
    ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath();
    ctx.ellipse(c.x*TS+TS/2, c.y*TS+TS-6, 8,3,0,0,TAU); ctx.fill();
    ctx.drawImage(CRYSTAL,0,0,7,6, c.x*TS+7, c.y*TS+4+bob, 21,18);
    const sp=0.5+0.5*Math.sin(t*5+c.ph);
    ctx.fillStyle='rgba(255,255,255,'+(sp*0.9)+')';
    ctx.fillRect(c.x*TS+5, c.y*TS+2+bob, 2,2);
  }
  // geyser (PYRA): bocchetta, glow di preavviso, colonna eruttiva
  for(const g of (planetMap.geysers||[])){
    const gx=g.x*TS, gy=g.y*TS, ph=(t+g.ph)%6;
    ctx.fillStyle='#241a1a';
    ctx.beginPath(); ctx.ellipse(gx+TS/2, gy+TS/2, 9,6,0,0,TAU); ctx.fill();
    ctx.fillStyle='#3a2020';
    ctx.beginPath(); ctx.ellipse(gx+TS/2, gy+TS/2, 5,3,0,0,TAU); ctx.fill();
    if(ph>=4.0 && ph<5.2){ // telegraph: glow crescente
      const k=(ph-4.0)/1.2;
      ctx.fillStyle='rgba(255,110,40,'+(0.15+k*0.5)+')';
      ctx.beginPath(); ctx.ellipse(gx+TS/2, gy+TS/2, 5+k*4,3+k*2.5,0,0,TAU); ctx.fill();
    } else if(ph>=5.2 && ph<5.8){ // eruzione: colonna di fuoco
      const k=(ph-5.2)/0.6, hgt=26+Math.sin(k*Math.PI)*10;
      ctx.fillStyle='rgba(255,140,50,0.85)';
      ctx.fillRect(gx+TS/2-4, gy+TS/2-hgt, 8, hgt);
      ctx.fillStyle='rgba(255,220,120,0.9)';
      ctx.fillRect(gx+TS/2-2, gy+TS/2-hgt+4, 4, hgt-6);
    }
  }
  // ossidiana (PYRA)
  for(const o of (planetMap.obsidian||[])){
    if(o.got) continue;
    const bob=Math.sin(t*2.5+o.ph)*2;
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath();
    ctx.ellipse(o.x*TS+TS/2, o.y*TS+TS-6, 7,3,0,0,TAU); ctx.fill();
    ctx.fillStyle='#1a1226';
    ctx.beginPath();
    ctx.moveTo(o.x*TS+TS/2, o.y*TS+6+bob);
    ctx.lineTo(o.x*TS+TS/2+7, o.y*TS+16+bob);
    ctx.lineTo(o.x*TS+TS/2, o.y*TS+22+bob);
    ctx.lineTo(o.x*TS+TS/2-7, o.y*TS+16+bob);
    ctx.closePath(); ctx.fill();
    const sp=0.4+0.6*Math.sin(t*4+o.ph);
    ctx.strokeStyle='rgba(190,120,255,'+(sp*0.8)+')';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(o.x*TS+TS/2-3, o.y*TS+12+bob);
    ctx.lineTo(o.x*TS+TS/2+3, o.y*TS+18+bob);
    ctx.stroke();
  }
  // monoliti dei Precursori (VERDIA)
  for(const m of (planetMap.monoliths||[])){
    const mx=m.x*TS, my=m.y*TS;
    ctx.fillStyle='rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(mx+TS/2, my+TS-4, 10,4,0,0,TAU); ctx.fill();
    ctx.fillStyle='#1e2a24';
    ctx.fillRect(mx+TS/2-6, my-14, 12, TS+10);
    ctx.fillStyle='#2c3f35';
    ctx.fillRect(mx+TS/2-6, my-14, 4, TS+10);
    if(!m.used){
      const gl=0.4+0.5*Math.sin(t*2.4+m.x*3);
      ctx.fillStyle='rgba(141,253,106,'+gl+')';
      ctx.fillRect(mx+TS/2-2, my-8, 4, 4);
      ctx.fillRect(mx+TS/2-2, my+2, 4, 8);
    } else {
      ctx.fillStyle='rgba(90,110,100,0.5)';
      ctx.fillRect(mx+TS/2-2, my-8, 4, 14);
    }
  }
  // creaturine (slime o alieni)
  for(const cr of planetMap.critters){
    const cx=cr.px*TS, cy=cr.py*TS;
    ctx.fillStyle='rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(cx+TS/2, cy+TS-5, 9,3,0,0,TAU); ctx.fill();
    if(cr.kind==='humanoid'){
      const fr = cr.moving ? Math.floor(t*8)%2 : 0;
      const img=cr.sprites[cr.dir][fr];
      ctx.drawImage(img,0,0,8,11, cx+4, cy-4, 26, 36);
      drawEquipOverlay(ctx, cr.dir, cx+4, cy-4, 3.25, cr.helmet, cr.weapon);
    } else {
      drawCritter(ctx, cr, cx, cy, t);
    }
    if(!cr.passive && cr.hp<cr.maxHp){
      const bw=18, bx=cx+TS/2-bw/2, by=cy+TS-28;
      ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(bx,by,bw,3);
      ctx.fillStyle='#ff5c74'; ctx.fillRect(bx,by,bw*Math.max(0,cr.hp/cr.maxHp),3);
    }
  }
  // banco del mercante (solo stazione)
  if(currentPlanet.type==='hub' && planetMap.shop){
    const mx2=planetMap.shop.x*TS, my2=planetMap.shop.y*TS;
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(mx2+2,my2+TS-8,TS-4,6);
    ctx.fillStyle='#1c2c44'; ctx.fillRect(mx2+3,my2+6,TS-6,TS-10);
    ctx.strokeStyle='#7df9ff'; ctx.lineWidth=2; ctx.strokeRect(mx2+3,my2+6,TS-6,TS-10);
    ctx.fillStyle='#ffcf5c'; ctx.font='14px monospace'; ctx.textAlign='center';
    ctx.fillText('$', mx2+TS/2, my2+TS-10);
    ctx.font='10px "Press Start 2P", monospace'; ctx.textAlign='left';
  }
  // proiettili Phaser
  ctx.fillStyle='#ffcf5c';
  for(const b of gbullets){ ctx.fillRect(b.x-3,b.y-3,6,6);
    ctx.globalAlpha=0.4; ctx.fillRect(b.x-5,b.y-5,10,10); ctx.globalAlpha=1; }
  // eroe
  const hx=hero.px*TS, hy=hero.py*TS;
  ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(hx+TS/2, hy+TS-3, 9,3.4,0,0,TAU); ctx.fill();
  if(hero.inv>0 && Math.floor(t*12)%2===0) ctx.globalAlpha=0.35;
  const img=HERO[hero.dir][hero.frame];
  ctx.drawImage(img,0,0,8,11, hx+4, hy-4, 26, 36);
  drawEquipOverlay(ctx, hero.dir, hx+4, hy-4, 3.25, hero.helmet, hero.weapon);
  ctx.globalAlpha=1;
  drawParticles(0,0);
  ctx.restore();
  ctx.restore();
  if(shake>0) shake=Math.max(0,shake-0.8);
  // vignetta biome
  const vg=ctx.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,Math.max(W,H)*0.8);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.4)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  drawPlanetHUD(t);
}
function drawPlanetHUD(t){
  ctx.font='10px "Press Start 2P", monospace'; ctx.textAlign='left';
  /* Promemoria fisso dell'obiettivo mentre si cammina: prima c'era solo il messaggio verde che
     passa in 5 secondi, e poi il giocatore non sa piu' cosa cercare (23/08/2026). Stesso testo
     gia' letto altrove (sidebar): solo lettura, nessuna modifica al motore. Trattino invece di
     una freccia — il font pixel non ha quel glifo (v. story-pack.js). */
  if(!dlgOpen){
    let ob=null;
    try { ob = window.STORY && STORY.state && STORY.state.obiettivo; } catch(e){}
    if(ob){
      ctx.font='8px "Press Start 2P", monospace'; ctx.fillStyle='#ffcf5c';
      ctx.fillText('- '+ob, 12, 22);
      ctx.font='10px "Press Start 2P", monospace';
    }
  }
  if(hero.tx===planetMap.sx && hero.ty===planetMap.sy){
    ctx.textAlign='center'; ctx.fillStyle='#ffcf5c';
    ctx.fillText('E / B — DECOLLA', W/2, H-96);
  } else if(currentPlanet.type==='hub' && planetMap.shop &&
      Math.abs(hero.tx-planetMap.shop.x)+Math.abs(hero.ty-planetMap.shop.y)<=1){
    ctx.textAlign='center'; ctx.fillStyle='#8ef7ff';
    ctx.fillText('E / B — NEGOZIO', W/2, H-96);
  } else if(!dlgOpen){
    for(const cr of planetMap.critters){
      if(cr.passive && cr.lines && Math.abs(hero.tx-cr.tx)+Math.abs(hero.ty-cr.ty)<=1){
        ctx.textAlign='center'; ctx.fillStyle='#b98cff';
        ctx.fillText('E / B — PARLA CON '+cr.name, W/2, H-96);
        break;
      }
    }
  }
  if(msgT>0&&msg){ ctx.textAlign='center'; ctx.fillStyle='#8dfd6a'; ctx.fillText(msg, W/2, 100); }
  ctx.textAlign='left';
}
