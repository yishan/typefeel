import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameEngine, gameWords } from '../packages/practice/src/game/engine.js';

function game(words = ['春天', '山', '阅读', '雨', '河流', '风'], config = {}) {
  const engine = createGameEngine({ words, random: () => 0, config: { countdownMs: 0, spawnMs: 2400, fallMs: 9000, maxTargets: 5, ...config } });
  engine.start(0); engine.tick(0);
  return engine;
}

test('game corpus has unique canonical single characters and complete two-character words', () => {
  assert.ok(gameWords.length >= 80);
  assert.equal(new Set(gameWords).size, gameWords.length);
  assert.ok(gameWords.every(text => /^[\p{Script=Han}]{1,2}$/u.test(text)));
  assert.ok(gameWords.some(text => [...text].length === 1));
  assert.ok(gameWords.some(text => [...text].length === 2));
});

test('default level one starts at the former level three difficulty', () => {
  const engine = createGameEngine({ words: ['山', '水', '雨', '火'], random: () => 0, config: { countdownMs: 0 } });
  engine.start(0); engine.tick(0);
  assert.equal(engine.state.level, 1);
  assert.equal(engine.state.targets[0].fallMs, 8200);
  engine.tick(2160);
  assert.ok(engine.state.targets.some(target => target.bornAt === 2160));
});

test('default level one permits six visible targets', () => {
  const engine = createGameEngine({ words: ['山', '水', '雨', '火', '风', '云', '天'], lanes: 7,
    random: () => 0, config: { countdownMs: 0, fallMs: 100000 } });
  engine.start(0); engine.tick(12000);
  assert.equal(engine.state.targets.length, 6);
});

test('countdown does not spend lives or survival time and starts with a target', () => {
  const engine = createGameEngine({ words: ['春天'], random: () => 0 });
  engine.start(100);
  engine.tick(2099);
  assert.equal(engine.state.status, 'countdown');
  assert.equal(engine.state.time, 0);
  assert.equal(engine.state.targets.length, 0);
  engine.tick(3100);
  assert.equal(engine.state.status, 'running');
  assert.equal(engine.state.targets[0].text, '春天');
  assert.equal(engine.state.time, 0);
});

test('each confirmed string must equal a whole target and is cleared after success or failure', () => {
  const engine = game();
  assert.equal(engine.submit('春', 100), '');
  assert.equal(engine.state.error, true);
  assert.equal(engine.state.shots.length, 0);
  assert.equal(engine.submit('天', 150), '');
  assert.equal(engine.state.kills, 0);
  engine.submit('春天', 200);
  assert.equal(engine.state.score, 20);
  assert.equal(engine.state.error, false);
  assert.equal(engine.state.kills, 1);
  assert.equal(engine.state.shots.length, 1);
  assert.equal(engine.state.targets[0].status, 'hit');
  engine.submit('', 201);
  assert.equal(engine.state.score, 20);
  engine.tick(500);
  assert.equal(engine.state.targets.length, 0);
});

test('an extra suffix rejects the entire attempt without a partial kill or a retained suffix', () => {
  const engine = game(); engine.tick(2400);
  assert.deepEqual(engine.state.targets.map(target => target.text), ['春天', '山']);
  assert.equal(engine.submit('春天错', 2401), '');
  assert.equal(engine.state.score, 0);
  assert.equal(engine.state.kills, 0);
  assert.equal(engine.state.shots.length, 0);
  assert.ok(engine.state.targets.every(target => target.status === 'falling'));
  assert.equal(engine.state.error, true);
});

test('concatenating two complete targets is one unmatched attempt', () => {
  const engine = game(); engine.tick(2400);
  assert.equal(engine.submit('春天山', 2401), '');
  assert.equal(engine.state.score, 0);
  assert.equal(engine.state.error, true);
});

test('wrong input is cleared without costing a life and the next complete word can still hit', () => {
  const engine = game(); engine.submit('春错', 100);
  assert.equal(engine.state.error, true);
  assert.equal(engine.state.lives, 5);
  assert.equal(engine.submit('春', 200), '');
  assert.equal(engine.state.error, true);
  engine.submit('春天', 300);
  assert.equal(engine.state.kills, 1);
  assert.equal(engine.state.error, false);
});

test('spawns never duplicate a visible word or introduce whole-word prefix ambiguity', () => {
  const engine = game(['天', '天空', '天气', '山'], { spawnMs: 100 });
  engine.tick(500);
  const texts = engine.state.targets.map(target => target.text);
  assert.deepEqual(texts, ['天', '山']);
  for (const a of texts) for (const b of texts) if (a !== b) assert.equal(a.startsWith(b), false);
});

test('a shot just before the deadline guarantees the kill even while the projectile is flying', () => {
  const engine = game(['山'], { fallMs: 1000 });
  engine.submit('山', 999);
  engine.tick(1001);
  assert.equal(engine.state.lives, 5);
  assert.equal(engine.state.kills, 1);
  assert.equal(engine.state.targets[0].status, 'hit');
});

test('a commit exactly at the deadline misses, and each missed target costs one life only', () => {
  const engine = game(['山'], { fallMs: 1000 });
  engine.submit('山', 1000);
  assert.equal(engine.state.lives, 4);
  assert.equal(engine.state.kills, 0);
  engine.tick(1001); engine.tick(2000);
  assert.equal(engine.state.lives, 4);
});

test('pause freezes targets, shots and the game clock; resume excludes the whole pause', () => {
  const engine = game(); engine.tick(400);
  engine.pause(500);
  engine.tick(100000);
  assert.equal(engine.state.time, 500);
  assert.equal(engine.state.status, 'paused');
  engine.resume(100000); engine.tick(100100);
  assert.equal(engine.state.time, 600);
  assert.equal(engine.state.lives, 5);
});

test('large frame gaps and small frames produce the same spawn and miss results', () => {
  const fast = game(); const slow = game();
  for (let t = 0; t <= 15000; t += 50) fast.tick(t);
  slow.tick(15000);
  for (const field of ['score', 'lives', 'time', 'level', 'kills']) assert.equal(fast.state[field], slow.state[field]);
  assert.deepEqual(fast.state.targets, slow.state.targets);
});

test('zero lives ends at the actual death time and late input cannot change the result', () => {
  const engine = game(['山'], { fallMs: 1000, spawnMs: 1500, lives: 2 });
  engine.tick(10000);
  assert.equal(engine.state.status, 'ended');
  assert.equal(engine.state.lives, 0);
  assert.equal(engine.state.time, 2500);
  engine.submit('山', 20000); engine.tick(30000);
  assert.equal(engine.state.kills, 0);
  assert.equal(engine.state.time, 2500);
});

test('changing lanes while paused preserves progress and a new engine owns an independent round', () => {
  const first = game(); first.pause(500);
  first.setLanes(2);
  assert.equal(first.state.time, 500);
  assert.ok(first.state.targets.every(target => target.lane < 2));
  const second = game(); second.submit('春天', 100);
  assert.equal(first.state.kills, 0);
  assert.equal(second.state.kills, 1);
});

test('level two actually spawns faster and gives new single-character targets less falling time', () => {
  const engine = game(['山', '水', '风', '雨', '火', '云'], { lives: 1000 });
  engine.tick(31200);
  assert.equal(engine.state.level, 2);
  assert.equal(engine.state.targets.find(target => target.bornAt === 31200).fallMs, 8600);
  engine.tick(33480);
  assert.ok(engine.state.targets.some(target => target.bornAt === 33480));
});
