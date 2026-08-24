/* equip-db.js — EQUIP_DB (navi/armi nave/tute/armi terra) + merge FORGE_PACK/ART_PACK + loadout
   iniziale, estratto verbatim da index.html nello split del monolite (PLAN_Cantieri.md,
   piano "split monolite + pack equip + strutture", filone A). Nessuna logica cambiata.
   Dipende da imgSprite/shipSprite (sprites.js) e da FORGE_PACK/ART_PACK (pack dati, entrambi
   caricati prima di questo file — stessa posizione originale nel flusso). */
"use strict";

const EQUIP_DB = {
  ships: {
    nomad_rust:{ id:'nomad_rust', name:'Nomad Rust', desc:'Scafo industriale, robusto e poco raffinato.',
      maxHull:5, thrust:260, turnRate:3.4, maxSpeed:340, drag:0.55,
      shape:'nomad', hull:'#3b6ea8', glow:'#9fe8ff' },
    falcon_azzurro:{ id:'falcon_azzurro', name:'Falcon Azzurro', desc:'Agile e scattante, scafo leggero.',
      maxHull:4, thrust:320, turnRate:4.3, maxSpeed:410, drag:0.5, cost:60,
      shape:'falcon', hull:'#2a8f7f', glow:'#aefff0' },
    vespa_scarlatta:{ id:'vespa_scarlatta', name:'Vespa Scarlatta', desc:'Corazzata pesante, lenta ma inarrestabile.',
      maxHull:8, thrust:220, turnRate:2.7, maxSpeed:300, drag:0.6, cost:90,
      shape:'vespa', hull:'#a83b4b', glow:'#ffb3c0' }
  },
  shipWeapons: {
    laser_mk1:{ id:'laser_mk1', name:'Cannone Laser Singolo', desc:'Colpo singolo affidabile.',
      dmg:1, fireRate:0.16, bulletSpeed:560 },
    laser_twin:{ id:'laser_twin', name:'Doppio Laser', desc:'Due colpi paralleli.',
      dmg:1, fireRate:0.2, bulletSpeed:560, twin:true, cost:70 }
  },
  suits: {
    esplorazione:{ id:'esplorazione', name:'Tuta Media/Esplorazione', desc:'Equilibrata, nessun bonus estremo.',
      maxHP:3, moveMul:1.0, defense:0, color:'#e0532f' },
    assalto:{ id:'assalto', name:'Tuta d\'Assalto', desc:'Pesante: +2 HP, movimento più lento.',
      maxHP:5, moveMul:0.85, defense:1, color:'#3b6ea8', cost:50 },
    recon:{ id:'recon', name:'Tuta Recon', desc:'Leggera: più veloce, meno protetta.',
      maxHP:2, moveMul:1.3, defense:0, color:'#2a8f5f', cost:40 },
    ignifuga:{ id:'ignifuga', name:'Tuta Ignifuga al Carbonio', desc:'Immune al calore di PYRA. Robusta ma non agilissima.',
      maxHP:4, moveMul:0.95, defense:0, heatProof:true, color:'#c9742a', cost:80 }
  },
  groundWeapons: {
    phaser:{ id:'phaser', name:'Phaser', desc:'Arma da terra standard.',
      dmg:1, fireRate:0.35, bulletSpeed:420, range:6 },
    blaster:{ id:'blaster', name:'Blaster Pesante', desc:'Danno doppio, riarmo lento.',
      dmg:2, fireRate:0.6, bulletSpeed:380, range:6, cost:55 }
  }
};
/* Forge pack: asset generati da Sprite Forge (file opzionale nella stessa cartella) */
const FORGE = (typeof window!=='undefined' && window.FORGE_PACK) || null;
if(FORGE){
  Object.assign(HULL_SHAPES, FORGE.hulls||{});
  for(const c of ['ships','suits','groundWeapons','shipWeapons'])
    if(FORGE[c]) Object.assign(EQUIP_DB[c], FORGE[c]);
}
/* Flotta (fleet-pack.js, 06/08/2026): le navi con ruolo `giocatore` diventano navi vere —
   comprabili al negozio se hanno un `cost`. Le statistiche stanno in `stats`; quelle non scritte
   prendono i valori della nave di partenza, così un pack può limitarsi a nome + immagine.
   Va PRIMA del giro che assegna gli sprite, qui sotto. */
const FLEET_SHIPS = (typeof window!=='undefined' && window.FLEET_PACK && window.FLEET_PACK.ships) || null;
if(FLEET_SHIPS) for(const id in FLEET_SHIPS){
  const f = FLEET_SHIPS[id];
  if(!f || (f.roles||[]).indexOf('giocatore')<0) continue;
  const base = EQUIP_DB.ships[id] || { maxHull:5, thrust:260, turnRate:3.4, maxSpeed:340, drag:0.55,
                                       shape:'nomad', hull:'#3b6ea8', glow:'#9fe8ff' };
  EQUIP_DB.ships[id] = Object.assign({}, base, f.stats||{},
    { id, name: f.name || base.name || id, desc: (f.stats&&f.stats.desc) || base.desc || '' });
}
for(const k in EQUIP_DB.ships){
  const s=EQUIP_DB.ships[k];
  // la flotta ha la precedenza sull'art-pack: è il catalogo curato apposta
  const daFlotta = (FLEET_SHIPS && FLEET_SHIPS[k] && FLEET_SHIPS[k].img) ? {img:FLEET_SHIPS[k].img} : null;
  const skin = daFlotta ||
    ((typeof window!=='undefined' && window.ART_PACK && window.ART_PACK.ships) ? window.ART_PACK.ships[k] : null);
  if(skin){
    s.sprite=imgSprite(skin.img);
    s.icon=skin.img;
  } else {
    s.sprite=shipSprite(s.shape,s.hull,s.glow,s.accent);
  }
}
/* Icone da negozio (tute/armi da terra): stessa idea dell'art-pack ma solo <img>, nessun canvas necessario */
const ICONS = (typeof window!=='undefined' && window.ART_PACK && window.ART_PACK.icons) || null;
if(ICONS){
  for(const cat in ICONS) if(EQUIP_DB[cat])
    for(const id in ICONS[cat]) if(EQUIP_DB[cat][id]) EQUIP_DB[cat][id].icon = ICONS[cat][id];
}
const loadout = {
  ship: EQUIP_DB.ships.nomad_rust,
  shipWeapon: EQUIP_DB.shipWeapons.laser_mk1,
  suit: EQUIP_DB.suits.esplorazione,
  groundWeapon: EQUIP_DB.groundWeapons.phaser
};
let SHIPSPR = loadout.ship.sprite;
/* Proprietà: cosa possiede il giocatore (gli acquisti si accumulano, non sostituiscono) */
const owned={ ships:['nomad_rust'], shipWeapons:['laser_mk1'], suits:['esplorazione'], groundWeapons:['phaser'] };
const SLOT2CAT={ ship:'ships', shipWeapon:'shipWeapons', suit:'suits', groundWeapon:'groundWeapons' };
// kit di partenza, nominato: serve a story-engine.js per ricostruire owned/loadout su "nuova partita"
const STARTING_KIT={ ship:'nomad_rust', shipWeapon:'laser_mk1', suit:'esplorazione', groundWeapon:'phaser' };
