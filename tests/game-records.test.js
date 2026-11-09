import assert from 'node:assert/strict';
import test from 'node:test';
import { loadGameRecords, saveGameResult, GAME_RECORDS_KEY } from '../packages/practice/src/game/records.js';
import { RULES_VERSION } from '../packages/practice/src/game/engine.js';

const result = { score: 120, kills: 8, bestCombo: 5, time: 32100, level: 2 };
function store(initial) { const data = new Map(initial); return { data, getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }; }

test('game results use isolated versioned storage and keep a bounded history', () => {
  const storage = store([['typefeel.practice.v4', 'unchanged']]);
  for (let i = 0; i < 30; i++) saveGameResult(storage, { ...result, score: i * 10 });
  const records = loadGameRecords(storage);
  assert.equal(records.history.length, 20);
  assert.equal(records.best, 290);
  assert.equal(storage.getItem('typefeel.practice.v4'), 'unchanged');
  assert.equal(records.history[0].rulesVersion, RULES_VERSION);
});

test('the harder starting difficulty has a separate best while preserving earlier game records', () => {
  const oldRecord = { ...result, language: 'zh', mode: 'survival', rulesVersion: 1, wordsVersion: 1, at: 123 };
  const storage = store([[GAME_RECORDS_KEY, JSON.stringify({ version: 1, rulesVersion: 1, wordsVersion: 1, best: 500, history: [oldRecord] })]]);
  const current = loadGameRecords(storage);
  assert.equal(current.best, 0);
  assert.equal(current.history[0].score, 120);
  saveGameResult(storage, result);
  const saved = JSON.parse(storage.getItem(GAME_RECORDS_KEY));
  assert.equal(saved.history.length, 2);
  assert.equal(saved.history[1].rulesVersion, 1);
  assert.equal(saved.bests['1'], 500);
  assert.equal(loadGameRecords(storage).best, 120);
});

test('invalid or unavailable storage safely defaults and write failures are reported', () => {
  const storage = store([[GAME_RECORDS_KEY, '{bad']]);
  assert.equal(loadGameRecords(storage).best, 0);
  storage.setItem(GAME_RECORDS_KEY, JSON.stringify({ version: 1, best: Infinity, history: [{ score: -5 }, { ...result, score: '900' }] }));
  assert.equal(loadGameRecords(storage).history.length, 0);
  const broken = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(loadGameRecords(broken).best, 0);
  assert.equal(saveGameResult(broken, result).saved, false);
});

test('a lower score does not replace the best and stored records include rule and corpus identity', () => {
  const storage = store(); saveGameResult(storage, result);
  saveGameResult(storage, { ...result, score: 10 });
  const records = loadGameRecords(storage);
  assert.equal(records.best, 120);
  assert.equal(records.history[0].language, 'zh');
  assert.equal(records.history[0].wordsVersion, 1);
  assert.equal(records.history[0].mode, 'survival');
});

test('DSH game records use the supplied key and preserve web and existing DSH practice records', () => {
  const key = 'dsh.typing-practice.game.records.v1';
  const storage = store([[GAME_RECORDS_KEY, 'web-records'], ['dsh.typing-practice.v4', 'practice-records']]);
  saveGameResult(storage, result, key);
  assert.equal(loadGameRecords(storage, key).best, 120);
  assert.equal(storage.getItem(GAME_RECORDS_KEY), 'web-records');
  assert.equal(storage.getItem('dsh.typing-practice.v4'), 'practice-records');
  assert.equal(JSON.parse(storage.getItem(key)).history[0].score, 120);
});
