/*
   STORY PACK — "IL PORTELLO DELLA VEGA"
   Prototipo, 06/08/2026. Testo in New/STORIA_PROTOTIPO.md — se cambi le battute lì, cambiale anche qui.
   Schema in SPEC_story_pack.md. Senza questo file il gioco resta giocabile, solo muto.

   Sei momenti: incarico → a bordo → il codice → le pietre → il diario → il ritorno.
   Usa solo cose che esistono: la Kepler, il Relitto della Vega, KAELA, ZYX-9 e il portello
   che si apre col segno `portello_vega`.
*/
window.STORY_PACK = {
  version: 2,

  chapters: [
    { id: 0, label: "PROLOGO" },
    { id: 1, label: "IL PORTELLO DELLA VEGA" },
    { id: 2, label: "DOPO" }
  ],

  triggers: [
    // 0 — il primo indirizzo, altrimenti il giocatore vaga
    { id: "avvio",
      on: { event: "start" },
      do: [
        { say: { text: "La Gilda ha un incarico per te. Attracca alla STAZIONE KEPLER.", secs: 5 } },
        { obiettivo: { text: "Attracca alla Stazione Kepler e parla con KAELA", luogo: "STAZIONE KEPLER" } }
      ] },

    // 1 — l'incarico
    { id: "incarico",
      on: { event: "talk", npc: "KAELA" },
      if: [{ notFlag: "incarico" }],
      do: [
        { dialog: { name: "KAELA", lines: [
          "La Vega non risponde da nove giorni.",
          "Cargo leggero, tre persone a bordo. Rotta di rientro, nessuna chiamata di soccorso.",
          "Vai a vedere. Riporta il diario di bordo. Il resto che trovi lo tieni tu."
        ] } },
        { setFlag: "incarico" },
        { setChapter: 1 },
        { obiettivo: { text: "Raggiungi il RELITTO DELLA VEGA", luogo: "RELITTO DELLA VEGA" } }
      ] },

    // 2 — a bordo: nessuno risponde, e il portello e' chiuso dalla parte sbagliata
    { id: "a_bordo",
      on: { event: "land", planet: "RELITTO DELLA VEGA" },
      if: [{ flag: "incarico" }],
      do: [
        { dialog: { name: "A BORDO DELLA VEGA", kind: "log", color: "#8ef7ff", lines: [
          "Nessuna luce. L'aria e' ferma da nove giorni.",
          "Il portello di poppa e' sigillato. Il pannello dice: chiuso dall'interno."
        ] } },
        { setFlag: "vista_vega" },
        { obiettivo: { text: "Il portello e' sigillato: torna alla Kepler e chiedi in giro", luogo: "STAZIONE KEPLER" } }
      ] },

    // 3 — il codice: ZYX-9 quelle paratie le aveva riparate lui
    { id: "codice",
      on: { event: "talk", npc: "ZYX-9" },
      if: [{ flag: "vista_vega" }, { notFlag: "portello_vega" }],
      do: [
        { dialog: { name: "ZYX-9", lines: [
          "Bzzt. La Vega. Quelle paratie le ho riparate io, due cicli fa.",
          "Il codice del portello di poppa non l'hanno mai cambiato. Te lo do.",
          "...Pero' una domanda me la faccio. Un portello lo sigilli dall'interno per due motivi.",
          "Per tenere fuori qualcosa. O per tenerlo dentro."
        ] } },
        { setFlag: "portello_vega" },
        { obiettivo: { text: "Hai il codice: torna sulla Vega e apri il portello di poppa", luogo: "RELITTO DELLA VEGA" } }
      ] },

    // 4 — le pietre: posate, non cadute
    { id: "pietre",
      on: { event: "crystal", planet: "RELITTO DELLA VEGA" },
      do: [{ say: { text: "Due pietre-luce, posate ordinate su un telo. Non cadute: posate.", secs: 5 } }] },

    // 5 — il diario: nove giorni in quattro righe
    { id: "diario",
      on: { event: "planetComplete", planet: "RELITTO DELLA VEGA" },
      do: [
        { dialog: { name: "DIARIO DELLA VEGA", kind: "log", color: "#ffcf5c", lines: [
          "Giorno 3. Le pietre cantano quando spegniamo i motori.",
          "Giorno 6. Non stiamo piu' dormendo. Marta dice che rispondono.",
          "Giorno 9. Le chiudiamo a poppa e sigilliamo. Non e' per noi, e' per chi verra' dopo.",
          "Se stai leggendo questo: non riportarle indietro."
        ] } },
        { setFlag: "diario_letto" },
        { obiettivo: { text: "Torna da KAELA alla Stazione Kepler", luogo: "STAZIONE KEPLER" } }
      ] },

    // 6 — il ritorno: la domanda a cui il gioco non ti fa rispondere
    { id: "ritorno",
      on: { event: "talk", npc: "KAELA" },
      if: [{ flag: "diario_letto" }],
      do: [
        { dialog: { name: "KAELA", lines: [
          "Le hai prese, vero.",
          "Non ti chiedo cosa c'era scritto.",
          "Ti chiedo una cosa sola. Hai richiuso il portello?"
        ] } },
        { setChapter: 2 },
        { obiettivo: "" }
      ] }
  ]
};
