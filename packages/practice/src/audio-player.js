// Short, local recordings. The caller creates/resumes the context in a user
// gesture; loading and decoding never queue ordinary keystrokes for later.
export function createAudioPlayer(context, samples, onStatus = () => {}) {
  const cache = new Map();
  const voices = new Set();
  const master = context.createGain();
  master.connect(context.destination);
  let buffers = null;
  let pack = 'off';
  let volume = 30;
  let generation = 0;
  let disposed = false;
  let variation = 0;

  function stop() {
    for (const source of voices) {
      source.onended = null;
      try { source.stop(); } catch { /* It may already have ended. */ }
      source.disconnect();
    }
    voices.clear();
  }

  function setVolume(value) {
    volume = Math.max(0, Math.min(100, value));
    master.gain.setValueAtTime(volume / 200, context.currentTime);
    if (!volume) stop();
  }

  async function select(nextPack) {
    const token = ++generation;
    stop();
    pack = nextPack;
    buffers = null;
    if (pack === 'off') { onStatus('idle'); return false; }
    onStatus('loading');
    try {
      if (!cache.has(pack)) {
        const encoded = samples[pack];
        if (!encoded || !Object.keys(encoded).length) throw new Error('Missing sound pack');
        const promise = Promise.all(Object.entries(encoded).map(async ([name, data]) => {
          const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
          return [name, await context.decodeAudioData(bytes.buffer)];
        })).then(entries => Object.fromEntries(entries));
        cache.set(pack, promise);
        promise.catch(() => cache.delete(nextPack));
      }
      const decoded = await cache.get(pack);
      if (disposed || token !== generation) return false;
      buffers = decoded;
      onStatus('ready');
      return true;
    } catch {
      if (!disposed && token === generation) onStatus('error');
      return false;
    }
  }

  function play(kind = 'generic', offset = 0) {
    if (disposed || !buffers || pack === 'off' || !volume || context.state !== 'running') return false;
    const generic = `GENERIC_R${variation++ % 5}`;
    const buffer = buffers[kind.toUpperCase()] || buffers[generic];
    if (!buffer) return false;
    // Bound overlapping voices during fast input; no unbounded source queue.
    if (voices.size >= 8) {
      const oldest = voices.values().next().value;
      oldest.onended = null;
      try { oldest.stop(); } catch { /* Already ended. */ }
      oldest.disconnect(); voices.delete(oldest);
    }
    let source;
    try {
      source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(master);
      source.onended = () => { voices.delete(source); source.disconnect(); };
      voices.add(source);
      source.start(context.currentTime + offset);
      return true;
    } catch {
      if (source) { voices.delete(source); source.onended = null; source.disconnect(); }
      onStatus('error'); return false;
    }
  }

  function preview() {
    stop();
    return ['generic', 'generic', 'space', 'backspace'].map((kind, i) => play(kind, i * .13)).some(Boolean);
  }

  function dispose() {
    disposed = true;
    generation++;
    stop(); buffers = null; cache.clear(); master.disconnect();
    // Do not let a browser audio failure affect practice or unmounting.
    try { Promise.resolve(context.close()).catch(() => {}); } catch { /* Closed. */ }
  }

  setVolume(volume);
  return { select, setVolume, play, preview, stop, dispose };
}
