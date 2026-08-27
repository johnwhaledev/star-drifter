/* space-combat.js — particelle, ondate pirata, fisica/combattimento spaziale (updSpace),
   rendering spazio + HUD, estratto verbatim da index.html nello split del monolite
   (PLAN_Cantieri.md, piano "split monolite + pack equip + strutture", filone A).
   Nessuna logica cambiata. Contiene anche killCritter/damageHero (combattimento A TERRA):
   restano qui perché erano già in questa posizione nel file originale, non per attinenza col
   nome del file — riferimenti a planetMap/hero/TS (definiti più avanti, in planet-mode.js) sono
   sicuri perché quelle funzioni vengono chiamate solo a runtime, mai al parse.
   Dipende da rand/TAU/ctx/W/H/keys/stick/take (core config), ship/particles/bullets/ecc.
   (stato di gioco), loadout (equip-db.js), PLANETS/DOCKABLE/BIOMES/HUB/drawStars/getWeather
   (world-gen.js — getWeather usato per l'avviso meteo prima di atterrare, PLAN_Cantieri.md
   §3bis), PIRATE_SPRS/PIRATE_ELITE/SHIPSPR (sprites.js/equip-db.js), sbEl (sidebar, inline) —
   tutti definiti prima di questo file nel flusso originale. */
"use strict";

/* ---------- Particelle ---------- */
function puff(x,y,n,col,spd=80,life=0.5){
  for(let i=0;i<n;i++){
    const a=rand()*TAU, v=spd*(0.3+rand()*0.7);
    particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:life*(0.5+rand()*0.5),T:life,c:col,s:1+rand()*2.5});
  }
}
function updParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; p.t-=dt;
    if(p.t<=0){particles.splice(i,1);continue;}
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.96; p.vy*=0.96;
  }
}
function drawParticles(ox,oy){
  for(const p of particles){
    ctx.globalAlpha=Math.max(0,p.t/p.T);
    ctx.fillStyle=p.c; ctx.fillRect(p.x-ox-p.s/2,p.y-oy-p.s/2,p.s,p.s);
  }
  ctx.globalAlpha=1;
}

/* ---------- Ondate di invader ---------- */
function spawnWave(){
  waveNum++;
  const n=Math.min(4+waveNum,10);
  const ang=rand()*TAU, cx=ship.x+Math.cos(ang)*(Math.max(W,H)*0.75), cy=ship.y+Math.sin(ang)*(Math.max(W,H)*0.75);
  const elite = waveNum>=3;
  for(let i=0;i<n;i++){
    const col=i%Math.min(n,5), row=Math.floor(i/Math.min(n,5));
    invaders.push({
      ax:cx, ay:cy, ox:(col-2)*46, oy:row*44,
      x:cx,y:cy, ph:rand()*TAU, hp:(elite&&i%4===0)?2:1,
      shootT:1.5+rand()*3, elite:(elite&&i%4===0),
      spr:Math.floor(rand()*PIRATE_SPRS.length), a:0
    });
  }
  say('PIRATI IN AVVICINAMENTO — ONDATA '+waveNum+'!',2);
  audio.hit();
}
function updSpace(dt,t){
  const SH=loadout.ship;
  // controlli navicella: joystick (curva+spinta insieme) oppure tastiera come alternativa
  const brake = keys['ArrowDown'];
  let thrustAmt=0;
  if(stick.active && stick.mag>0.12){
    let diff=stick.angle-ship.a;
    while(diff>Math.PI) diff-=TAU;
    while(diff<-Math.PI) diff+=TAU;
    const maxTurn=SH.turnRate*dt*1.7;
    ship.a += clamp(diff,-maxTurn,maxTurn);
    thrustAmt = stick.mag;
  } else {
    if(keys['ArrowLeft']) ship.a-=SH.turnRate*dt;
    if(keys['ArrowRight']) ship.a+=SH.turnRate*dt;
    if(keys['ArrowUp']) thrustAmt=1;
  }
  if(thrustAmt>0){
    ship.vx+=Math.cos(ship.a)*SH.thrust*dt*thrustAmt; ship.vy+=Math.sin(ship.a)*SH.thrust*dt*thrustAmt;
    if(rand()<0.85){
      const bx=ship.x-Math.cos(ship.a)*14, by=ship.y-Math.sin(ship.a)*14;
      particles.push({x:bx,y:by,vx:-Math.cos(ship.a)*120+(rand()-0.5)*40,vy:-Math.sin(ship.a)*120+(rand()-0.5)*40,
        t:0.35,T:0.35,c:rand()<0.5?'#ffcf5c':'#ff7847',s:2+rand()*2});
    }
    // fumo grigio che si dissolve lento dietro i motori
    if(rand()<0.35){
      const bx=ship.x-Math.cos(ship.a)*16, by=ship.y-Math.sin(ship.a)*16;
      particles.push({x:bx,y:by,vx:-Math.cos(ship.a)*45+(rand()-0.5)*26,vy:-Math.sin(ship.a)*45+(rand()-0.5)*26,
        t:0.9+rand()*0.5,T:1.4,c:rand()<0.5?'#5a6a7e':'#3c4a5e',s:2.5+rand()*3});
    }
  }
  // fumo nero di danno: scafo critico
  if(ship.hull<=2 && rand()<0.3){
    particles.push({x:ship.x+(rand()-0.5)*10,y:ship.y+(rand()-0.5)*10,
      vx:(rand()-0.5)*30,vy:(rand()-0.5)*30-14,
      t:1.1+rand()*0.5,T:1.6,c:rand()<0.6?'#22262e':'#4a3020',s:3+rand()*3});
  }
  if(brake){ ship.vx*=Math.pow(0.2,dt); ship.vy*=Math.pow(0.2,dt); }
  ship.vx*=Math.pow(SH.drag,dt); ship.vy*=Math.pow(SH.drag,dt);
  const sp=Math.hypot(ship.vx,ship.vy), MAX=SH.maxSpeed;
  if(sp>MAX){ship.vx*=MAX/sp;ship.vy*=MAX/sp;}
  ship.x+=ship.vx*dt; ship.y+=ship.vy*dt;
  const R=2100, d0=Math.hypot(ship.x,ship.y);
  if(d0>R){ ship.x*=R/d0; ship.y*=R/d0; ship.vx*=-0.4; ship.vy*=-0.4; say('LIMITE DEL SISTEMA',1.2); }
  updSpacePois(dt,t);   // fenomeni del pack: rallentano/danneggiano/bloccano DOPO lo spostamento
  updSpaceObjs(dt);
  if(ship.inv>0) ship.inv-=dt;
  if(ship.fireCd>0) ship.fireCd-=dt;

  // sparo
  if(keys['Space'] && ship.fireCd<=0){
    const WP=loadout.shipWeapon;
    ship.fireCd=WP.fireRate;
    const offs = WP.twin ? [-6,6] : [0];
    for(const o of offs){
      const ox=Math.cos(ship.a+Math.PI/2)*o, oy=Math.sin(ship.a+Math.PI/2)*o;
      bullets.push({x:ship.x+Math.cos(ship.a)*16+ox,y:ship.y+Math.sin(ship.a)*16+oy,
        vx:Math.cos(ship.a)*WP.bulletSpeed+ship.vx,vy:Math.sin(ship.a)*WP.bulletSpeed+ship.vy,t:1.4,dmg:WP.dmg});
    }
    audio.laser();
  }
  // orbite pianeti
  for(const p of PLANETS){ p.a+=p.spd*dt*0.4; p.x=Math.cos(p.a)*p.orbit; p.y=Math.sin(p.a)*p.orbit; }
  // satelliti: girano attorno al loro corpo, quindi DOPO che i pianeti si sono spostati
  for(const m of MOONS){
    const par=spaceBody(m.of);
    m.a+=(+m.spd||0)*dt;
    m.x=(par?par.x:0)+Math.cos(m.a)*m.orbit; m.y=(par?par.y:0)+Math.sin(m.a)*m.orbit;
  }
  // collisione col sole
  if(Math.hypot(ship.x,ship.y)<110){ damageShip(1,'il sole scotta!');
    const a=Math.atan2(ship.y,ship.x); ship.x=Math.cos(a)*130; ship.y=Math.sin(a)*130;
    ship.vx=Math.cos(a)*220; ship.vy=Math.sin(a)*220; }

  // ondate
  waveT-=dt;
  if(waveT<=0 && invaders.length===0){ spawnWave(); waveT=14+waveNum*2; }

  // asteroidi
  astT-=dt;
  if(astT<=0 && asteroids.length<6){ spawnAsteroid(); astT=3+rand()*4; }
  for(let i=asteroids.length-1;i>=0;i--){
    /* Se lo scafo si distrugge qui sotto, damageShip riassegna asteroids a un array nuovo e
       vuoto ("riparazione di emergenza"): questo giro del ciclo teneva ancora il vecchio
       riferimento, e alla ripetizione successiva asteroids[i] sarebbe undefined — crash che
       uccideva il loop RAF per sempre (23/08/2026, trovato testando il cambio equip: il gioco
       sembrava "non rispondere più" perché il frame non veniva più richiamato). */
    if(i>=asteroids.length) break;
    const as=asteroids[i];
    as.x+=as.vx*dt; as.y+=as.vy*dt; as.rot+=as.rs*dt;
    if(dist(as.x,as.y,ship.x,ship.y)>2600){ asteroids.splice(i,1); continue; }
    if(ship.inv<=0 && dist(as.x,as.y,ship.x,ship.y)<as.size+12){
      // breakAst PRIMA di damageShip: legge asteroids[i] mentre l'array è ancora quello vero
      breakAst(i); damageShip(1,'ASTEROIDE!');
    }
  }

  // invader
  for(const inv of invaders){
    const dx=ship.x-inv.ax, dy=ship.y-inv.ay, dd=Math.hypot(dx,dy)||1;
    const pull=Math.min(70, dd*0.15);
    inv.ax+=dx/dd*pull*dt*1.6; inv.ay+=dy/dd*pull*dt*1.6;
    inv.ph+=dt*2.2;
    inv.x=inv.ax+inv.ox+Math.sin(inv.ph)*26;
    inv.y=inv.ay+inv.oy+Math.cos(inv.ph*0.7)*14;
    inv.a=Math.atan2(ship.y-inv.y,ship.x-inv.x);
    inv.shootT-=dt;
    if(inv.shootT<=0 && dist(inv.x,inv.y,ship.x,ship.y)<720){
      inv.shootT=2.2+rand()*2.5-(inv.elite?0.8:0);
      const a=Math.atan2(ship.y-inv.y,ship.x-inv.x)+(rand()-0.5)*0.2;
      ebullets.push({x:inv.x,y:inv.y,vx:Math.cos(a)*230,vy:Math.sin(a)*230,t:3});
      audio.beep && audio.beep(320,140,0.1,'square',0.02);
    }
    if(ship.inv<=0 && dist(inv.x,inv.y,ship.x,ship.y)<20){ damageShip(1,'collisione!'); killInv(inv); }
  }
  // proiettili
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i]; b.t-=dt; b.x+=b.vx*dt; b.y+=b.vy*dt;
    let hit=false;
    for(const inv of invaders){
      if(dist(b.x,b.y,inv.x,inv.y)<14){
        inv.hp-=(b.dmg||1); hit=true;
        if(inv.hp<=0){ killInv(inv); ship.score+=inv.elite?30:10; }
        else { puff(inv.x,inv.y,4,'#ff8bd0',60,0.3); audio.hit(); }
        break;
      }
    }
    if(!hit) for(let j=asteroids.length-1;j>=0;j--){
      const as=asteroids[j];
      if(dist(b.x,b.y,as.x,as.y)<as.size){
        as.hp-=(b.dmg||1); hit=true;
        if(as.hp<=0) breakAst(j);
        else { puff(b.x,b.y,4,'#8a8f9e',60,0.3); audio.hit(); }
        break;
      }
    }
    if(hit||b.t<=0) bullets.splice(i,1);
  }
  for(let i=ebullets.length-1;i>=0;i--){
    if(i>=ebullets.length) break;   // stesso caso dell'array asteroids qui sopra
    const b=ebullets[i]; b.t-=dt; b.x+=b.vx*dt; b.y+=b.vy*dt;
    if(ship.inv<=0 && dist(b.x,b.y,ship.x,ship.y)<12){ damageShip(1,'colpito!'); ebullets.splice(i,1); continue; }
    if(b.t<=0) ebullets.splice(i,1);
  }
  updParticles(dt);
  if(msgT>0) msgT-=dt;

  // atterraggio/attracco: si guardano tutti i luoghi che DICHIARANO di essere atterrabili,
  // poi si controlla la serratura (dockIf) — così si può dire perché non si scende
  let near=null;
  for(const p of DOCKABLE) if(dist(ship.x,ship.y,p.x,p.y)<p.r+70) near=p;
  spaceNear=near;
  if(near && !dockOk(near)){
    if(take('e')) say('⛔ '+near.name+' — ATTRACCO NEGATO',2);
    near=null;
  }
  if(near && take('e')){
    // meteo estremo: avviso forte ma NON blocca (scelta di sessione, PLAN_Cantieri.md §3bis) —
    // si atterra comunque, il rischio si paga a terra (damageHero periodico in updPlanet)
    const wx=getWeather(near,t);
    if(wx.state==='extreme') say('⚠ '+wx.name+' SU '+near.name+' — atterraggio a rischio!',2.6);
    trans={t:0,dur:1.4,to:'planet',planet:near};
    state='landing'; audio.land();
  }
}
function killInv(inv){
  invaders.splice(invaders.indexOf(inv),1);
  puff(inv.x,inv.y,16,inv.elite?'#ff8bd0':'#8dfd6a',140,0.6);
  puff(inv.x,inv.y,8,'#ffcf5c',90,0.5);
  audio.boom(); shake=Math.min(shake+4,10);
}
function damageShip(n,why){
  if(ship.inv>0) return;
  ship.hull-=n; ship.inv=1.6; shake=12;
  puff(ship.x,ship.y,14,'#ff7847',150,0.6);
  audio.boom(); if(why) say(why,1.4);
  if(ship.hull<=0){
    say('SCAFO DISTRUTTO — riparazione di emergenza…',3);
    ship.hull=ship.maxHull; ship.score=Math.max(0,ship.score-25);
    ship.x=420; ship.y=0; ship.vx=ship.vy=0; ship.inv=3;
    invaders=[]; ebullets=[]; asteroids=[]; waveT=10;
  }
}
let spaceNear=null;

/* ---------- Fenomeni e oggetti dello spazio (05/08/2026, PLAN_Tool_Scalabili §16 B1) ----------
   I dati arrivano da WORLD_PACK.space (v. world-gen.js): qui c'è solo cosa fanno e come si
   vedono. Se il pack manca, SPACE_POIS/SPACE_OBJS sono vuoti e questi cicli non fanno nulla. */
function colA(c,a){
  if(typeof c!=='string' || c[0]!=='#') return c;
  let h=c.slice(1);
  if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const n=parseInt(h,16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
}
function updSpacePois(dt,t){
  for(const z of SPACE_POIS){
    /* Serratura della storia: la zona resta dov'è ma smette di agire. Il cambio si annuncia
       solo se la nave è nei paraggi, altrimenti sarebbe un messaggio dal nulla. */
    const attiva = zonaAttiva(z);
    if(z.attivaPrima === undefined) z.attivaPrima = attiva;
    if(attiva !== z.attivaPrima){
      if(dist(ship.x,ship.y,z.x,z.y) < z.r*2.5)
        say((attiva?'⛔ ':'▲ ')+z.name+(attiva?' — ORA È SBARRATA':' — VIA LIBERA'), 2.4);
      z.attivaPrima = attiva;
    }
    if(!attiva){ z.inside=false; continue; }
    const dentro = dist(ship.x,ship.y,z.x,z.y) < z.r;
    if(dentro && !z.inside && z.effect!=='block'){ say('▲ '+z.name,2); z.hitT=0.5; }
    z.inside = dentro;
    if(z.flash>0) z.flash-=dt;
    if(z.kind==='storm' && dentro){
      z.nextFlash-=dt;
      if(z.nextFlash<=0){
        z.flash=0.18; z.nextFlash=1.2+rand()*2;
        z.bolt=[]; let bx=rand()*W, by=0;
        for(let i=0;i<7;i++){ z.bolt.push([bx,by]); bx+=(rand()-0.5)*90; by+=H/6; }
      }
    }
    if(!dentro) continue;
    if(z.effect==='slow'){
      const f=Math.max(0.05, 1-(+z.power||0.55));
      ship.vx*=Math.pow(f,dt); ship.vy*=Math.pow(f,dt);
    } else if(z.effect==='damage'){
      z.hitT-=dt;
      if(z.hitT<=0){ z.hitT=2; damageShip(Math.max(1,Math.round(+z.power||1)), z.name+'!'); }
    } else if(z.effect==='block'){
      // stessa idea del limite del sistema: si rimbalza sul bordo, non si entra
      const a=Math.atan2(ship.y-z.y, ship.x-z.x);
      ship.x=z.x+Math.cos(a)*(z.r+2); ship.y=z.y+Math.sin(a)*(z.r+2);
      const sp=Math.max(140, Math.hypot(ship.vx,ship.vy)*0.5);
      ship.vx=Math.cos(a)*sp; ship.vy=Math.sin(a)*sp;
      if(t-z.warnT>2){ z.warnT=t; say('⛔ '+z.name+' — ROTTA BLOCCATA',1.4); }
    }
  }
}
function spaceBody(name){ for(const b of BODIES) if(b.name===name) return b; return null; }
function updSpaceObjs(dt){
  for(const o of SPACE_OBJS){
    if(o.motion==='orbita'){
      const par=spaceBody(o.of);
      o.a += (+o.spd||0)*dt;
      o.wx=(par?par.x:0)+Math.cos(o.a)*o.orbit;
      o.wy=(par?par.y:0)+Math.sin(o.a)*o.orbit;
    } else if(o.motion==='rotta'){
      /* Percorso a tappe: si avanza a velocità costante sul segmento corrente e si passa al
         successivo. `ciclo` chiude l'anello (ultima → prima tappa), `avanti-indietro` rimbalza
         agli estremi. Un solo cambio di tappa per fotogramma: basta e avanza per una rotta
         disegnata a mano, e non c'è modo di avvitarsi su tappe coincidenti. */
      const P=o.points, n=P.length;
      const prossima = () => (o.loop==='avanti-indietro')
        ? Math.min(n-1, Math.max(0, o.seg+o.verso)) : (o.seg+1)%n;
      const A0=P[o.seg], B0=P[prossima()];
      const len = Math.hypot(B0[0]-A0[0], B0[1]-A0[1]) || 1;
      o.segT += (+o.speed||0)*dt/len;
      if(o.segT>=1){
        o.segT -= 1;
        o.seg = prossima();
        if(o.loop==='avanti-indietro'){
          if(o.seg>=n-1) o.verso=-1; else if(o.seg<=0) o.verso=1;
        }
      }
      const A=P[o.seg], B=P[prossima()];
      o.wx=o.x=A[0]+(B[0]-A[0])*o.segT; o.wy=o.y=A[1]+(B[1]-A[1])*o.segT;
      if(o.autoRot) o.rot=Math.atan2(B[1]-A[1], B[0]-A[0]);
    } else if(o.motion==='deriva'){
      o.x+=(+o.vx||0)*dt; o.y+=(+o.vy||0)*dt;
      if(Math.hypot(o.x,o.y)>2600){ o.x=-o.x*0.98; o.y=-o.y*0.98; }  // rientra dal lato opposto
      o.wx=o.x; o.wy=o.y;
    } else { o.wx=o.x; o.wy=o.y; }
    // x,y allineati alla posizione vera: un relitto atterrabile si comporta come un corpo
    o.x=o.wx; o.y=o.wy;
    if(o.spin) o.rot=(o.rot||0)+o.spin*dt;
  }
}
function drawSpacePois(camx,camy,t){
  for(const z of SPACE_POIS){
    const px=z.x-camx, py=z.y-camy, R=z.r;
    if(px<-R-80||px>W+R+80||py<-R-80||py>H+R+80) continue;
    // zona spenta dalla storia: resta visibile ma sbiadita, così si vede che il passaggio è libero
    const attiva = zonaAttiva(z);
    ctx.globalAlpha = attiva ? 1 : 0.3;
    if(z.kind==='nebula'){
      for(const b of z.blobs){
        const bx=px+b.dx+Math.sin(t*b.sp*0.1+b.ph)*R*0.05, by=py+b.dy+Math.cos(t*b.sp*0.08+b.ph)*R*0.04;
        const g=ctx.createRadialGradient(bx,by,0,bx,by,b.r);
        g.addColorStop(0,colA(z.color,0.34)); g.addColorStop(0.55,colA(z.color2,0.15)); g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(bx,by,b.r,0,TAU); ctx.fill();
      }
    } else if(z.kind==='star'){
      const pul=1+Math.sin(t*2)*0.03;
      let g=ctx.createRadialGradient(px,py,R*0.1,px,py,R*pul);
      g.addColorStop(0,colA(z.color,0.85)); g.addColorStop(0.4,colA(z.color2,0.3)); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,R*pul,0,TAU); ctx.fill();
      g=ctx.createRadialGradient(px-R*0.1,py-R*0.1,R*0.04,px,py,R*0.5);
      g.addColorStop(0,'#fff6d8'); g.addColorStop(0.7,z.color); g.addColorStop(1,z.color2);
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,R*0.5,0,TAU); ctx.fill();
    } else if(z.kind==='storm'){
      const g=ctx.createRadialGradient(px,py,R*0.2,px,py,R);
      g.addColorStop(0,colA(z.color,0.10)); g.addColorStop(0.7,colA(z.color,0.17)); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,R,0,TAU); ctx.fill();
      ctx.strokeStyle=colA(z.color2, 0.25+0.25*Math.sin(t*7+z.seed));
      ctx.lineWidth=1.5; ctx.setLineDash([6,14]);
      ctx.beginPath(); ctx.arc(px,py,R*0.82,t*0.4,t*0.4+TAU); ctx.stroke();
      ctx.setLineDash([]);
    } else { // zone: perimetro interdetto
      ctx.strokeStyle=colA(z.color,0.55); ctx.lineWidth=2; ctx.setLineDash([10,8]);
      ctx.lineDashOffset=-t*18;
      ctx.beginPath(); ctx.arc(px,py,R,0,TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset=0;
      const g=ctx.createRadialGradient(px,py,R*0.5,px,py,R);
      g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,colA(z.color,0.12));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,R,0,TAU); ctx.fill();
    }
    if(z.name){
      ctx.font='9px "Press Start 2P", monospace'; ctx.textAlign='center';
      ctx.fillStyle=colA(z.color2||z.color, z.inside?0.9:0.45);
      ctx.fillText(z.name + (attiva?'':' (APERTA)'), px, py-R-10);
      ctx.textAlign='left';
    }
    ctx.globalAlpha=1;
  }
}
function drawSpaceObjs(camx,camy,t){
  for(const o of SPACE_OBJS){
    const px=o.wx-camx, py=o.wy-camy, R=o.r;
    if(px<-R*2-40||px>W+R*2+40||py<-R*2-40||py>H+R*2+40) continue;
    ctx.save(); ctx.translate(px,py); if(o.rot) ctx.rotate(o.rot);
    if(o.im && o.im.complete && o.im.naturalWidth){
      const iw=o.im.naturalWidth, ih=o.im.naturalHeight, k=(R*2)/Math.max(iw,ih);
      ctx.drawImage(o.im, -iw*k/2, -ih*k/2, iw*k, ih*k);
    } else if(o.tex){
      ctx.drawImage(o.tex, -R, -R, R*2, R*2);
    }
    ctx.restore();
    if(o.label && o.name){
      ctx.font='9px "Press Start 2P", monospace'; ctx.textAlign='center';
      ctx.fillStyle='rgba(223,232,255,0.7)'; ctx.fillText(o.name, px, py-R-8);
      ctx.textAlign='left';
    }
  }
}
/* Lampo della tempesta: sopra a tutto e SOLO se la nave è dentro (in coordinate schermo) */
function drawStormFlash(){
  for(const z of SPACE_POIS){
    if(z.kind!=='storm' || !z.inside || z.flash<=0) continue;
    const k=Math.max(0,z.flash/0.18);
    ctx.fillStyle=colA(z.color, 0.30*k); ctx.fillRect(0,0,W,H);
    if(z.bolt){
      ctx.strokeStyle=colA(z.color2, 0.85*k); ctx.lineWidth=2;
      ctx.beginPath(); z.bolt.forEach(([x,y],i)=> i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke();
    }
  }
}

/* ---------- Combattimento a terra ---------- */
function killCritter(cr){
  const idx=planetMap.critters.indexOf(cr);
  if(idx>=0) planetMap.critters.splice(idx,1);
  puff((cr.px+0.5)*TS,(cr.py+0.5)*TS,14,'#8dfd6a',120,0.6);
  audio.boom(); shake=Math.min(shake+3,10); ship.score+=5;
}
function damageHero(n,why){
  if(hero.inv>0) return;
  hero.hp-=n; hero.inv=0.8; shake=Math.min(shake+8,12);
  puff((hero.px+0.5)*TS,(hero.py+0.5)*TS-10,10,'#ff7847',110,0.5);
  audio.hit(); if(why) say(why,1.2);
  if(hero.hp<=0){
    say('TUTA DANNEGGIATA — rientro d\'emergenza',2.5);
    hero.hp=hero.maxHp;
    hero.tx=hero.fx=planetMap.sx; hero.ty=hero.fy=planetMap.sy;
    hero.px=hero.tx; hero.py=hero.ty; hero.moving=false; hero.inv=2;
  }
}

/* ---------- Rendering spazio ---------- */
function drawSpace(t){
  const camx=ship.x-W/2, camy=ship.y-H/2;
  const sx=(rand()-0.5)*shake, sy=(rand()-0.5)*shake;
  ctx.save(); ctx.translate(sx,sy);
  // fondo
  const bg=ctx.createRadialGradient(W/2-camx*0.02, H/2-camy*0.02, 60, W/2, H/2, Math.max(W,H));
  bg.addColorStop(0,'#0c1226'); bg.addColorStop(1,'#05070f');
  ctx.fillStyle=bg; ctx.fillRect(-20,-20,W+40,H+40);
  drawStars(camx,camy,t);
  // sole
  const sunx=-camx, suny=-camy;
  if(sunx>-260&&sunx<W+260&&suny>-260&&suny<H+260){
    const pul=1+Math.sin(t*2)*0.03;
    let g=ctx.createRadialGradient(sunx,suny,20,sunx,suny,190*pul);
    g.addColorStop(0,'rgba(255,236,160,0.9)'); g.addColorStop(0.4,'rgba(255,170,60,0.35)'); g.addColorStop(1,'rgba(255,120,40,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sunx,suny,190*pul,0,TAU); ctx.fill();
    g=ctx.createRadialGradient(sunx-20,suny-20,10,sunx,suny,95);
    g.addColorStop(0,'#fff6d8'); g.addColorStop(0.7,'#ffcf5c'); g.addColorStop(1,'#ff9040');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sunx,suny,95,0,TAU); ctx.fill();
  }
  // fenomeni del pack: fondo, dietro a orbite e pianeti
  drawSpacePois(camx,camy,t);
  // orbite (tratteggiate leggere)
  ctx.strokeStyle='rgba(125,249,255,0.07)'; ctx.setLineDash([4,10]); ctx.lineWidth=1;
  for(const p of PLANETS){ ctx.beginPath(); ctx.arc(-camx,-camy,p.orbit,0,TAU); ctx.stroke(); }
  ctx.setLineDash([]);
  // corpi: pianeti, stazioni e satelliti — si disegnano tutti, anche quelli su cui non si scende
  for(const p of BODIES){
    const px=p.x-camx, py=p.y-camy;
    if(px<-p.r*2||px>W+p.r*2||py<-p.r*2||py>H+p.r*2) continue;
    const g=ctx.createRadialGradient(px,py,p.r*0.8,px,py,p.r*1.6);
    g.addColorStop(0,BIOMES[p.biome].atmo); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,p.r*1.6,0,TAU); ctx.fill();
    ctx.font='9px "Press Start 2P", monospace'; ctx.textAlign='center';
    // un'immagine dal pack sostituisce la texture procedurale, qualunque sia il tipo di corpo
    if(p.im && p.im.complete && p.im.naturalWidth){
      const iw=p.im.naturalWidth, ih=p.im.naturalHeight, k=(p.r*2)/Math.max(iw,ih);
      ctx.drawImage(p.im, px-iw*k/2, py-ih*k/2, iw*k, ih*k);
      ctx.fillStyle='rgba(223,232,255,0.85)';
      ctx.fillText(p.name, px, py-p.r-8);
    } else if(p.type==='hub'){
      ctx.drawImage(p.tex,px-p.r,py-p.r);
      // luci di navigazione lampeggianti
      const bl=0.4+0.6*(0.5+0.5*Math.sin(t*3));
      ctx.globalAlpha=bl; ctx.fillStyle='#ff5c74';
      ctx.fillRect(px-2, py-p.r*0.99, 4, 4);
      ctx.globalAlpha=bl*0.8; ctx.fillStyle='#7df9ff';
      ctx.fillRect(px+p.r*0.72-2, py-2, 4, 4); ctx.fillRect(px-p.r*0.72-2, py-2, 4, 4);
      ctx.globalAlpha=1;
      ctx.fillStyle='rgba(223,232,255,0.85)';
      ctx.fillText(p.name, px, py-p.r-8);
    } else {
      ctx.drawImage(p.tex,px-p.r,py-p.r);
      ctx.fillStyle='rgba(223,232,255,0.85)';
      // il conteggio compare solo se quel corpo ha davvero dei cristalli (0 = corpo di scena)
      if(p.nCrystals>0){
        ctx.fillText(p.name+'  '+p.done+'/'+p.nCrystals, px, py-p.r-14);
        if(p.done>=p.nCrystals){ ctx.fillStyle='#8dfd6a'; ctx.fillText('✓ COMPLETO', px, py-p.r-2); }
      } else {
        ctx.fillText(p.name, px, py-p.r-8);
      }
      // meteo estremo (avviso PRIMA di atterrare, PLAN_Cantieri.md §3bis): badge lampeggiante
      // sotto il pianeta, visibile scorrendo la mappa stellare, non solo al momento di premere E
      const wx=getWeather(p,t);
      if(wx.state!=='clear'){
        const bl = wx.state==='extreme' ? (0.5+0.5*Math.sin(t*6)) : (0.4+0.3*Math.sin(t*2));
        ctx.globalAlpha=bl; ctx.fillStyle=wx.color;
        ctx.fillText((wx.state==='extreme'?'⚠ ':'~ ')+wx.name, px, py+p.r+16);
        ctx.globalAlpha=1;
      }
    }
  }
  drawSpaceObjs(camx,camy,t);   // satelliti, relitti, navi di passaggio: davanti ai pianeti
  drawParticles(camx,camy);
  // proiettili
  ctx.fillStyle='#aefcff';
  for(const b of bullets){ ctx.fillRect(b.x-camx-2,b.y-camy-2,4,4);
    ctx.globalAlpha=0.4; ctx.fillRect(b.x-camx-3,b.y-camy-3,6,6); ctx.globalAlpha=1; }
  ctx.fillStyle='#ff8bd0';
  for(const b of ebullets){ ctx.fillRect(b.x-camx-2.5,b.y-camy-2.5,5,5); }
  // asteroidi
  for(const as of asteroids){
    const px=as.x-camx, py=as.y-camy;
    if(px<-60||px>W+60||py<-60||py>H+60) continue;
    ctx.save(); ctx.translate(px,py); ctx.rotate(as.rot);
    ctx.fillStyle='#6a6f7e'; ctx.strokeStyle='#3c414e'; ctx.lineWidth=2;
    ctx.beginPath();
    as.pts.forEach(([x,y],i)=> i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#4a4f5e';
    ctx.beginPath(); ctx.ellipse(-as.size*0.2,as.size*0.12,as.size*0.22,as.size*0.16,0.4,0,TAU); ctx.fill();
    ctx.fillStyle='#8a8f9e';
    ctx.fillRect(as.size*0.15,-as.size*0.3,as.size*0.16,as.size*0.14);
    ctx.restore();
  }
  // pirati
  for(const inv of invaders){
    // l'indice vale per entrambe le liste: con più elite nella flotta se ne vede più d'una
    const spr = inv.elite ? PIRATE_ELITES[(inv.spr||0)%PIRATE_ELITES.length]
                          : PIRATE_SPRS[(inv.spr||0)%PIRATE_SPRS.length];
    const s=inv.elite?46:36;
    ctx.save(); ctx.translate(inv.x-camx, inv.y-camy); ctx.rotate((inv.a||0)+Math.PI/2);
    ctx.drawImage(spr,0,0,spr.width,spr.height,-s/2,-s/2,s,s);
    // fiammella motore
    const fl=0.6+0.4*Math.sin(t*14+inv.ph);
    ctx.globalAlpha=fl; ctx.fillStyle='#ff7847';
    ctx.fillRect(-2, s/2-2, 4, 5); ctx.globalAlpha=1;
    ctx.restore();
  }
  // navicella
  ctx.save();
  ctx.translate(W/2,H/2); ctx.rotate(ship.a+Math.PI/2);
  ctx.drawImage(SHIPSPR,0,0,SHIPSPR.width,SHIPSPR.height,-19,-19,39,39);
  ctx.restore();
  // scudo (durante invulnerabilità)
  if(ship.inv>0){
    const sa=Math.min(1, ship.inv/0.6);
    const pul=0.55+0.45*Math.sin(t*10);
    ctx.save(); ctx.translate(W/2,H/2);
    ctx.globalAlpha=0.5*sa*pul;
    ctx.strokeStyle='#7df9ff'; ctx.lineWidth=2.5;
    ctx.beginPath();
    for(let i=0;i<=6;i++){
      const a=i/6*TAU + t*1.5;
      const x=Math.cos(a)*26, y=Math.sin(a)*26;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.globalAlpha=0.14*sa;
    ctx.fillStyle='#7df9ff';
    ctx.beginPath(); ctx.arc(0,0,26,0,TAU); ctx.fill();
    ctx.restore();
    ctx.globalAlpha=1;
  }
  ctx.restore();
  drawStormFlash();
  if(shake>0) shake=Math.max(0,shake-0.8);
  drawSpaceHUD(t);
}

/* ---------- HUD spazio ---------- */
function drawSpaceHUD(t){
  ctx.font='10px "Press Start 2P", monospace'; ctx.textAlign='left';
  // minimappa
  const barH = sbEl.offsetHeight||52;
  const mR=48, mx=W-mR-14, my=mR+barH+14;
  ctx.fillStyle='rgba(8,12,26,0.7)'; ctx.beginPath(); ctx.arc(mx,my,mR,0,TAU); ctx.fill();
  ctx.strokeStyle='rgba(125,249,255,0.4)'; ctx.lineWidth=1.5; ctx.stroke();
  const sc=mR/2200;
  /* Luogo dell'obiettivo di storia attuale: prima si cercava il name per intero dentro il testo
     libero dell'obiettivo, e falliva quando story-pack.js usava una forma abbreviata ("Vega"
     invece di "RELITTO DELLA VEGA") — PIANO_PULIZIA_REPO.md bug P0-4, corretto il 26/08/2026
     portando ogni trigger a dichiarare `obiettivoLuogo` esplicito (SPEC_story_pack.md §4). */
  let obTarget=null;
  try {
    const luogoNome = window.STORY && STORY.state && STORY.state.obiettivoLuogo;
    if(luogoNome) obTarget = LUOGHI.find(l => l.name===luogoNome) || null;
  } catch(e){}
  // fenomeni del pack: aloni sotto a tutto, così si vede dove NON passare
  for(const z of SPACE_POIS){
    ctx.fillStyle=colA(z.color, z.effect==='block'?0.30:0.18);
    ctx.beginPath(); ctx.arc(mx+z.x*sc, my+z.y*sc, Math.max(2,z.r*sc), 0, TAU); ctx.fill();
  }
  ctx.fillStyle='#ffcf5c'; ctx.beginPath(); ctx.arc(mx,my,4,0,TAU); ctx.fill();
  for(const p of PLANETS.concat(MOONS)){
    ctx.fillStyle=BIOMES[p.biome].planet[0];
    const finito = p.nCrystals>0 && p.done>=p.nCrystals;
    ctx.beginPath(); ctx.arc(mx+p.x*sc,my+p.y*sc, p.type==='moon'?1.5:(finito?2:3),0,TAU); ctx.fill();
  }
  for(const s of STATIONS){
    ctx.save(); ctx.translate(mx+s.x*sc,my+s.y*sc); ctx.rotate(Math.PI/4);
    ctx.fillStyle='#b98cff'; ctx.fillRect(-3.5,-3.5,7,7);
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=1; ctx.strokeRect(-3.5,-3.5,7,7);
    ctx.restore();
  }
  // oggetti atterrabili (relitti e simili): mancavano dal radar pur essendo luoghi veri
  for(const o of SPACE_OBJS){
    if(!o.dock) continue;
    ctx.fillStyle='#8a8f9e';
    ctx.beginPath(); ctx.arc(mx+o.x*sc, my+o.y*sc, 2.5, 0, TAU); ctx.fill();
  }
  if(obTarget){
    const pulse=1.5+Math.sin(t*4)*1.5;
    ctx.strokeStyle='#ffcf5c'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(mx+obTarget.x*sc, my+obTarget.y*sc, 6+pulse, 0, TAU); ctx.stroke();
  }
  ctx.fillStyle='#7df9ff';
  ctx.save(); ctx.translate(mx+ship.x*sc,my+ship.y*sc); ctx.rotate(ship.a+Math.PI/2);
  ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(3,3); ctx.lineTo(-3,3); ctx.fill(); ctx.restore();
  for(const inv of invaders){
    ctx.fillStyle='#ff5c74';
    ctx.fillRect(mx+inv.x*sc-1,my+inv.y*sc-1,2,2);
  }
  ctx.fillStyle='#8a8f9e';
  for(const as of asteroids) ctx.fillRect(mx+as.x*sc-1,my+as.y*sc-1,2,2);
  // prompt atterraggio
  if(spaceNear && !dockOk(spaceNear)){
    ctx.textAlign='center'; ctx.fillStyle='#ff5c74';
    ctx.fillText('⛔ '+spaceNear.name+' — ACCESSO NEGATO', W/2, H-96);
    ctx.textAlign='left';
  } else if(spaceNear){
    ctx.textAlign='center'; ctx.fillStyle='#ffcf5c';
    const bl = Math.floor(t*2)%2===0;
    ctx.fillText((bl?'» ':'  ')+'E / B — '+(spaceNear.type==='hub'?'ATTRACCA A ':'ATTERRA SU ')+spaceNear.name+(bl?' «':'  '), W/2, H-96);
    const wx=getWeather(spaceNear,t);
    if(wx.state==='extreme'){
      ctx.fillStyle=wx.color;
      ctx.fillText('⚠ '+wx.name+' IN CORSO — rischio a terra', W/2, H-84);
    }
  }
  if(msgT>0 && msg){ ctx.textAlign='center'; ctx.fillStyle='#8dfd6a'; ctx.fillText(msg, W/2, 100); }
  ctx.textAlign='left';
}
