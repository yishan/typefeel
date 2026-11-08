import { RULES_VERSION, WORDS_VERSION } from './engine.js';

export const GAME_RECORDS_KEY = 'typefeel.game.records.v1';
const empty = () => ({ version: 1, rulesVersion: RULES_VERSION, wordsVersion: WORDS_VERSION, best: 0, history: [] });
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
function valid(record) {
  return record && record.language === 'zh' && record.mode === 'survival'
    && record.rulesVersion === RULES_VERSION && record.wordsVersion === WORDS_VERSION
    && ['score', 'kills', 'bestCombo', 'time', 'level', 'at'].every(key => number(record[key]));
}

export function loadGameRecords(storage) {
  try {
    const value = JSON.parse(storage.getItem(GAME_RECORDS_KEY) || 'null');
    if (value?.version !== 1 || value.rulesVersion !== RULES_VERSION || value.wordsVersion !== WORDS_VERSION) return empty();
    const history = Array.isArray(value.history) ? value.history.filter(valid).slice(0, 20) : [];
    return { ...empty(), best: Math.max(number(value.best) ? value.best : 0, ...history.map(record => record.score)), history };
  } catch { return empty(); }
}

export function saveGameResult(storage, state) {
  const record = { score: state.score, kills: state.kills, bestCombo: state.bestCombo, time: Math.round(state.time), level: state.level,
    language: 'zh', mode: 'survival', rulesVersion: RULES_VERSION, wordsVersion: WORDS_VERSION, at: Date.now() };
  const previous = loadGameRecords(storage);
  const next = { ...previous, best: Math.max(previous.best, record.score), history: [record, ...previous.history].slice(0, 20) };
  try { storage.setItem(GAME_RECORDS_KEY, JSON.stringify(next)); return { ...next, saved: true }; }
  catch { return { ...next, saved: false }; }
}
