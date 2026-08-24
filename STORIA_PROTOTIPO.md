# IL PORTELLO DELLA VEGA — storia del prototipo

*Prima stesura, 06/08/2026. **È una bozza da correggere, non un testo definitivo**: le voci sono le tue,
cambiale finché non suonano giuste. Quando il testo ti convince, si monta nello story editor in un pomeriggio.*

---

## Premessa

Un cargo leggero, la **Vega**, non risponde da nove giorni. Rotta di rientro regolare, nessuna chiamata di
soccorso, tre persone a bordo. La Gilda manda te a recuperare il diario di bordo.

Quello che trovi non è un incidente. È una decisione.

**Dura 15-20 minuti. Tre luoghi: Stazione Kepler → Relitto della Vega → Stazione Kepler.**

---

## I sei momenti

### 1 — L'incarico
- **Quando scatta:** parli con KAELA alla Kepler (la prima volta)
- **Chi parla:** KAELA
- **Cosa dice:**
  > La Vega non risponde da nove giorni.
  >
  > Cargo leggero, tre persone a bordo. Rotta di rientro, nessuna chiamata di soccorso.
  >
  > Vai a vedere. Riporta il diario di bordo. Il resto che trovi lo tieni tu.
- **Cosa cambia:** parte il capitolo. Sulla mappa sai dov'è il relitto.

### 2 — A bordo
- **Quando scatta:** atterri sul Relitto della Vega
- **Chi parla:** nessuno — un messaggio a schermo
- **Cosa dice:**
  > Nessuna luce. L'aria è ferma da nove giorni.
  >
  > Il portello di poppa è sigillato. Il pannello dice: **chiuso dall'interno**.
- **Cosa cambia:** un segno che ricorda che ci sei stato *(nel gioco: `vista_vega`)*

### 3 — Il codice
- **Quando scatta:** torni alla Kepler e parli con ZYX-9 *(solo se sei già stato sulla Vega)*
- **Chi parla:** ZYX-9
- **Cosa dice:**
  > Bzzt. La Vega. Quelle paratie le ho riparate io, due cicli fa.
  >
  > Il codice del portello di poppa non l'hanno mai cambiato. Te lo do.
  >
  > ...Però una domanda me la faccio. Un portello lo sigilli dall'interno per due motivi.
  >
  > Per tenere fuori qualcosa. O per tenerlo dentro.
- **Cosa cambia:** **si apre il portello** *(nel gioco: il segno `portello_vega`, che è già la chiave del cancello)*

### 4 — Dietro il portello
- **Quando scatta:** raccogli una pietra-luce sul relitto
- **Chi parla:** nessuno — messaggio a schermo
- **Cosa dice:**
  > Due pietre-luce, posate ordinate su un telo.
  >
  > Non cadute. Posate.
- **Cosa cambia:** niente. Serve solo a farti venire un dubbio.

### 5 — Il diario
- **Quando scatta:** hai raccolto tutte e due le pietre del relitto
- **Chi parla:** DIARIO DELLA VEGA *(una voce, non una persona)*
- **Cosa dice:**
  > Giorno 3. Le pietre cantano quando spegniamo i motori.
  >
  > Giorno 6. Non stiamo più dormendo. Marta dice che rispondono.
  >
  > Giorno 9. Le chiudiamo a poppa e sigilliamo. Non è per noi, è per chi verrà dopo.
  >
  > Se stai leggendo questo: non riportarle indietro.
- **Cosa cambia:** un segno *(`diario_letto`)*. E il giocatore si accorge che le pietre ce le ha già in tasca.

### 6 — Il ritorno
- **Quando scatta:** torni alla Kepler e parli con KAELA *(solo se hai letto il diario)*
- **Chi parla:** KAELA
- **Cosa dice:**
  > Le hai prese, vero.
  >
  > Non ti chiedo cosa c'era scritto.
  >
  > Ti chiedo una cosa sola. **Hai richiuso il portello?**
- **Cosa cambia:** finisce qui.

---

## Il finale

Nessuna ricompensa, nessuna schermata di vittoria. L'ultima battuta è una domanda a cui il gioco **non ti fa
rispondere** — e il giocatore sa benissimo di non aver richiuso niente.

Se il prototipo piacerà, questo è anche un buon punto da cui ripartire: le pietre sono in giro, e qualcuno
alla Gilda sapeva già.

---

## Serve qualcosa di nuovo?

| | quali | serve davvero? |
|---|---|---|
| Luoghi nuovi | **nessuno** — Kepler e Relitto della Vega esistono già | no |
| Personaggi nuovi | **nessuno** — KAELA e ZYX-9 sono già in gioco; il "diario" è una voce senza corpo, e il motore lo permette | no |
| Immagini nuove | **nessuna** | no |
| Cose che il gioco non sa fare | **nessuna**: incarico, portello che si apre col codice, pietre e diario usano roba che c'è | no |

**Il mondo è già quasi allineato**: il relitto ha due pietre e un portello chiuso dal segno `portello_vega`, e
ZYX-9 quel segno lo dà già. Da montare restano solo le battute e l'ordine dei momenti.

---

## Cosa correggere leggendo (le domande giuste da farsi)

- Le voci di KAELA e ZYX-9 suonano come le loro? Oggi KAELA parla di kit medici e tempeste, ZYX-9 fa "bzzt".
- La battuta finale regge, o è troppo?
- Nove giorni sono i giusti? Tre persone a bordo sono le giuste?
- "Marta" è un nome che ci sta, o vuoi qualcosa di meno terrestre?
- Il diario dice di non riportarle indietro. **Il gioco però ti premia per averle prese.** È una contraddizione
  voluta — funziona o dà fastidio?
