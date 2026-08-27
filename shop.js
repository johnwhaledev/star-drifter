/* shop.js — negozio stazione (SHOP_ITEMS, equipGear, renderShop, open/closeShop), estratto
   verbatim da index.html nello split del monolite (PLAN_Cantieri.md, piano "split
   monolite + pack equip + strutture", filone A). Nessuna logica cambiata.
   Dipende da EQUIP_DB/loadout/owned/SLOT2CAT (equip-db.js), FORGE (equip-db.js),
   ship/hero/say/sbRenderDrawer/refreshHeroLook/audio — tutte definite prima di questo file
   nel flusso originale (stessa posizione). */
"use strict";

/* ---------- Negozio ---------- */
let shopOpen=false;
const shopPanelEl=document.getElementById('shopPanel');
const shopListEl=document.getElementById('shopList');
/* Moltiplicatore del bonus "Cella Energetica": prima mutava direttamente
   EQUIP_DB.groundWeapons.phaser.fireRate (oggetto condiviso, mai salvato) — l'upgrade pagato
   spariva a un reload e si poteva ricomprare (PIANO_PULIZIA_REPO.md, bug P0-3). Ora è un flag
   su AMMO_ITEM.bought, applicato a runtime in planet-mode.js e persistito da story-engine.js. */
const AMMO_FIRE_MUL=0.85;
const SHOP_ITEMS=[
  { id:'repair', name:'Ripara Scafo', desc:'Ripristina lo scafo della navicella al massimo.', cost:20,
    apply:()=>{ ship.hull=ship.maxHull; say('Scafo riparato!',1.5); } },
  { id:'medkit', name:'Kit Medico', desc:'Ripristina la tuta al massimo.', cost:15,
    apply:()=>{ hero.hp=hero.maxHp; say('Tuta rigenerata!',1.5); } },
  { id:'ammo', name:'Cella Energetica', desc:'Riduce il riarmo del Phaser del 15% (una tantum).', cost:30, oneTime:true, bought:false,
    apply:()=>{ say('Phaser potenziato!',1.5); } },
  { id:'eq_blaster', gear:EQUIP_DB.groundWeapons.blaster, slot:'groundWeapon' },
  { id:'eq_recon', gear:EQUIP_DB.suits.recon, slot:'suit' },
  { id:'eq_assalto', gear:EQUIP_DB.suits.assalto, slot:'suit' },
  { id:'eq_ignifuga', gear:EQUIP_DB.suits.ignifuga, slot:'suit' },
  { id:'eq_twin', gear:EQUIP_DB.shipWeapons.laser_twin, slot:'shipWeapon' },
  { id:'eq_falcon', gear:EQUIP_DB.ships.falcon_azzurro, slot:'ship' },
  { id:'eq_vespa', gear:EQUIP_DB.ships.vespa_scarlatta, slot:'ship' }
];
if(FORGE && FORGE.shopAdd) for(const s of FORGE.shopAdd){
  const [cat,id]=s.gearPath.split('.');
  const gear=EQUIP_DB[cat]&&EQUIP_DB[cat][id];
  if(gear) SHOP_ITEMS.push({id:'eq_'+id, gear, slot:s.slot});
}
/* Navi della flotta (fleet-pack.js, 06/08/2026): quelle con ruolo `giocatore` e un prezzo
   finiscono in vendita da sole — nessuna riga da scrivere qui per ogni nave nuova. Senza
   prezzo restano fuori dal negozio: sono navi che il giocatore può ricevere in altro modo
   (un effetto della storia, per esempio). */
if(typeof FLEET_SHIPS!=='undefined' && FLEET_SHIPS) for(const id in FLEET_SHIPS){
  const f=FLEET_SHIPS[id];
  if(!f || (f.roles||[]).indexOf('giocatore')<0) continue;
  const gear=EQUIP_DB.ships[id];
  if(!gear || gear.cost==null) continue;
  if(SHOP_ITEMS.some(s=>s.gear===gear)) continue;   // già in vendita (le tre di serie)
  SHOP_ITEMS.push({id:'eq_'+id, gear, slot:'ship'});
}
for(const it of SHOP_ITEMS){
  if(!it.gear) continue;
  it.name=it.gear.name; it.desc=it.gear.desc; it.cost=it.gear.cost; it.icon=it.gear.icon;
  it.apply=()=>{ equipGear(it.slot, it.gear); };
}
const AMMO_ITEM=SHOP_ITEMS.find(i=>i.id==='ammo');
function equipGear(slot, gear, fresh=true){
  const cat=SLOT2CAT[slot];
  if(!owned[cat].includes(gear.id)) owned[cat].push(gear.id);
  loadout[slot]=gear;
  if(slot==='suit'){
    hero.maxHp=gear.maxHP;
    hero.hp = fresh ? gear.maxHP : Math.min(hero.hp, gear.maxHP);
    refreshHeroLook();
    say(gear.name+' indossata!',1.6);
  } else if(slot==='ship'){
    ship.maxHull=gear.maxHull;
    ship.hull = fresh ? gear.maxHull : Math.min(ship.hull, gear.maxHull);
    SHIPSPR=gear.sprite;
    say(gear.name+(fresh?' consegnata al molo!':' pronta al molo!'),1.8);
  } else {
    say(gear.name+' equipaggiato!',1.6);
  }
}
function renderShop(){
  shopListEl.innerHTML = SHOP_ITEMS.map(it=>{
    let label, disabled;
    if(it.gear){
      // posseduto e' diverso da equipaggiato ora: senza questa distinzione, comprare una
      // seconda tuta/arma/nave bloccava per sempre il ritorno alla prima (bottone "FATTO" fisso).
      const isEquipped = loadout[it.slot]===it.gear;
      const isOwned = owned[SLOT2CAT[it.slot]].includes(it.gear.id);
      disabled = isEquipped || (!isOwned && ship.score<it.cost);
      label = isEquipped ? 'FATTO' : (isOwned ? 'EQUIPAGGIA' : it.cost+' PT');
    } else {
      const done = it.oneTime && it.bought;
      disabled = done || ship.score<it.cost;
      label = done ? 'FATTO' : it.cost+' PT';
    }
    return '<div class="shopItem">'
      +(it.icon?'<img class="shopItemIcon" src="'+it.icon+'">':'')
      +'<div class="shopItemInfo"><b>'+it.name+'</b>'
      +'<div class="dim">'+it.desc+'</div></div>'
      +'<button class="shopBuy" data-id="'+it.id+'" '+(disabled?'disabled':'')+'>'+label+'</button></div>';
  }).join('') + '<div class="dim" style="margin-top:8px;font-size:8px">Punti disponibili: '+ship.score+'</div>';
}
function openShop(){ shopOpen=true; shopPanelEl.classList.remove('hidden'); renderShop(); audio.pickup(); }
function closeShop(){ shopOpen=false; shopPanelEl.classList.add('hidden'); }
shopListEl.addEventListener('click', e=>{
  const btn=e.target.closest('.shopBuy'); if(!btn||btn.disabled) return;
  const it=SHOP_ITEMS.find(i=>i.id===btn.dataset.id);
  if(!it) return;
  if(it.gear){
    if(owned[SLOT2CAT[it.slot]].includes(it.gear.id)){
      equipGear(it.slot, it.gear, false);   // gia' tuo: si ri-equipaggia gratis, come nel drawer EQUIPAGGIAMENTO
    } else {
      if(ship.score<it.cost) return;
      ship.score-=it.cost; it.apply();
    }
  } else {
    if(ship.score<it.cost || (it.oneTime&&it.bought)) return;
    ship.score-=it.cost; it.apply(); if(it.oneTime) it.bought=true;
  }
  audio.pickup(); renderShop();
  // SPEC_story_pack.md §5 elenca "acquisto in negozio" fra i momenti di salvataggio: non era
  // mai stato scritto — senza questo, tute/navi/armi comprate sparivano al primo reload (23/08/2026)
  if(window.STORY) STORY.save();
});
document.getElementById('shopClose').addEventListener('click', e=>{ e.stopPropagation(); audio.unlock(); closeShop(); });
