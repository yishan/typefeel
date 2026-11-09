import { RULES_VERSION, WORDS_VERSION } from './engine.js';

export const GAME_RECORDS_KEY = 'typefeel.game.records.v1';
const empty = () => ({ version: 1, rulesVersion: RULES_VERSION, wordsVersion: WORDS_VERSION, best: 0, bests: {}, history: [] });
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
function valid(record) {
  return record && record.language === 'zh' && record.mode === 'survival'
    && Number.isInteger(record.rulesVersion) && record.rulesVersion >= 1 && record.rulesVersion <= RULES_VERSION && record.wordsVersion === WORDS_VERSION
    && ['score', 'kills', 'bestCombo', 'time', 'level', 'at'].every(key => number(record[key]));
}

export function loadGameRecords(storage, key = GAME_RECORDS_KEY) {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    if (value?.version !== 1 || !Number.isInteger(value.rulesVersion) || value.rulesVersion < 1
      || value.rulesVersion > RULES_VERSION || value.wordsVersion !== WORDS_VERSION) return empty();
    const history = Array.isArray(value.history) ? value.history.filter(valid).slice(0, 20) : [];
    const bests = {};
    for (let rules = 1; rules <= RULES_VERSION; rules++) {
      bests[rules] = Math.max(number(value.bests?.[rules]) ? value.bests[rules] : 0,
        value.rulesVersion === rules && number(value.best) ? value.best : 0,
        ...history.filter(record => record.rulesVersion === rules).map(record => record.score));
    }
    return { ...empty(), best: bests[RULES_VERSION], bests, history };
  } catch { return empty(); }
}

export function saveGameResult(storage, state, key = GAME_RECORDS_KEY) {
  const record = { score: state.score, kills: state.kills, bestCombo: state.bestCombo, time: Math.round(state.time), level: state.level,
    language: 'zh', mode: 'survival', rulesVersion: RULES_VERSION, wordsVersion: WORDS_VERSION, at: Date.now() };
  const previous = loadGameRecords(storage, key);
  const best = Math.max(previous.best, record.score);
  const next = { ...previous, best, bests: { ...previous.bests, [RULES_VERSION]: best }, history: [record, ...previous.history].slice(0, 20) };
  try { storage.setItem(key, JSON.stringify(next)); return { ...next, saved: true }; }
  catch { return { ...next, saved: false }; }
}
