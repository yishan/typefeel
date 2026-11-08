import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameEngine, gameWords } from '../packages/practice/src/game/engine.js';

function game(words = ['春天', '山', '阅读', '雨', '河流', '风'], config = {}) {
  const engine = createGameEngine({ words, random: () => 0, config: { countdownMs: 0, ...config } });
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

test('a partial committed word waits, then one whole word reserves exactly one target', () => {
  const engine = game();
  engine.submit('春', 100);
  assert.equal(engine.state.buffer, '春');
  assert.equal(engine.state.error, false);
  assert.equal(engine.state.shots.length, 0);
  engine.submit('春天', 200);
  assert.equal(engine.state.score, 20);
  assert.equal(engine.state.buffer, '');
  assert.equal(engine.state.kills, 1);
  assert.equal(engine.state.shots.length, 1);
  assert.equal(engine.state.targets[0].status, 'hit');
  engine.submit('', 201);
  assert.equal(engine.state.score, 20);
  engine.tick(500);
  assert.equal(engine.state.targets.length, 0);
});

test('one native commit can consume several distinct complete targets in order', () => {
  const engine = game(); engine.tick(2400);
  assert.deepEqual(engine.state.targets.map(target => target.text), ['春天', '山']);
  engine.submit('春天山错', 2401);
  assert.equal(engine.state.score, 30);
  assert.equal(engine.state.kills, 2);
  assert.equal(engine.state.buffer, '错');
  assert.equal(engine.state.error, true);
});

test('wrong input stays editable and never costs a life; backspace can restore a prefix', () => {
  const engine = game(); engine.submit('春错', 100);
  assert.equal(engine.state.error, true);
  assert.equal(engine.state.lives, 5);
  engine.submit('春', 200);
  assert.equal(engine.state.error, false);
  engine.submit('春天', 300);
  assert.equal(engine.state.kills, 1);
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
