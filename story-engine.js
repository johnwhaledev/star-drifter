/* story-engine.js — motore di storia: trigger evento-condizione-effetto + salvataggio.
   Contratto in SPEC_story_pack.md §6 (sessione 5 di PLAN_Tool_Scalabili.md).

   Va caricato per ULTIMO fra gli script: usa say/openDialog/decoder/ship/owned definiti prima.
   Senza `story-pack.js` (i dati) il gioco e' identico a prima: qui non c'e' nessun contenuto,
   solo il meccanismo. Zero dipendenze esterne.

   Vocabolario CHIUSO (eventi, condizioni, effetti): SPEC_story_pack.md §2-§4. Aggiungere voci
   qui senza aggiornare la spec e' esattamente cio' che la spec vieta. */
"use strict";

const STORY = (function () {
  // `let` e non `const`: l'editor dei trigger sostituisce il pack a ogni simulazione
  // (STORY.usePack), così il simulatore gira sul motore VERO e non su una sua copia.
  let PACK = (typeof window !== 'undefined' && window.STORY_PACK) || null;
  const SAVE_KEY = 'sd_save', SAVE_V = 1;
  let S = null;                 // stato salvato
  let lastWeather = {};         // per l'evento weatherChange: serve lo stato precedente per pianeta

  /* ------------------------------- salvataggio ------------------------------- */
  function nuovo() {
    return { v: SAVE_V, chapter: 0, obiettivo: null, obiettivoLuogo: null, flags: {}, once: [], timers: {},
             decoder: 0, credits: 0, owned: {}, equipped: {}, planets: {}, ammoUpgrade: false };
  }
  /* owned/equipped/credits erano nello schema di sd_save fin dalla v1 (SPEC_story_pack.md §5)
     ma nessun codice li scriveva o leggeva davvero — trovato il 23/08/2026 quando un giocatore
     con progressi salvati non riusciva più a ri-selezionare tute/navi comprate: sparivano a ogni
     ricarica della pagina perché `owned`/`loadout` (equip-db.js) sono solo variabili in memoria,
     mai state agganciate al salvataggio. */
  function syncEquipInto() {
    try {
      S.owned = { ships: owned.ships.slice(), shipWeapons: owned.shipWeapons.slice(),
                  suits: owned.suits.slice(), groundWeapons: owned.groundWeapons.slice() };
      S.equipped = { ship: loadout.ship.id, shipWeapon: loadout.shipWeapon.id,
                      suit: loadout.suit.id, groundWeapon: loadout.groundWeapon.id };
      S.credits = ship.score;
      S.ammoUpgrade = !!AMMO_ITEM.bought;
    } catch (e) {}
  }
  function applyEquipFrom(saved) {
    try {
      if (!saved || !saved.owned) return;
      for (const cat in saved.owned) {
        if (!owned[cat]) continue;
        for (const id of saved.owned[cat]) if (EQUIP_DB[cat] && EQUIP_DB[cat][id] && owned[cat].indexOf(id) < 0) owned[cat].push(id);
      }
      if (saved.equipped) for (const slot in saved.equipped) {
        const cat = SLOT2CAT[slot], g = cat && EQUIP_DB[cat] && EQUIP_DB[cat][saved.equipped[slot]];
        if (!g) continue;
        loadout[slot] = g;
        if (slot === 'ship') { ship.maxHull = g.maxHull; ship.hull = g.maxHull; SHIPSPR = g.sprite; }
        else if (slot === 'suit') { hero.maxHp = g.maxHP; hero.hp = g.maxHP; }
      }
      if (typeof saved.credits === 'number' && saved.credits >= 0) ship.score = saved.credits;
      AMMO_ITEM.bought = !!saved.ammoUpgrade;
    } catch (e) { console.warn('[STORY] ripristino equip fallito:', e.message); }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { S = nuovo(); return S; }
      const d = JSON.parse(raw);
      // versione piu' nuova di quella supportata: NON caricare (mai migrare all'indietro)
      if (!d || d.v > SAVE_V) { console.warn('[STORY] salvataggio v' + (d && d.v) + ' non supportato, ignorato'); S = nuovo(); return S; }
      S = Object.assign(nuovo(), d);
      applyEquipFrom(S);   // solo qui: un salvataggio VERO, non un nuovo()/reset() appena creato
    } catch (e) { console.warn('[STORY] salvataggio illeggibile, riparto pulito:', e.message); S = nuovo(); }
    return S;
  }
  function salva() {
    syncEquipInto();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }
    catch (e) { /* quota piena o storage negato: la partita continua, senza persistenza */ }
  }
  function reset() {
    S = nuovo();
    // "nuova partita" deve azzerare anche equip/crediti IN MEMORIA, non solo sd_save: dal
    // 23/08/2026 il reset da titolo non ricarica più la pagina (v. drawTitle), quindi owned/
    // loadout/ship restano altrimenti quelli della sessione appena finita.
    try {
      for (const cat in owned) owned[cat].length = 0;
      for (const slot in STARTING_KIT) {
        const cat = SLOT2CAT[slot], id = STARTING_KIT[slot], g = EQUIP_DB[cat][id];
        owned[cat].push(id); loadout[slot] = g;
        if (slot === 'ship') { ship.maxHull = g.maxHull; ship.hull = g.maxHull; SHIPSPR = g.sprite; }
        else if (slot === 'suit') { hero.maxHp = g.maxHP; hero.hp = g.maxHP; }
      }
      ship.score = 0;
      AMMO_ITEM.bought = false;
    } catch (e) { console.warn('[STORY] reset equip fallito:', e.message); }
    salva();
    return S;
  }

  /* -------------------------------- condizioni ------------------------------- */
  // Confronto numerico del vocabolario: {gte:n} | {lte:n} | {eq:n}
  function cmp(val, spec) {
    if (spec == null) return true;
    if (typeof spec === 'number') return val === spec;
    if (spec.gte != null && !(val >= spec.gte)) return false;
    if (spec.lte != null && !(val <= spec.lte)) return false;
    if (spec.eq != null && !(val === spec.eq)) return false;
    return true;
  }
  function cristalliTotali() {
    // LUOGHI = pianeti + stazioni + satelliti + relitti atterrabili (world-gen.js):
    // i cristalli sono del luogo, non più solo dei 4 pianeti di serie.
    try { return LUOGHI.reduce((s, p) => s + (p.done || 0), 0); } catch (e) { return 0; }
  }
  function evalCond(c) {
    if (!c || typeof c !== 'object') return true;
    if (c.flag != null) return !!S.flags[c.flag];
    if (c.notFlag != null) return !S.flags[c.notFlag];
    if (c.chapter != null) return cmp(S.chapter, c.chapter);
    if (c.crystals != null) return cmp(cristalliTotali(), c.crystals);
    if (c.planetDone != null) {
      try {
        const p = LUOGHI.find(x => x.name === c.planetDone);
        return !!p && p.nCrystals > 0 && p.done >= p.nCrystals;
      } catch (e) { return false; }
    }
    if (c.decoder != null) { try { return cmp(decoder.lang, c.decoder); } catch (e) { return false; } }
    // "credits" nel pack = ship.score nel gioco (unica valuta esistente, v. SPEC §3)
    if (c.credits != null) { try { return cmp(ship.score || 0, c.credits); } catch (e) { return false; } }
    if (c.hasItem != null) {
      try { return !!(owned[c.hasItem.cat] || []).includes(c.hasItem.id); } catch (e) { return false; }
    }
    console.warn('[STORY] condizione sconosciuta, ignorata:', Object.keys(c)[0]);
    return true;
  }
  // array = AND implicito (niente OR, niente nidificazione: v. SPEC §0)
  function condOk(list) {
    if (!list) return true;
    return (Array.isArray(list) ? list : [list]).every(evalCond);
  }

  /* --------------------------------- effetti --------------------------------- */
  // Registry sostituibile: l'editor dei trigger carica QUESTO stesso file e rimpiazza
  // le funzioni con dei log, cosi' il simulatore usa il motore vero (SPEC §6).
  const effects = {
    say(a) { try { say(a.text, a.secs || 2.5); } catch (e) {} },
    // `kind`/`color` opzionali: 'humanoid' usa lo sprite di un personaggio, 'log' disegna uno
    // schermo (un registro di bordo non e' una creatura). Senza, resta il ritratto generico.
    dialog(a) {
      try {
        /* Se chi parla e' un personaggio presente sulla mappa, si riusa il SUO ritratto e la sua
           faccia: un dialogo della storia deve sembrare quel personaggio, non un estraneo.
           Altrimenti vale quello che dice il pack (`kind:'log'` per una voce senza corpo). */
        let base = null;
        try { base = ((typeof planetMap !== 'undefined' && planetMap && planetMap.critters) || []).find(c => c.name === a.name) || null; } catch (e) {}
        // `fromStory`: solo un dettaglio di rendering (dialogue-ui.js lo usa per un trattamento
        // visivo diverso), non e' vocabolario del pack — il pack non lo scrive, lo scatta il motore.
        const cr = base ? Object.assign({}, base, { lines: a.lines || [], fromStory: true })
                        : { name: a.name || '???', lines: a.lines || [], kind: a.kind, color: a.color, fromStory: true };
        openDialog(cr);
      } catch (e) {}
    },
    setFlag(a) { S.flags[a] = true; },
    clearFlag(a) { delete S.flags[a]; },
    setChapter(a) { S.chapter = a | 0; },
    // obiettivo corrente, mostrato sempre nella barra in alto: un messaggio a schermo dura
    // pochi secondi e si perde, questo resta finche' non lo cambi ('' lo toglie). Forma oggetto
    // {text,luogo} aggiunta il 26/08/2026 (PIANO_PULIZIA_REPO.md, bug P0-4): `luogo` e' il name
    // esatto di un LUOGHI, usato dal marcatore radar invece di cercare il testo libero.
    obiettivo(a) {
      if (a && typeof a === 'object') { S.obiettivo = a.text || null; S.obiettivoLuogo = a.luogo || null; }
      else { S.obiettivo = (typeof a === 'string' && a) ? a : null; S.obiettivoLuogo = null; }
    },
    give(a) {
      if (a.credits != null) { try { ship.score = (ship.score || 0) + a.credits; } catch (e) {} }
      if (a.item) {
        try {
          const { cat, id } = a.item;
          if (!EQUIP_DB[cat] || !EQUIP_DB[cat][id]) { console.warn('[STORY] give: ' + cat + '/' + id + ' non esiste in EQUIP_DB, saltato'); return; }
          if (!owned[cat].includes(id)) owned[cat].push(id);
        } catch (e) {}
      }
    },
    decoderAdd(a) { try { decoder.lang = Math.min(decoder.MAX, decoder.lang + (a | 0)); } catch (e) {} },
    addNpc(a) {
      // visibile alla PROSSIMA generazione dell'hub, non spawn immediato (v. SPEC §4)
      try { if (a && a.npc && typeof NPC_DEFS !== 'undefined') NPC_DEFS.push(a.npc); } catch (e) {}
    },
    startTimer(a) { S.timers[a.id] = (tGioco() + (a.secs || 0)); }
  };

  /* --------------------------------- trigger --------------------------------- */
  let tCorrente = 0;
  function tGioco() { return tCorrente; }

  function match(on, event, payload) {
    if (!on || on.event !== event) return false;
    // ogni campo extra in `on` e' un filtro di uguaglianza sul payload (SPEC §2)
    for (const k in on) {
      if (k === 'event') continue;
      if ((payload || {})[k] !== on[k]) return false;
    }
    return true;
  }

  function fire(event, payload) {
    if (!PACK || !PACK.triggers || !S) return;
    let cambiato = false;
    for (const t of PACK.triggers) {
      if (!t || !t.id || !match(t.on, event, payload)) continue;
      const unaVolta = t.once !== false;                 // default: una volta sola
      if (unaVolta && S.once.indexOf(t.id) >= 0) continue;
      if (!condOk(t.if)) continue;
      if (unaVolta) S.once.push(t.id);
      for (const eff of (t.do || [])) {
        const nome = Object.keys(eff)[0];
        const fn = effects[nome];
        if (!fn) { console.warn('[STORY] effetto sconosciuto, saltato:', nome); continue; }
        try { fn(eff[nome], payload); } catch (e) { console.warn('[STORY] effetto "' + nome + '" fallito:', e.message); }
      }
      cambiato = true;
    }
    if (cambiato) salva();
  }

  // Chiamata dal loop di gioco: fa scattare i timer e campiona il meteo.
  function tick(t) {
    tCorrente = t || 0;
    if (!PACK) return;
    for (const id in S.timers) {
      if (tCorrente >= S.timers[id]) { delete S.timers[id]; fire('timerDone', { id }); }
    }
  }
  // Il meteo non ha un suo evento nel gioco: lo si campiona e si segnala solo quando CAMBIA.
  function checkWeather(pianeta, t) {
    if (!PACK || !pianeta) return;
    try {
      const w = getWeather(pianeta, t).state;
      if (lastWeather[pianeta.name] !== w) {
        lastWeather[pianeta.name] = w;
        fire('weatherChange', { planet: pianeta.name, state: w });
      }
    } catch (e) {}
  }

  load();
  if (PACK) console.log('[STORY] pack v' + (PACK.version || '?') + ': ' +
    ((PACK.triggers || []).length) + ' trigger, capitolo ' + S.chapter +
    ', ' + S.once.length + ' gia\' scattati');

  return { fire, tick, checkWeather, evalCond, condOk, effects,
           save: salva, load, reset,
           usePack(p) { PACK = p || null; },   // solo per l'editor/simulatore
           setTime(t) { tCorrente = t || 0; },
           get state() { return S; },
           get pack() { return PACK; } };
})();

/* Esposizione esplicita su window: gli hook nei moduli sono scritti `window.STORY && ...`
   per restare innocui se questo file non c'e'. Una `const` a livello globale NON crea
   automaticamente la proprieta' su window (a differenza di `var`), quindi senza questa
   riga gli hook non troverebbero mai il motore — bug vero, trovato dal test di accettazione. */
if (typeof window !== 'undefined') window.STORY = STORY;
