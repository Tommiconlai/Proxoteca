// Self-check del parser. Esegui: node src/utils/scryfall.selfcheck.js
// ponytail: niente framework — un file, assert via throw, copre i rami di parseCardList.
import { parseCardList } from './scryfall.js';

const eq = (a, b, msg) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg}\n  atteso ${JSON.stringify(b)}\n  ottenuto ${JSON.stringify(a)}`);
  }
};

eq(parseCardList('1x Sol Ring'), [{ qty: 1, name: 'Sol Ring', set: '', collector: '' }], 'semplice');
eq(parseCardList('3 Brainstorm'), [{ qty: 3, name: 'Brainstorm', set: '', collector: '' }], 'qty senza x');
eq(parseCardList('1x Sol Ring (C21) 263 *F*'), [{ qty: 1, name: 'Sol Ring', set: 'c21', collector: '263' }], 'set+collector+foil');
eq(parseCardList('Lightning Bolt (LEA)'), [{ qty: 1, name: 'Lightning Bolt', set: 'lea', collector: '' }], 'solo set');
eq(parseCardList('1996 World Champion'), [{ qty: 1, name: '1996 World Champion', set: '', collector: '' }], 'numero iniziale non è qty');
eq(parseCardList('2x Fable of the Mirror-Breaker'), [{ qty: 2, name: 'Fable of the Mirror-Breaker', set: '', collector: '' }], 'nome con trattino');
eq(parseCardList('1 Birgi, God of Storytelling // Harnfel, Horn of Bounty'), [{ qty: 1, name: 'Birgi, God of Storytelling', set: '', collector: '' }], 'DFC → faccia anteriore');
eq(parseCardList('1x Fire // Ice (APC) 128'), [{ qty: 1, name: 'Fire', set: 'apc', collector: '128' }], 'split + faccia anteriore + set');
eq(parseCardList('\n  \n'), [], 'righe vuote');

console.log('parseCardList: tutti i check passati');
