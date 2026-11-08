import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { createAudioPlayer } from '../packages/practice/src/audio-player.js';
import { audioHarness, samplePacks } from './helpers/audio-context.js';

test('audio switches packs, maps special keys and reuses decoded recordings', async () => {
  const { AudioContext } = audioHarness(); const ctx = new AudioContext();
  const player = createAudioPlayer(ctx, samplePacks);
  assert.equal(player.play(), false);
  assert.equal(await player.select('mxblue'), true);
  player.play(); player.play('space'); player.play('backspace');
  assert.deepEqual(ctx.sources.map(source => source.buffer.name), ['mxblue:GENERIC_R0', 'mxblue:SPACE', 'mxblue:BACKSPACE']);
  await player.select('cream'); player.play();
  assert.match(ctx.sources.at(-1).buffer.name, /^cream:/);
  await player.select('mxblue'); assert.equal(ctx.decodes, 16);
  player.dispose(); assert.equal(ctx.state, 'closed');
});

test('unready keys are dropped, stale decoding cannot switch the selected sound', async () => {
  const { AudioContext, resolveDecodes } = audioHarness({ delayDecode: true }); const ctx = new AudioContext();
  const player = createAudioPlayer(ctx, samplePacks); const blue = player.select('mxblue');
  player.play(); const cream = player.select('cream'); player.play();
  assert.equal(ctx.sources.length, 0);
  resolveDecodes(); assert.equal(await blue, false); assert.equal(await cream, true);
  assert.equal(ctx.sources.length, 0); player.play(); assert.match(ctx.sources[0].buffer.name, /^cream:/);
});

test('preview and fast typing have bounded voices; mute and stop cancel scheduled sounds', async () => {
  const { AudioContext } = audioHarness(); const ctx = new AudioContext(); const player = createAudioPlayer(ctx, samplePacks);
  await player.select('mxblue'); player.preview();
  assert.deepEqual(ctx.sources.map(s => s.started), [0, .13, .26, .39]);
  player.stop(); assert.ok(ctx.sources.every(s => s.stopped && s.disconnected));
  for (let i = 0; i < 20; i++) player.play();
  assert.equal(ctx.sources.filter(s => !s.stopped).length, 8);
  player.setVolume(0); assert.equal(player.play(), false);
  assert.ok(ctx.sources.every(s => s.stopped));
  player.setVolume(50); assert.equal(ctx.gains[0].gain.value, .25);
  await player.select('off'); assert.equal(player.play(), false);
});

test('decode and playback failures are contained, disposal invalidates pending work', async () => {
  const failure = audioHarness({ decodeError: true }); const states = [];
  const player = createAudioPlayer(new failure.AudioContext(), samplePacks, state => states.push(state));
  assert.equal(await player.select('mxblue'), false); assert.equal(states.at(-1), 'error');
  assert.equal(player.play(), false);
  const pending = audioHarness({ delayDecode: true }); const ctx = new pending.AudioContext(); const pendingStates = [];
  const late = createAudioPlayer(ctx, samplePacks, state => pendingStates.push(state));
  const ready = late.select('mxblue'); late.dispose(); pending.resolveDecodes();
  assert.equal(await ready, false); assert.deepEqual(pendingStates, ['loading']); assert.equal(ctx.closes, 1);
  const broken = audioHarness({ startError: true }); const brokenCtx = new broken.AudioContext();
  const brokenPlayer = createAudioPlayer(brokenCtx, samplePacks); await brokenPlayer.select('cream');
  assert.equal(brokenPlayer.play(), false); assert.equal(brokenCtx.sources[0].disconnected, true);
});

test('shipped audio chunk includes unchanged, attributed upstream recordings and the player', async () => {
  const manifest = JSON.parse(readFileSync(new URL('../assets/audio/kbsim/manifest.json', import.meta.url)));
  let factory;
  vm.runInNewContext(readFileSync(new URL('../dist/dsh-plugin/client.audio.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load(module) { factory = module.factory; } } }, atob,
  });
  const shipped = factory();
  assert.equal(typeof shipped.createAudioPlayer, 'function');
  assert.deepEqual(Object.keys(shipped.samples).sort(), ['cream', 'holypanda', 'mxblue', 'mxbrown']);
  for (const item of manifest.files.filter(file => file.path.endsWith('.mp3'))) {
    const [pack, , file] = item.path.split('/'); const data = Buffer.from(shipped.samples[pack][file.replace('.mp3', '')], 'base64');
    assert.equal(data.length, item.bytes); assert.equal(createHash('sha256').update(data).digest('hex'), item.sha256);
  }
  assert.match(readFileSync(new URL('../dist/dsh-plugin/THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8'), /Copyright \(c\) Thomas Lai/);
  const { AudioContext } = audioHarness(); const ctx = new AudioContext();
  const player = shipped.createAudioPlayer(ctx, shipped.samples); assert.equal(await player.select('mxblue'), true); assert.equal(player.play('space'), true);
});
