// Original short Web Audio cues: a light upward hit and a lower landing tone.
// The independent output gain lets keyboard recordings keep their own volume.
export function createGameEffects(context, onError = () => {}) {
  const master = context.createGain();
  master.connect(context.destination);
  const voices = new Set();
  let volume = 0;
  function release(voice, cancel = false) {
    voice.tone.onended = null;
    if (cancel) { try { voice.tone.stop(); } catch { /* Already ended. */ } }
    voice.tone.disconnect(); voice.envelope.disconnect(); voices.delete(voice);
  }
  function stop() { for (const voice of voices) release(voice, true); }
  function setVolume(next) {
    volume = Math.max(0, Math.min(100, next));
    master.gain.setValueAtTime(volume / 100 * .35, context.currentTime);
    if (!volume) stop();
  }
  function play(kind, offset = 0) {
    if (!volume || context.state !== 'running') return false;
    let voice;
    try {
      if (voices.size >= 8) release(voices.values().next().value, true);
      const tone = context.createOscillator();
      const envelope = context.createGain();
      voice = { tone, envelope };
      tone.connect(envelope); envelope.connect(master);
      const at = context.currentTime + offset;
      const hit = kind === 'hit';
      const duration = hit ? .09 : .16;
      tone.type = hit ? 'sine' : 'triangle';
      tone.frequency.setValueAtTime(hit ? 880 : 180, at);
      tone.frequency.exponentialRampToValueAtTime(hit ? 1320 : 70, at + duration);
      envelope.gain.setValueAtTime(.0001, at);
      envelope.gain.exponentialRampToValueAtTime(.35, at + .004);
      envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
      tone.onended = () => release(voice);
      voices.add(voice);
      tone.start(at); tone.stop(at + duration);
      return true;
    } catch { if (voice) release(voice, true); onError(); return false; }
  }
  return { play, setVolume, stop, preview() { stop(); return play('hit') && play('miss', .22); },
    dispose() { stop(); master.disconnect(); } };
}
