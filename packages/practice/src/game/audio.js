import { SOUND_PACKS, soundPreference, keySoundKind } from '../keyboard-sound.js';
import { createGameEffects } from './effects.js';

export const GAME_AUDIO_KEY = 'typefeel.game.audio.v1';
export const KEYBOARD_AUDIO_KEY = 'typefeel.practice.sound.v1';
export const KEYBOARD_PACKS = SOUND_PACKS.filter(pack => pack !== 'off');
const volume = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : fallback;
function read(storage, key) { try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; } }

export function loadGameAudioPreferences(storage) {
  const saved = read(storage, GAME_AUDIO_KEY);
  const game = saved?.version === 1 ? saved : {};
  const keyboard = soundPreference(read(storage, KEYBOARD_AUDIO_KEY));
  return { effects: { enabled: typeof game.effects?.enabled === 'boolean' ? game.effects.enabled : true, volume: volume(game.effects?.volume, 35) },
    keyboard: { enabled: keyboard.pack !== 'off', pack: keyboard.pack !== 'off' ? keyboard.pack : KEYBOARD_PACKS.includes(game.keyboardPack) ? game.keyboardPack : 'mxblue', volume: keyboard.volume } };
}

export function saveGameAudioPreferences(storage, preferences, group) {
  try {
    const saved = read(storage, GAME_AUDIO_KEY);
    if (group === 'keyboard') {
      storage.setItem(KEYBOARD_AUDIO_KEY, JSON.stringify({ version: 1, pack: preferences.keyboard.enabled ? preferences.keyboard.pack : 'off', volume: preferences.keyboard.volume }));
    }
    storage.setItem(GAME_AUDIO_KEY, JSON.stringify({ version: 1,
      effects: group === 'effects' ? preferences.effects : saved?.effects || preferences.effects,
      keyboardPack: group === 'keyboard' ? preferences.keyboard.pack : saved?.keyboardPack || preferences.keyboard.pack }));
    return true;
  } catch { return false; }
}

export function createGameAudio({ AudioContext, loadAudio, preferences, onStatus = () => {} }) {
  let pref = preferences;
  let context, effects, player, modulePromise, preparing;
  let selectedPack = 'off';
  let disposed = false;
  let keyboardEpoch = 0;
  let effectsEpoch = 0;
  let lastEngine, lastKills = 0, lastMisses = 0;
  const status = { keyboard: 'idle', effects: 'idle' };
  function report(group, next) {
    if (disposed || status[group] === next) return;
    status[group] = next; onStatus(group, next);
  }
  const keyboardOn = () => pref.keyboard.enabled && pref.keyboard.volume > 0;
  const effectsOn = () => pref.effects.enabled && pref.effects.volume > 0;

  async function prepare() {
    if (disposed || !keyboardOn() && !effectsOn()) return false;
    let resumed;
    try {
      // This part runs synchronously in the user's click/focus/key gesture.
      if (!context) {
        if (!AudioContext) throw Error('Web Audio unavailable');
        context = new AudioContext({ latencyHint: 'interactive' });
        effects = createGameEffects(context, () => report('effects', 'error'));
      }
      effects.setVolume(effectsOn() ? pref.effects.volume : 0);
      resumed = context.state === 'running' ? Promise.resolve(true) : Promise.resolve(context.resume()).then(() => true, () => false);
      report('effects', 'ready');
    } catch { report('effects', 'error'); report('keyboard', 'error'); return false; }

    let ready = false;
    if (keyboardOn()) {
      try {
        if (!player) {
          report('keyboard', 'loading');
          if (!modulePromise) modulePromise = Promise.resolve().then(loadAudio).catch(error => { modulePromise = null; throw error; });
          const module = await modulePromise;
          if (disposed) return false;
          if (keyboardOn() && !player) player = module.createAudioPlayer(context, module.samples, next => report('keyboard', next));
        }
        if (keyboardOn() && player) {
          player.setVolume(pref.keyboard.volume);
          if (selectedPack !== pref.keyboard.pack || status.keyboard === 'error') {
            selectedPack = pref.keyboard.pack; preparing = player.select(selectedPack);
          }
          ready = await preparing;
        }
      } catch { report('keyboard', 'error'); }
    }
    const running = await resumed;
    if (disposed) return false;
    if (!running || context.state !== 'running') { report('effects', 'error'); report('keyboard', 'error'); return false; }
    return Boolean(ready || effectsOn());
  }

  function configure(next) {
    const keyChanged = ['enabled', 'pack', 'volume'].some(key => pref.keyboard[key] !== next.keyboard[key]);
    if (pref.effects.enabled !== next.effects.enabled || pref.effects.volume !== next.effects.volume) effectsEpoch++;
    if (keyChanged) keyboardEpoch++;
    const packChanged = pref.keyboard.pack !== next.keyboard.pack || pref.keyboard.enabled !== next.keyboard.enabled;
    pref = next;
    effects?.setVolume(effectsOn() ? pref.effects.volume : 0);
    player?.setVolume(keyboardOn() ? pref.keyboard.volume : 0);
    if (packChanged || !keyboardOn()) {
      selectedPack = 'off'; preparing = player?.select('off');
      if (!keyboardOn()) report('keyboard', 'idle');
    }
  }
  function stop() { keyboardEpoch++; effectsEpoch++; player?.stop(); effects?.stop(); }

  return {
    prepare, configure, stop,
    key(event, input = event, composing = false) {
      const kind = keySoundKind(event, input, composing);
      if (disposed || !kind || !keyboardOn()) return false;
      if (context?.state === 'running' && status.keyboard === 'ready' && selectedPack === pref.keyboard.pack) return player.play(kind);
      if (status.keyboard !== 'loading' && status.keyboard !== 'error') void prepare();
      return false;
    },
    observe(engine, audible = true) {
      if (lastEngine !== engine) { lastEngine = engine; lastKills = 0; lastMisses = 0; }
      const { kills, misses, status: phase } = engine.state;
      const hits = Math.max(0, kills - lastKills), landings = Math.max(0, misses - lastMisses);
      lastKills = kills; lastMisses = misses;
      if (disposed || !audible || !effectsOn() || !['running', 'ended'].includes(phase)) return;
      for (let i = 0; i < Math.min(4, hits); i++) effects?.play('hit');
      for (let i = 0; i < Math.min(4, landings); i++) effects?.play('miss');
    },
    async previewKeyboard() {
      const epoch = keyboardEpoch;
      await prepare();
      return !disposed && epoch === keyboardEpoch && keyboardOn() && status.keyboard === 'ready' && context?.state === 'running' ? player.preview() : false;
    },
    previewEffects() {
      const epoch = effectsEpoch;
      const ready = prepare();
      if (context?.state === 'running' && effectsOn()) return effects.preview();
      return ready.then(() => !disposed && epoch === effectsEpoch && effectsOn() ? effects?.preview() || false : false);
    },
    dispose() {
      disposed = true; stop(); effects?.dispose();
      if (player) player.dispose();
      else if (context) { try { Promise.resolve(context.close()).catch(() => {}); } catch { /* Already closed. */ } }
    },
  };
}
