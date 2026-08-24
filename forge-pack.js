/* forge-pack.js — pack dati per NPC alieni della Stazione Kepler.
   Schema invariato, già previsto e collaudato dal gioco (index.html riga 1741:
   NPC_DEFS = BASE_NPCS.concat((FORGE&&FORGE.npcs)||[])) — nessuna modifica al codice del gioco,
   solo nuove voci che si aggiungono a ZYX-9/KAELA/BLOB già esistenti. Merge non distruttivo:
   se questo file manca, il gioco è identico a oggi.
   Le 5 specie A3/A4/A5/A7/A8 di ASSET_PROMPTS.md (rettiliano, insettoide, etereo precursore,
   drone manutenzione, androide di sicurezza) prendono qui una voce di dialogo — A1/A2/A6 non
   servono (A1/A2 sono la base umana del giocatore, A6 è già in gioco come tribù VULKAN-9).
   2 voci in più ispirate alle navi predone (ASSET_PROMPTS sez. J): non ostili (i predoni restano
   solo nemici delle ondate spaziali), sono personaggi di passaggio alla stazione con la stessa
   tavolozza delle rispettive navi — un'eco visiva, non un'integrazione del combattimento a terra. */
window.FORGE_PACK = {
  npcs: [
    // A3 — Rettiliano (verde squamoso, veste viola)
    { kind:'humanoid', name:'SSKARR', suit:'#7a4a9d', skin:'#3f9d5c', hair:'#2f7d47', hairStyle:0,
      lines:['Ssss... la tua pelle nuda mi pare fragile, straniero.',
             'Vengo da un mondo di foglie e calore umido — qui il metallo mi punge gli artigli.',
             'Le tue navi puzzano di fumo. Le nostre di resina. Ci somigliamo più di quanto credi.'] },
    // A4 — Insettoide (esoscheletro blu-viola)
    { kind:'humanoid', name:'KLIXX', suit:'#3a3a7a', skin:'#5a5aa8', hair:'#4a4a8a', hairStyle:0,
      lines:['*un ticchettio ritmico di mandibole*',
             'Il mio sciame ha attraversato tre soli per raggiungere questa stazione.',
             'Le dune di DUNAR assomigliano a casa. Troppo, a volte.'] },
    // A5 — Etereo Precursore (pelle translucida, bagliore psionico) — eco della lore Fermi/Grande Filtro
    { kind:'humanoid', name:'VESH\'IEL', suit:'#8fb8d0', skin:'#cfe8f5', hair:'#eafcff', hairStyle:1,
      lines:['Il tuo popolo è giovane. Il mio non ricorda più quando è nato.',
             'Viaggiamo da eoni, senza un mondo da chiamare casa.',
             'Sento un grande silenzio nel vostro cielo. Qualcuno lo ha lasciato vuoto, molto tempo fa.'] },
    // A7 — Drone di manutenzione (arancio/grigio)
    { kind:'humanoid', name:'RATTLE-9', suit:'#c9742a', skin:'#9a9fa8', hair:'#8a8f9e', hairStyle:2,
      lines:['CLIC. Unità di manutenzione, in servizio da 340 cicli.',
             'Le condotte di questa stazione perdono ossigeno al 3%. A nessuno pare importare.',
             'Se trovi un bullone allentato, ti prego, non calciarlo di nuovo nel vuoto.'] },
    // A8 — Androide di sicurezza (grigio-argento, accenti rossi, casco a visiera già nel design originale)
    { kind:'humanoid', name:'UNIT-7', suit:'#7a8290', skin:'#b8bfc9', hair:'#7a8290', hairStyle:2,
      lines:['Scansione completata. Nessuna minaccia rilevata. Per ora.',
             'Sono stato assemblato qui, sulla Kepler. Non ho altro pianeta da rimpiangere.',
             'I predoni non si avvicinano quando sono di turno — le mie statistiche dicono che dovrebbe bastarmi per sentirmi sicuro.'] },
    // Eco di Marauder Fang (J1: scafo rugginoso rosso-bruno, strisce gialle) — non ostile, un raider ritirato
    { kind:'humanoid', name:'GRIT', suit:'#8a4a2a', skin:'#c9a883', hair:'#3a2a1a', hairStyle:0,
      lines:['Una volta la mia nave portava strisce gialle e un nome che non dico più.',
             'Ho lasciato la rotta dei predoni. Non l\'hanno presa bene.',
             'Se vedi uno scafo rugginoso avvicinarsi, offrimi da bere prima di correre.'] },
    // Eco di Void Reaver (J2: nero opaco, bagliore verde malato) — non ostile, solo inquietante
    { kind:'humanoid', name:'NYX', suit:'#22262e', skin:'#3a4a3a', hair:'#1a2018', hairStyle:0,
      lines:['*due punti verdi ti osservano da sotto un cappuccio scuro*',
             'Il vuoto tra le stelle non è vuoto come credi.',
             'Chi ha visto quel che ho visto io, non torna a dormire tranquillo.'] }
  ]
};
