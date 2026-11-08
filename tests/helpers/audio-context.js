export function audioHarness(options = {}) {
  const contexts = [];
  const pending = [];
  class AudioContext {
    constructor() {
      this.state = options.state || 'running'; this.currentTime = 0; this.destination = {};
      this.sources = []; this.gains = []; this.decodes = 0; this.resumes = 0; this.closes = 0;
      contexts.push(this);
    }
    createGain() {
      const node = { gain: { value: 0, setValueAtTime(value) { this.value = value; } }, connect() {}, disconnect() { this.disconnected = true; } };
      this.gains.push(node); return node;
    }
    createBufferSource() {
      const node = { connect() {}, disconnect() { this.disconnected = true; },
        start(at) { if (options.startError) throw new Error('Cannot start'); this.started = at; },
        stop() { this.stopped = true; }, end() { this.onended?.(); } };
      this.sources.push(node); return node;
    }
    decodeAudioData(bytes) {
      this.decodes++;
      if (options.decodeError) return Promise.reject(new Error('Invalid audio'));
      const buffer = { name: new TextDecoder().decode(bytes), duration: .12 };
      return options.delayDecode ? new Promise(resolve => pending.push(() => resolve(buffer))) : Promise.resolve(buffer);
    }
    resume() { this.resumes++; if (options.resumeError) return Promise.reject(new Error('Blocked')); this.state = 'running'; return Promise.resolve(); }
    close() { this.closes++; this.state = 'closed'; return Promise.resolve(); }
  }
  return { AudioContext, contexts, resolveDecodes() { pending.splice(0).forEach(resolve => resolve()); } };
}

export const samplePacks = Object.fromEntries(['mxblue', 'mxbrown', 'cream', 'holypanda'].map(pack => [pack,
  Object.fromEntries(['GENERIC_R0', 'GENERIC_R1', 'GENERIC_R2', 'GENERIC_R3', 'GENERIC_R4', 'SPACE', 'BACKSPACE', 'ENTER']
    .map(key => [key, Buffer.from(pack + ':' + key).toString('base64')]))]));
