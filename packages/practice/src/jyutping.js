import { customize } from 'to-jyutping';
import { alignReadings } from './annotations.js';

// Context corrections for the authored passages: walking (行 haang4),
// returning home (返 faan1). Keep the original target text untouched.
const engine = customize({
  '慢慢行': 'maan6 maan6 haang4',
  '返到屋企': 'faan1 dou3 uk1 kei2',
});

export function annotate(text) {
  return alignReadings(text, engine.getJyutpingList(text), 'yue');
}
