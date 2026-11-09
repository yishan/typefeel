import corpus from '../../../../data/game-words.json' with { type: 'json' };

export const gameWords = corpus.words;
export const WORDS_VERSION = corpus.version;
export const RULES_VERSION = 1;
export const SHOT_MS = 160;

// The engine uses one pause-aware clock. Frames and native commits advance the
// same event timeline; spawning and misses do not depend on frame frequency.
export function createGameEngine({ words = gameWords, random = Math.random, lanes = 5, config = {} } = {}) {
  const rules = { countdownMs: 3000, spawnMs: 2400, fallMs: 9000, maxTargets: 5, lives: 5, ...config };
  const pool = [...new Set(words)];
  const state = { status: 'ready', countdown: 3, time: 0, score: 0, lives: rules.lives, level: 1,
    kills: 0, combo: 0, bestCombo: 0, targets: [], shots: [], error: false, misses: 0 };
  let version = 0;
  let laneCount = Math.max(1, lanes);
  let nextId = 1;
  let nextSpawn = 0;
  let lastNow = 0;
  let countdownEnd = 0;
  let pausedStatus = 'running';
  let countdownRemaining = 0;
  const change = () => { version++; };
  const levelAt = time => 1 + Math.floor(time / 30000);
  const index = length => Math.min(length - 1, Math.max(0, Math.floor(random() * length)));
  const progress = target => Math.max(0, Math.min(1, (state.time - target.bornAt) / target.fallMs));

  function spawn() {
    const max = Math.min(8, rules.maxTargets + Math.floor((state.level - 1) / 2));
    if (state.targets.length >= max) return;
    const available = Array.from({ length: laneCount }, (_, i) => i)
      .filter(lane => !state.targets.some(target => target.lane === lane && progress(target) < .22));
    const eligible = pool.filter(text => !state.targets.some(target => target.text.startsWith(text) || text.startsWith(target.text)));
    if (!available.length || !eligible.length) return;
    const text = eligible[index(eligible.length)];
    const fallMs = Math.max(rules.fallMs * 2 / 3, rules.fallMs - (state.level - 1) * 400) * (1 + .18 * ([...text].length - 1));
    state.targets.push({ id: nextId++, text, lane: available[index(available.length)], bornAt: state.time, fallMs, status: 'falling' });
    change();
  }

  function advance(end) {
    while (state.status === 'running') {
      const deadline = Math.min(Infinity, ...state.targets.filter(target => target.status === 'falling').map(target => target.bornAt + target.fallMs));
      const shotEnd = Math.min(Infinity, ...state.shots.map(shot => shot.endsAt));
      const eventTime = Math.min(nextSpawn, deadline, shotEnd);
      if (eventTime > end) break;
      state.time = eventTime;
      state.level = levelAt(state.time);
      const expired = new Set(state.shots.filter(shot => shot.endsAt <= eventTime).map(shot => shot.id));
      if (expired.size) {
        state.shots = state.shots.filter(shot => !expired.has(shot.id));
        state.targets = state.targets.filter(target => !expired.has(target.id));
        change();
      }
      const missed = state.targets.filter(target => target.status === 'falling' && target.bornAt + target.fallMs <= eventTime);
      if (missed.length) {
        state.targets = state.targets.filter(target => !missed.includes(target));
        state.lives = Math.max(0, state.lives - missed.length);
        state.misses += missed.length;
        state.combo = 0;
        change();
        if (!state.lives) { state.status = 'ended'; break; }
      }
      if (nextSpawn <= eventTime) {
        spawn();
        nextSpawn = eventTime + Math.max(rules.spawnMs / 2, rules.spawnMs - (state.level - 1) * 120);
      }
    }
    if (state.status === 'running') {
      state.time = end;
      const nextLevel = levelAt(end);
      if (state.level !== nextLevel) { state.level = nextLevel; change(); }
    }
  }

  function tick(now) {
    if (state.status === 'countdown') {
      const count = Math.max(0, Math.ceil((countdownEnd - now) / 1000));
      if (state.countdown !== count) { state.countdown = count; change(); }
      if (now < countdownEnd) return;
      state.status = 'running'; lastNow = countdownEnd; change();
    }
    if (state.status !== 'running') return;
    const elapsed = Math.max(0, now - lastNow);
    lastNow = Math.max(lastNow, now);
    advance(state.time + elapsed);
  }

  return {
    state, get version() { return version; }, get lanes() { return laneCount; }, progress,
    start(now) {
      if (state.status !== 'ready') return;
      state.status = 'countdown'; countdownEnd = now + rules.countdownMs; lastNow = now; change();
    },
    tick,
    submit(value, now) {
      tick(now);
      if (state.status !== 'running' || !value) return '';
      const target = state.targets.find(target => target.status === 'falling' && value === target.text);
      if (target) {
        target.hitProgress = progress(target);
        target.status = 'hit';
        state.shots.push({ id: target.id, lane: target.lane, progress: target.hitProgress, firedAt: state.time, endsAt: state.time + SHOT_MS });
        state.score += 10 * [...target.text].length;
        state.kills++; state.combo++;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
      }
      state.error = !target;
      if (state.error) state.combo = 0;
      change();
      return '';
    },
    pause(now) {
      tick(now);
      if (!['running', 'countdown'].includes(state.status)) return;
      pausedStatus = state.status;
      countdownRemaining = Math.max(0, countdownEnd - now);
      state.status = 'paused'; change();
    },
    resume(now) {
      if (state.status !== 'paused') return;
      state.status = pausedStatus; lastNow = now;
      if (pausedStatus === 'countdown') countdownEnd = now + countdownRemaining;
      change();
    },
    setLanes(next) {
      laneCount = Math.max(1, next);
      state.targets.forEach((target, i) => { target.lane = i % laneCount; });
      state.shots.forEach(shot => { shot.lane = state.targets.find(target => target.id === shot.id)?.lane ?? 0; });
      change();
    },
  };
}
