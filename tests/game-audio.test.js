import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameAudio, loadGameAudioPreferences, saveGameAudioPreferences, GAME_AUDIO_KEY, KEYBOARD_AUDIO_KEY } from '../packages/practice/src/game/audio.js';
import { createAudioPlayer } from '../packages/practice/src/audio-player.js';
import { audioHarness, samplePacks } from './helpers/audio-context.js';

const preferences = () => ({ effects: { enabled: true, volume: 35 }, keyboard: { enabled: true, pack: 'mxblue', volume: 30 } });
const module = { createAudioPlayer, samples: samplePacks };
const round = () => ({ state: { status: 'running', kills: 0, misses: 0 } });
const store = initial => { const values = new Map(initial); return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), values }; };

test('game audio settings share the four keyboard packs and volume with web practice', () => {
  const storage = store([[KEYBOARD_AUDIO_KEY, JSON.stringify({ version: 1, pack: 'cream', volume: 65 })]]);
  const saved = loadGameAudioPreferences(storage);
  assert.deepEqual(saved.keyboard, { enabled: true, pack: 'cream', volume: 65 });
  assert.equal(saved.effects.enabled, true);
  saved.keyboard = { enabled: false, pack: 'cream', volume: 40 };
  assert.equal(saveGameAudioPreferences(storage, saved, 'keyboard'), true);
  assert.deepEqual(JSON.parse(storage.getItem(KEYBOARD_AUDIO_KEY)), { version: 1, pack: 'off', volume: 40 });
  assert.equal(loadGameAudioPreferences(storage).keyboard.pack, 'cream');
  saved.effects = { enabled: false, volume: 70 };
  saveGameAudioPreferences(storage, saved, 'effects');
  assert.equal(JSON.parse(storage.getItem(KEYBOARD_AUDIO_KEY)).pack, 'off');
  assert.equal(loadGameAudioPreferences(storage).effects.volume, 70);
});

test('audio preferences tolerate corrupt values and report storage failures', () => {
  const storage = store([[GAME_AUDIO_KEY, JSON.stringify({ version: 1, effects: { enabled: 'yes', volume: -20 }, keyboardPack: 'invalid' })],
    [KEYBOARD_AUDIO_KEY, JSON.stringify({ version: 1, pack: 'invalid', volume: 999 })]]);
  const pref = loadGameAudioPreferences(storage);
  assert.equal(pref.effects.enabled, true);
  assert.equal(pref.effects.volume, 0);
  assert.equal(pref.keyboard.pack, 'mxblue');
  assert.equal(pref.keyboard.volume, 100);
  const broken = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(loadGameAudioPreferences(broken).keyboard.enabled, false);
  assert.equal(saveGameAudioPreferences(broken, preferences(), 'effects'), false);
});

test('hits and landings produce distinct cues once per event, without replay after pause', async () => {
  const harness = audioHarness();
  const audio = createGameAudio({ AudioContext: harness.AudioContext, loadAudio: async () => module, preferences: preferences() });
  await audio.prepare(); const engine = round(); audio.observe(engine);
  engine.state.kills = 1; audio.observe(engine); audio.observe(engine);
  assert.equal(harness.contexts[0].oscillators.length, 1);
  engine.state.misses = 1; audio.observe(engine);
  assert.equal(harness.contexts[0].oscillators.length, 2);
  assert.notEqual(harness.contexts[0].oscillators[0].frequency.events[0].value, harness.contexts[0].oscillators[1].frequency.events[0].value);
  engine.state.status = 'paused'; engine.state.kills = 2; audio.observe(engine);
  engine.state.status = 'running'; audio.observe(engine);
  assert.equal(harness.contexts[0].oscillators.length, 2);
  audio.dispose();
});

test('keyboard and game switches and volumes work independently', async () => {
  const harness = audioHarness(); const pref = preferences();
  const audio = createGameAudio({ AudioContext: harness.AudioContext, loadAudio: async () => module, preferences: pref });
  await audio.prepare();
  assert.equal(audio.key({ key: 'a' }), true);
  audio.configure({ ...pref, effects: { enabled: false, volume: 35 } });
  assert.equal(audio.key({ key: 'b' }), true);
  const engine = round(); audio.observe(engine); engine.state.kills = 1; audio.observe(engine);
  assert.equal(harness.contexts[0].oscillators.length, 0);
  audio.configure({ ...pref, keyboard: { ...pref.keyboard, enabled: false } });
  assert.equal(audio.key({ key: 'c' }), false);
  engine.state.kills = 2; audio.observe(engine);
  assert.equal(harness.contexts[0].oscillators.length, 1);
  audio.configure({ ...pref, effects: { enabled: true, volume: 0 }, keyboard: { ...pref.keyboard, volume: 0 } });
  assert.equal(audio.key({ key: 'd' }), false);
  engine.state.kills = 3; audio.observe(engine);
  assert.equal(harness.contexts[0].oscillators.length, 1);
  audio.dispose();
});

test('each keyboard pack uses the existing recordings and only physical key events make keyboard sounds', async () => {
  const harness = audioHarness(); let pref = preferences();
  const audio = createGameAudio({ AudioContext: harness.AudioContext, loadAudio: async () => module, preferences: pref });
  for (const pack of ['mxblue', 'mxbrown', 'cream', 'holypanda']) {
    pref = { ...pref, keyboard: { ...pref.keyboard, pack } }; audio.configure(pref); await audio.prepare();
    assert.equal(audio.key({ key: 'a' }), true);
    assert.match(harness.contexts[0].sources.at(-1).buffer.name, new RegExp(`^${pack}:`));
  }
  const before = harness.contexts[0].sources.length;
  for (const event of [{ key: 'Tab' }, { key: 'p', metaKey: true }, { key: 'a', repeat: true }, { key: 'Enter' }]) assert.equal(audio.key(event), false);
  assert.equal(harness.contexts[0].sources.length, before);
  assert.equal(audio.key({ key: 'Enter', isComposing: true }), true);
  audio.dispose();
});

test('late loading does not replay keys or previews after stop and disposal closes the context once', async () => {
  const harness = audioHarness({ delayDecode: true }); let pref = preferences();
  const audio = createGameAudio({ AudioContext: harness.AudioContext, loadAudio: async () => module, preferences: pref });
  const preparing = audio.prepare();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(audio.key({ key: 'a' }), false);
  const preview = audio.previewKeyboard(); audio.stop();
  harness.resolveDecodes(); await preparing; await preview;
  assert.equal(harness.contexts[0].sources.length, 0);
  audio.key({ key: 'b' }); audio.previewEffects(); audio.stop();
  assert.ok(harness.contexts[0].sources.every(source => source.stopped));
  assert.ok(harness.contexts[0].oscillators.every(source => source.cancelled));
  audio.dispose(); assert.equal(harness.contexts[0].closes, 1);
});

test('a late keyboard import cannot create a player or play a preview after disposal', async () => {
  const harness = audioHarness(); let resolve;
  const pending = new Promise(done => { resolve = done; });
  const audio = createGameAudio({ AudioContext: harness.AudioContext, loadAudio: () => pending, preferences: preferences() });
  const preview = audio.previewKeyboard();
  await new Promise(done => setImmediate(done));
  audio.dispose(); resolve(module); await preview;
  assert.equal(harness.contexts[0].sources.length, 0);
  assert.equal(harness.contexts[0].closes, 1);
});

test('a failed keyboard download leaves the game cues usable', async () => {
  const harness = audioHarness(); const statuses = [];
  const audio = createGameAudio({ AudioContext: harness.AudioContext, loadAudio: async () => { throw Error('missing'); },
    preferences: preferences(), onStatus: (group, status) => statuses.push([group, status]) });
  assert.equal(await audio.prepare(), true);
  assert.equal(audio.key({ key: 'a' }), false);
  const engine = round(); audio.observe(engine); engine.state.kills++; audio.observe(engine);
  assert.equal(harness.contexts[0].oscillators.length, 1);
  assert.ok(statuses.some(([group, status]) => group === 'keyboard' && status === 'error'));
  audio.dispose();
});

test('unsupported or rejected audio never throws through gameplay and suspended contexts resume on a gesture', async () => {
  const missing = createGameAudio({ AudioContext: undefined, loadAudio: async () => module, preferences: preferences() });
  assert.equal(await missing.prepare(), false);
  const harness = audioHarness({ state: 'suspended', resumeError: true });
  const audio = createGameAudio({ AudioContext: harness.AudioContext, loadAudio: async () => module, preferences: preferences() });
  assert.equal(await audio.prepare(), false);
  assert.equal(audio.key({ key: 'a' }), false);
  audio.dispose(); missing.dispose();
});
