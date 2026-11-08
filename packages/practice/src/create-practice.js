import * as PracticeCorpus from './practice-text.js';
import { dictionaries as defaultDictionaries } from './copy.js';
import { CSS } from './styles.js';

// Each mount owns its locale, caches and preferences. Platform services are
// provided by the web or DSH entry; this module never imports a host runtime.
export function createPractice(React, platform) {
    const h = React.createElement;
    const storagePrefix = platform.storagePrefix;
    const fullShortcuts = platform.fullShortcuts === true;
    const hasLocalCorpus = typeof platform.fetchCorpus === 'function';
    const LEGACY_STORE_KEY = `${storagePrefix}.v1`;
    const STORE_KEY = `${storagePrefix}.v2`;
    const PREVIOUS_RECORDS_KEY = `${storagePrefix}.v3`;
    const RECORDS_KEY = `${storagePrefix}.v4`;
    const HISTORY_LIMIT = 100;
    const PREFERENCES_KEY = `${storagePrefix}.preferences.v1`;
    const EXERCISE_KEY = `${storagePrefix}.exercise.v2`;
    const LEGACY_EXERCISE_KEY = `${storagePrefix}.exercise.v1`;
    const SOUND_KEY = `${storagePrefix}.sound.v1`;
    const SOUND_PACKS = ['off', 'mxblue', 'mxbrown', 'cream', 'holypanda'];
    const CURSOR_KEY = `${storagePrefix}.cursor.v1`;
    const CURSOR_SHAPES = ['line', 'underline', 'outline'];
    const LANGUAGES = ['en', 'zh', 'yue'];
    const HINT_MODES = ['off', 'current', 'all'];
    const LEGACY_HINT_KEY = `${storagePrefix}.annotations.v1`;
    const HINT_KEY = `${storagePrefix}.annotations.v2`;
    const PINYIN_FORMATS = ['full', 'shuangpin'];
    const SHUANGPIN_SCHEMES = ['xiaohe', 'ziranma', 'microsoft', 'sogou'];
    const RULES_VERSION = 2;
    const DURATIONS = [15, 30, 60];
    const OPTION_SHORTCUTS = [
      { id: 'language', key: 'T', label: 'languageLabel' },
      { id: 'duration', key: 'D', label: 'durationLabel' },
      { id: 'length', key: 'L', label: 'lengthLabel' },
    ];
    const DEFAULT_DURATION = 30;
    const TEXT_CHARS = 1200;

    // ---------- copy ----------

    const dictionaries = Object.fromEntries(Object.entries(defaultDictionaries).map(([lang, values]) => [lang, { ...values, ...platform.copy?.[lang] }]));
    let activeLanguage = detectLanguage(platform.locale);
    const localeService = platform.locale;
    const getShortcuts = () => platform.shortcuts?.();

    function interpolate(text, vars) {
      return String(text == null ? '' : text).replace(/\{(\w+)\}/g, (match, key) => {
        if (vars && vars[key] != null) return String(vars[key]);
        return match;
      });
    }

    const t = (key, vars) => {
      let translated;
      try { translated = platform.translate?.(key); } catch { /* Built-in copy remains available. */ }
      return interpolate(translated && translated !== key ? translated : dictionaries[activeLanguage][key] ?? key, vars);
    };

    function detectLanguage(locale) {
      try {
        const snapshot = locale && locale.getLocale ? locale.getLocale() : null;
        const id = String(snapshot && (snapshot.active || snapshot.id || snapshot.locale || snapshot.current) || '');
        if (id.toLowerCase().startsWith('en')) return 'en';
      } catch {
        // fall through to the Chinese default
      }
      return 'zh';
    }

    // ---------- practice text ----------



    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    function characters(text) {
      return Array.from(segmenter.segment(text), (part) => part.segment);
    }
    const RECENT_KEY = `${storagePrefix}.recent.v1`;
    let recentMemory;
    function loadRecent() {
      if (recentMemory) return recentMemory;
      const saved = readStored(RECENT_KEY);
      const result = { version: 1, corpusVersion: PracticeCorpus.CORPUS_VERSION, builtin: {}, local: {} };
      for (const language of LANGUAGES) {
        const known = new Set(PracticeCorpus.entries.filter(entry => entry.language === language).map(entry => entry.id));
        const builtin = saved?.version === 1 && saved.corpusVersion === PracticeCorpus.CORPUS_VERSION ? saved.builtin?.[language] : [];
        const local = saved?.version === 1 ? saved.local?.[language] : [];
        result.builtin[language] = Array.isArray(builtin) ? [...new Set(builtin.filter(id => known.has(id)))].slice(-PracticeCorpus.RECENT_LIMIT) : [];
        result.local[language] = Array.isArray(local) ? [...new Set(local.filter(id => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id)))].slice(-PracticeCorpus.RECENT_LIMIT) : [];
      }
      return recentMemory = result;
    }
    function rememberSession(session) {
      const recent = loadRecent();
      const kind = session.source ? 'local' : 'builtin';
      const ids = session.source ? (session.source.fingerprints || [session.source.fingerprint]).filter(id => /^[a-f0-9]{64}$/.test(id || '')) : session.passageIds;
      if (!ids.length) return;
      recent[kind][session.language] = [...recent[kind][session.language].filter(id => !ids.includes(id)), ...ids].slice(-PracticeCorpus.RECENT_LIMIT);
      // Storage failure only makes deduplication temporary; keep this page usable.
      try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch { /* Memory still remembers. */ }
    }
    function practiceText(language) {
      return PracticeCorpus.selectPractice(language, loadRecent().builtin[language], TEXT_CHARS);
    }

    // Load only the chosen language. Reuse engines and prepared passages;
    // rejected loads are forgotten so retry is a real attempt.
    const engines = new Map();
    const annotationsCache = new Map();
    function loadAnnotations(language, text, pronunciation) {
      const key = language + ':' + text;
      if (!engines.has(language)) {
        const name = language === 'zh' ? 'pinyin' : 'jyutping';
        engines.set(language, Promise.resolve().then(() => platform.loadPronunciation(name)).catch(error => {
          engines.delete(language);
          throw error;
        }));
      }
      return engines.get(language).then(engine => {
        const tokens = annotationsCache.get(key) || engine.annotate(text);
        if (!Array.isArray(tokens) || tokens.map(token => token.char).join('') !== text
          || tokens.length !== characters(text).length) throw new Error('Invalid pronunciation alignment');
        annotationsCache.set(key, tokens);
        if (annotationsCache.size > 24) annotationsCache.delete(annotationsCache.keys().next().value);
        // Cache contextual readings only. Formatting creates separate tokens,
        // so a scheme switch cannot reuse or mutate another scheme's hints.
        return language === 'zh' && pronunciation?.pinyinFormat === 'shuangpin'
          ? engine.formatReadings(tokens, pronunciation.pinyinFormat, pronunciation.pinyinScheme) : tokens;
      });
    }

    // ---------- local records ----------

    function effectivePinyin(language, hints, preference = {}) {
      const shuangpin = language === 'zh' && hints !== 'off' && preference.pinyinFormat === 'shuangpin';
      return { pinyinFormat: shuangpin ? 'shuangpin' : 'full',
        pinyinScheme: shuangpin && SHUANGPIN_SCHEMES.includes(preference.pinyinScheme) ? preference.pinyinScheme : shuangpin ? 'xiaohe' : null };
    }

    function hintIdentity(language, hints, pronunciation) {
      const effective = effectivePinyin(language, hints, pronunciation);
      return (hints === 'off' ? 'plain' : hints) + (effective.pinyinScheme ? '~' + effective.pinyinScheme : '');
    }

    function hintDescription(language, hints, pronunciation) {
      const range = t('hint_' + hints);
      if (language !== 'zh' || hints === 'off') return range;
      const effective = effectivePinyin(language, hints, pronunciation);
      return range + ' · ' + t(effective.pinyinScheme ? 'scheme_' + effective.pinyinScheme : 'pinyin_full');
    }

    function recordKey(language, duration, hints = 'off', corpusVersion = PracticeCorpus.CORPUS_VERSION, source = 'builtin', pronunciation) {
      return `${language}:${duration}:${source}:${hintIdentity(language, hints, pronunciation)}:${RULES_VERSION}${source === 'local' || corpusVersion === 1 ? '' : ':corpus' + corpusVersion}`;
    }

    function sanitizeBest(stored) {
      if (!stored || typeof stored !== 'object') return {};
      const best = {};
      for (const language of LANGUAGES) for (const duration of DURATIONS) for (const hints of language === 'en' ? ['off'] : HINT_MODES) for (const [source, corpusVersion] of [['builtin', 1], ['builtin', PracticeCorpus.CORPUS_VERSION], ['local', null]]) {
        for (const scheme of language === 'zh' && hints !== 'off' ? [null, ...SHUANGPIN_SCHEMES] : [null]) {
          const key = recordKey(language, duration, hints, corpusVersion, source, { pinyinFormat: scheme ? 'shuangpin' : 'full', pinyinScheme: scheme });
          const entry = stored[key];
          if (!entry || !Number.isFinite(entry.speed) || entry.speed < 0) continue;
          best[key] = {
            speed: Math.round(entry.speed),
            accuracy: Number.isFinite(entry.accuracy) ? Math.max(0, Math.min(1, entry.accuracy)) : 0,
            at: Number.isFinite(entry.at) ? entry.at : 0,
          };
        }
      }
      return best;
    }

    function readStored(key) {
      try { return JSON.parse(window.localStorage.getItem(key) || 'null'); }
      catch { return null; }
    }

    function sanitizeLegacy(stored) {
      const legacy = {};
      for (const duration of DURATIONS) {
        const item = stored?.[duration];
        if (!item || !Number.isFinite(item.wpm) || item.wpm < 0 || !Number.isFinite(item.accuracy)) continue;
        legacy[duration] = { wpm: Math.round(item.wpm), accuracy: Math.max(0, Math.min(1, item.accuracy)), at: Number.isFinite(item.at) ? item.at : 0 };
      }
      return legacy;
    }

    function sanitizeHistory(stored) {
      if (!Array.isArray(stored)) return [];
      const ids = new Set();
      return stored.slice(0, HISTORY_LIMIT).flatMap(item => {
        if (!item || typeof item.id !== 'string' || item.id.length > 100 || !item.id || ids.has(item.id)
          || !LANGUAGES.includes(item.language) || !HINT_MODES.includes(item.hints) || item.language === 'en' && item.hints !== 'off'
          || item.pinyinFormat != null && !PINYIN_FORMATS.includes(item.pinyinFormat)
          || item.pinyinFormat === 'shuangpin' && !SHUANGPIN_SCHEMES.includes(item.pinyinScheme)
          || item.rules !== RULES_VERSION || !['timed', 'passage'].includes(item.mode) || !['builtin', 'local'].includes(item.source)
          || !['completed', 'early'].includes(item.status) || !Number.isFinite(item.accuracy) || item.accuracy < 0 || item.accuracy > 1
          || !['at', 'elapsedMs', 'speed', 'correct', 'wrongKeys', 'keystrokes', 'targetLength'].every(key => Number.isSafeInteger(item[key]) && item[key] >= 0)
          || item.at > 8640000000000000 || item.elapsedMs < 1 || item.targetLength < 1 || item.wrongKeys > item.keystrokes
          || item.correct > item.targetLength || item.correct > item.keystrokes
          || item.mode === 'timed' && (!DURATIONS.includes(item.duration)
            || item.elapsedMs > item.duration * 1000 || item.status === 'completed' && item.elapsedMs !== item.duration * 1000)
          || item.mode === 'timed' && item.corpusVersion != null && ![1, PracticeCorpus.CORPUS_VERSION].includes(item.corpusVersion)
          || item.mode === 'passage' && (item.status !== 'completed' || item.source === 'builtin' &&
            (item.corpusVersion !== PracticeCorpus.CORPUS_VERSION || typeof item.passageId !== 'string'
              || !new RegExp('^' + item.language + '-[a-z]+-\\d{2}(?:-medium|-long)?$').test(item.passageId)))) return [];
        ids.add(item.id);
        // Whitelist fields: never retain text, chat titles, paths or message IDs.
        return [{ id: item.id, language: item.language, hints: item.hints, ...effectivePinyin(item.language, item.hints, item), rules: item.rules,
          corpusVersion: item.source === 'builtin' ? item.corpusVersion ?? 1 : null,
          length: item.mode === 'passage' && PracticeCorpus.TEXT_LENGTHS.includes(item.length) ? item.length : null,
          passageId: item.mode === 'passage' && item.source === 'builtin' ? item.passageId : null,
          mode: item.mode, source: item.source, duration: item.mode === 'timed' ? item.duration : null,
          status: item.status, at: item.at, elapsedMs: item.elapsedMs, speed: item.speed, accuracy: item.accuracy,
          correct: item.correct, wrongKeys: item.wrongKeys, keystrokes: item.keystrokes, targetLength: item.targetLength,
          fingerprint: item.source === 'local' && /^[a-f0-9]{64}$/.test(item.fingerprint || '') ? item.fingerprint : null }];
      });
    }

    function loadRecords() {
      const current = readStored(RECORDS_KEY);
      const previousRecords = current?.version === 4 ? current : readStored(PREVIOUS_RECORDS_KEY);
      if (previousRecords?.version === 3 || previousRecords?.version === 4) return { version: 4,
        best: sanitizeBest(previousRecords.best), legacy: sanitizeLegacy(previousRecords.legacy), history: sanitizeHistory(previousRecords.history) };
      const previous = readStored(STORE_KEY);
      return { version: 4, best: previous?.version === 2 ? sanitizeBest(previous.best) : {}, legacy: sanitizeLegacy(readStored(LEGACY_STORE_KEY)?.best), history: [] };
    }

    function saveRecords(records) {
      try {
        // One write makes migration, completion and clearing atomic. Old keys
        // remain untouched; a valid v4 (including an empty one) is authoritative.
        window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
        return true;
      } catch { return false; }
    }

    function isBetter(result, previous) {
      return !previous || result.speed > previous.speed
        || result.speed === previous.speed && Math.round(result.accuracy * 100) > Math.round(previous.accuracy * 100);
    }

    function historyEntry(session) {
      const result = session.result;
      return { id: session.recordId, language: result.language, hints: result.hints,
        ...effectivePinyin(result.language, result.hints, result), rules: RULES_VERSION,
        corpusVersion: session.source ? null : PracticeCorpus.CORPUS_VERSION,
        mode: session.mode, source: session.source ? 'local' : 'builtin',
        length: session.mode === 'passage' ? session.length : null, passageId: session.passageId,
        duration: session.mode === 'passage' ? null : result.duration, status: session.mode === 'passage' || result.eligible ? 'completed' : 'early',
        at: result.at, elapsedMs: result.elapsedMs, speed: result.speed, accuracy: result.accuracy,
        correct: result.correct, wrongKeys: result.wrongKeys, keystrokes: result.keystrokes, targetLength: session.target.length,
        fingerprint: session.source && /^[a-f0-9]{64}$/.test(session.source.fingerprint || '') ? session.source.fingerprint : null };
    }

    function samePassageBest(history, entry) {
      if (!passageKey(entry)) return null;
      return history.filter(item => passageKey(item) === passageKey(entry)
        && item.language === entry.language && item.rules === entry.rules
        && hintIdentity(item.language, item.hints, item) === hintIdentity(entry.language, entry.hints, entry))
        .reduce((best, item) => isBetter(item, best) ? item : best, null);
    }

    function formatRecordDate(at) {
      if (!at || !Number.isFinite(at) || Math.abs(at) > 8640000000000000) return '—';
      return new Intl.DateTimeFormat(activeLanguage === 'en' ? 'en-US' : 'zh-CN', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(new Date(at));
    }

    function exerciseFor(preset) {
      if (DURATIONS.map(String).includes(preset)) return { preset, mode: 'timed', duration: Number(preset), length: 'short' };
      if (PracticeCorpus.TEXT_LENGTHS.includes(preset)) return { preset, mode: 'passage', duration: DEFAULT_DURATION, length: preset };
      return null;
    }

    function loadExercisePreference() {
      const saved = readStored(EXERCISE_KEY);
      if (saved?.version === 2) return exerciseFor(saved.preset) || exerciseFor(String(DEFAULT_DURATION));
      const previous = readStored(LEGACY_EXERCISE_KEY);
      const length = previous?.version === 1 && PracticeCorpus.TEXT_LENGTHS.includes(previous.length) ? previous.length : 'short';
      // The old local source always used passage mode, even without a saved mode.
      return exerciseFor(loadCorpusPreference() === 'local' || previous?.version === 1 && previous.mode === 'passage' ? length : String(DEFAULT_DURATION));
    }

    function passageKey(entry) {
      if (entry.mode !== 'passage') return null;
      return entry.source === 'local' ? entry.fingerprint : entry.passageId ? `builtin:${entry.corpusVersion}:${entry.passageId}` : null;
    }

    function loadCorpusPreference() {
      try {
        const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) || '{}');
        return stored?.version === 1 && stored.source === 'local' ? 'local' : 'builtin';
      } catch { return 'builtin'; }
    }

    function saveCorpusPreference(source) {
      try {
        window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, source }));
        return true;
      } catch { return false; }
    }

    function loadSoundPreference() {
      const saved = readStored(SOUND_KEY);
      return { version: 1, pack: saved?.version === 1 && SOUND_PACKS.includes(saved.pack) ? saved.pack : 'off',
        volume: saved?.version === 1 && Number.isFinite(saved.volume) ? Math.max(0, Math.min(100, Math.round(saved.volume))) : 30 };
    }

    function loadHintPreference() {
      const saved = readStored(HINT_KEY);
      const legacy = readStored(LEGACY_HINT_KEY);
      const preference = saved?.version === 2 ? saved : legacy?.version === 1 ? legacy : {};
      return { version: 2, mode: HINT_MODES.includes(preference.mode) ? preference.mode : 'current',
        pinyinFormat: PINYIN_FORMATS.includes(preference.pinyinFormat) ? preference.pinyinFormat : 'full',
        pinyinScheme: SHUANGPIN_SCHEMES.includes(preference.pinyinScheme) ? preference.pinyinScheme : 'xiaohe' };
    }

    let audioModule;
    function loadAudioModule() {
      if (!audioModule) audioModule = platform.loadAudio().catch(error => { audioModule = null; throw error; });
      return audioModule;
    }

    function loadCursorPreference() {
      const saved = readStored(CURSOR_KEY);
      return { version: 1,
        shape: saved?.version === 1 && CURSOR_SHAPES.includes(saved.shape) ? saved.shape : 'line',
        glow: saved?.version === 1 && typeof saved.glow === 'boolean' ? saved.glow : true,
        blink: saved?.version === 1 && typeof saved.blink === 'boolean' ? saved.blink : false };
    }

    // ---------- session engine ----------

    let nextSessionId = 0;
    function createSession(duration, language = 'en', hints = language === 'en' ? 'off' : 'current', originalText, source = null, exercise = loadExercisePreference(), passageId = null, pronunciation = loadHintPreference()) {
      const mode = exercise.mode;
      const selected = originalText ? { text: originalText, ids: [], passageId }
        : mode === 'passage' ? PracticeCorpus.selectPassage(language, { length: exercise.length, recent: loadRecent().builtin[language] }) : practiceText(language);
      const text = selected.text;
      return {
        id: ++nextSessionId,
        recordId: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${nextSessionId}`,
        language,
        hints,
        ...effectivePinyin(language, hints, pronunciation),
        source,
        annotations: null,
        annotationState: hints === 'off' ? 'off' : 'loading',
        duration,
        text,
        passageIds: selected.ids, passageId: mode === 'passage' && !source ? selected.passageId : null,
        mode, length: exercise.length,
        target: characters(text),
        typed: '',
        keystrokes: 0,
        wrongKeys: 0,
        startAt: null,
        nowMs: 0,
        result: null,
      };
    }

    function countCorrect(text, typed) {
      text = characters(text);
      typed = characters(typed);
      let correct = 0;
      const length = Math.min(text.length, typed.length);
      for (let i = 0; i < length; i++) {
        if (typed[i] === text[i]) correct += 1;
      }
      return correct;
    }

    function sessionElapsed(session) {
      if (session.result) return session.result.elapsedMs;
      if (session.startAt == null) return 0;
      return Math.max(0, session.nowMs - session.startAt);
    }

    function sessionStats(session) {
      const ms = sessionElapsed(session);
      const correct = countCorrect(session.text, session.typed);
      const accuracy = session.keystrokes > 0
        ? (session.keystrokes - session.wrongKeys) / session.keystrokes
        : 1;
      const divisor = session.language === 'en' ? 5 : 1;
      const speed = ms > 0 ? Math.round((correct / divisor) / (ms / 60000)) : 0;
      return { ms, correct, accuracy, speed };
    }

    function finishSession(session, elapsed) {
      const raw = elapsed != null ? elapsed : sessionElapsed(session);
      const ms = Math.max(1, session.mode === 'passage' ? raw : Math.min(raw, session.duration * 1000));
      const correct = countCorrect(session.text, session.typed);
      const accuracy = session.keystrokes > 0
        ? (session.keystrokes - session.wrongKeys) / session.keystrokes
        : 0;
      return {
        ...session,
        result: {
          speed: Math.round((correct / (session.language === 'en' ? 5 : 1)) / (ms / 60000)),
          language: session.language,
          hints: session.hints,
          ...effectivePinyin(session.language, session.hints, session),
          eligible: session.mode === 'timed' && ms >= session.duration * 1000,
          accuracy: Math.max(0, Math.min(1, accuracy)),
          correct,
          keystrokes: session.keystrokes,
          wrongKeys: session.wrongKeys,
          duration: session.duration,
          elapsedMs: Math.round(ms),
          at: Date.now(),
        },
      };
    }

    function checkDeadline(session, now) {
      if (session.result) return session;
      if (session.mode === 'timed' && session.startAt != null && now - session.startAt >= session.duration * 1000) {
        return finishSession({ ...session, nowMs: now }, now - session.startAt);
      }
      return session;
    }

    // Reconcile the native buffer, not event.data: compositionend and input may
    // report the same edit. An unchanged buffer is a no-op, while a new identical
    // word is still an insertion. Native selection replacements work as well.
    function reconcileText(session, value, now) {
      session = checkDeadline(session, now);
      if (session.result) return session;
      const before = characters(session.typed);
      const after = characters(value).slice(0, session.target.length);
      let start = 0;
      while (start < before.length && start < after.length && before[start] === after[start]) start++;
      let oldEnd = before.length;
      let newEnd = after.length;
      while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) { oldEnd--; newEnd--; }
      if (start === oldEnd && start === newEnd) return session;
      const inserted = after.slice(start, newEnd);
      const next = {
        ...session,
        typed: after.join(''),
        keystrokes: session.keystrokes + inserted.length,
        wrongKeys: session.wrongKeys + inserted.filter((char, i) => char !== session.target[start + i]).length,
        startAt: session.startAt == null && inserted.length ? now : session.startAt,
        nowMs: now,
      };
      return after.length >= session.target.length ? finishSession(next) : next;
    }

    // ---------- styles ----------


    // ---------- board ----------

    function revealCaret(viewport) {
      if (!viewport) return;
      const caret = viewport.querySelector('[data-input-anchor]');
      const first = viewport.querySelector('.tp-char');
      if (!caret || !first) return;
      const lineHeight = parseFloat(window.getComputedStyle(viewport).lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
      // Align every new row immediately, including backtracking and the last
      // row. The board's padding reserves one history row and four future rows.
      // Rounding ignores mixed-script glyph/reading offsets within one line.
      const row = Math.max(0, Math.round((caret.getBoundingClientRect().top - first.getBoundingClientRect().top) / lineHeight));
      const offset = row * lineHeight;
      if (Math.abs(viewport.scrollTop - offset) > .5) viewport.scrollTop = offset;
    }

    function revealInputRegion(viewport) {
      const caret = viewport?.querySelector('[data-input-anchor]');
      if (!caret) return;
      const host = (viewport.closest?.('.tp-scroll') || viewport.closest?.('.tp-root'))?.getBoundingClientRect();
      const top = Math.max(12, host?.top ?? 0);
      const bottom = Math.min(window.innerHeight - 12, host?.bottom ?? window.innerHeight);
      const region = viewport.getBoundingClientRect();
      // Reveal the six-row region once on focus/resize if a small host clips
      // it. During ordinary typing only revealCaret moves the inner text.
      const fits = region.bottom - region.top <= bottom - top;
      const rect = fits ? region : caret.getBoundingClientRect();
      if (rect.top < top || rect.bottom > bottom) {
        viewport.parentElement.scrollIntoView({ block: fits ? 'nearest' : 'center' });
      }
    }

    function positionInput(viewport, input, preview) {
      if (!viewport || !input) return;
      const anchor = viewport.querySelector('[data-input-anchor]');
      if (!anchor) return;
      const bounds = viewport.getBoundingClientRect();
      const rect = anchor.getBoundingClientRect();
      const left = Math.max(12, Math.min(rect.left, bounds.right - 4, window.innerWidth - 16));
      const top = Math.max(12, Math.min(rect.top, bounds.bottom - 24, window.innerHeight - 28));
      input.style.left = `${left}px`;
      input.style.top = `${top}px`;
      if (preview) {
        preview.style.left = `${Math.min(left, Math.max(12, window.innerWidth - 160))}px`;
        preview.style.top = `${Math.min(top + rect.height + 2, window.innerHeight - 48)}px`;
      }
    }

    const TextBoard = React.memo(function TextBoard({ text, typed, caretIndex, finished, annotations, hints }) {
      const nodes = [];
      const target = characters(text);
      const entered = characters(typed);
      for (let i = 0; i <= target.length; i++) {
        const ch = target[i] || '\u200b';
        // Latin text, digits and ASCII punctuation use the same metrics in all
        // languages; Han characters and their ruby readings keep their fonts.
        let className = 'tp-char' + (/^(?:[\x20-\x7e]|\p{Script=Latin}\p{M}*)$/u.test(ch) ? ' tp-latin' : '');
        if (i < entered.length) {
          className += entered[i] === ch ? ' correct' : ' wrong';
        }
        if (i === caretIndex && !finished) className += ' caret';
        const character = h('span', { className, key: i, 'data-input-anchor': i === caretIndex ? '' : undefined }, ch);
        const token = annotations && annotations[i];
        if (hints !== 'off' && token && token.reading) {
          const visible = hints === 'all' || i === caretIndex;
          nodes.push(h('ruby', { className: 'tp-ruby', key: i }, character,
            h('rt', { className: 'tp-reading' + (visible ? '' : ' tp-reading-hidden') + (token.shuangpin ? ' tp-shuangpin' : ''),
              'aria-hidden': !visible, title: token.readingFallback ? t('pinyinFallback') : undefined,
              'aria-label': token.readingFallback ? token.reading + ' · ' + t('pinyinFallback') : undefined,
            }, token.displayReading || token.reading),
          ));
        } else nodes.push(character);
      }
      return h('div', { className: 'tp-board' }, nodes);
    });

    function Stat({ label, value, unit, accent, description }) {
      return h('div', { className: accent ? 'tp-stat accent' : 'tp-stat', title: description },
        h('div', { className: 'tp-stat-label' }, label),
        h('div', { className: 'tp-stat-value' },
          String(value),
          unit ? h('span', { className: 'tp-stat-unit' }, unit) : null,
        ),
      );
    }

    function ResultItem({ label, value }) {
      return h('div', { className: 'tp-result-item' },
        h('div', { className: 'tp-result-label' }, label),
        h('div', { className: 'tp-result-value' }, String(value)),
      );
    }

    // ---------- sidebar icon ----------

    function PanelIcon({ size = 20, active }) {
      const edge = size || 20;
      return h('svg', {
        width: edge,
        height: edge,
        viewBox: '0 0 24 24',
        fill: 'none',
        'aria-hidden': true,
        focusable: false,
        style: { display: 'block', opacity: active ? 1 : 0.85 },
      },
        h('rect', {
          x: 2.6, y: 5.4, width: 18.8, height: 13.2, rx: 3,
          stroke: 'currentColor', strokeWidth: 1.6,
        }),
        h('path', {
          d: 'M6.2 9.4v1.2M9.4 9.4v1.2M12.6 9.4v1.2M15.8 9.4v1.2M6.2 12.6v1.2M9.4 12.6v1.2M12.6 12.6v1.2M15.8 12.6v1.2',
          stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M7.6 16.1h8.8',
          stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round',
        }),
        h('path', {
          className: 'tp-panel-spark',
          d: 'M4.2 2.9 2.8 1.7M6.8 2.2V.9',
          strokeWidth: 1.4, strokeLinecap: 'round',
        }),
      );
    }

    // ---------- page ----------

    function useLocaleVersion() {
      const [, setVersion] = React.useState(0);
      React.useEffect(() => {
        const service = localeService;
        if (!service || typeof service.subscribe !== 'function') return undefined;
        let dispose = null;
        try {
          dispose = service.subscribe(() => {
            activeLanguage = detectLanguage(service);
            setVersion((version) => version + 1);
          });
        } catch {
          return undefined;
        }
        return () => {
          if (typeof dispose === 'function') dispose();
        };
      }, []);
    }

    function TypingPage() {
      useLocaleVersion();
      const [session, setSession] = React.useState(() => createSession(loadExercisePreference().duration, activeLanguage,
        activeLanguage === 'en' ? 'off' : loadHintPreference().mode));
      React.useEffect(() => { rememberSession(session); }, [session.id]);
      const [records, setRecords] = React.useState(loadRecords);
      const best = records.best;
      const legacyBest = records.legacy;
      const [isRecord, setIsRecord] = React.useState(false);
      const [comparison, setComparison] = React.useState(null);
      const [recordsOpen, setRecordsOpen] = React.useState(false);
      const [recordsView, setRecordsView] = React.useState('recent');
      const [recordsLanguage, setRecordsLanguage] = React.useState('all');
      const [recordsPassage, setRecordsPassage] = React.useState(null);
      const [clearConfirm, setClearConfirm] = React.useState(false);
      const [clearError, setClearError] = React.useState(false);
      const recordsDialogRef = React.useRef(null);
      const recordsButtonRef = React.useRef(null);
      const recordsCloseRef = React.useRef(null);
      const recordsShowAllRef = React.useRef(null);
      const clearCancelRef = React.useRef(null);
      const clearButtonRef = React.useRef(null);
      const [soundPreference, setSoundPreference] = React.useState(loadSoundPreference);
      const soundPreferenceRef = React.useRef(soundPreference);
      const [settingsOpen, setSettingsOpen] = React.useState(false);
      const [soundStatus, setSoundStatus] = React.useState('idle');
      const [soundSaveError, setSoundSaveError] = React.useState(false);
      const settingsDialogRef = React.useRef(null);
      const settingsButtonRef = React.useRef(null);
      const settingsCloseRef = React.useRef(null);
      const audioRef = React.useRef({ context: null, player: null, pack: null, preparing: null, epoch: 0, disposed: false, status: 'idle' });
      const [cursorPreference, setCursorPreference] = React.useState(loadCursorPreference);
      const [cursorSaveError, setCursorSaveError] = React.useState(false);
      const [focused, setFocused] = React.useState(false);
      const [saveError, setSaveError] = React.useState(false);
      const [hintPreference, setHintPreference] = React.useState(loadHintPreference);
      const [hintSaveError, setHintSaveError] = React.useState(false);
      const [annotationAttempt, setAnnotationAttempt] = React.useState(0);
      const [corpusBusy, setCorpusBusy] = React.useState(false);
      const [toast, setToast] = React.useState(null);
      const toastSequence = React.useRef(0);
      const [isApple] = React.useState(() => /Mac|iPhone|iPad|iPod/i.test(window.navigator?.userAgentData?.platform || window.navigator?.platform || ''));
      React.useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(() => setToast(null), 3000);
        return () => window.clearTimeout(timer);
      }, [toast]);
      const [corpusPreference, setCorpusPreference] = React.useState(() => hasLocalCorpus ? loadCorpusPreference() : 'builtin');
      const [corpusPreferenceError, setCorpusPreferenceError] = React.useState(false);
      const [exercisePreference, setExercisePreference] = React.useState(loadExercisePreference);
      const [exerciseSaveError, setExerciseSaveError] = React.useState(false);
      React.useEffect(() => {
        try { window.localStorage.setItem(EXERCISE_KEY, JSON.stringify({ version: 2, preset: exercisePreference.preset })); setExerciseSaveError(false); }
        catch { setExerciseSaveError(true); }
      }, [exercisePreference.preset]);
      const corpusRequest = React.useRef(null);
      const [caretIndex, setCaretIndex] = React.useState(0);
      const [composition, setComposition] = React.useState({ active: false, text: '' });
      const compositionRef = React.useRef({ active: false, anchor: 0 });
      const inputRef = React.useRef(null);
      const rootRef = React.useRef(null);
      const shortcutHandlerRef = React.useRef(null);
      const previewRef = React.useRef(null);
      const viewportRef = React.useRef(null);
      const sessionRef = React.useRef(session);
      const focusAfterRestart = React.useRef(false);
      const recordsRef = React.useRef(records);
      const handledResultRef = React.useRef(null);

      function updateSession(update) {
        const next = update(sessionRef.current);
        sessionRef.current = next;
        setSession(next);
        return next;
      }

      function position() {
        positionInput(viewportRef.current, inputRef.current, previewRef.current);
      }

      React.useLayoutEffect(() => {
        const dialog = recordsDialogRef.current;
        if (!dialog) return;
        if (recordsOpen && !dialog.open) { dialog.showModal(); recordsCloseRef.current?.focus(); }
        else if (!recordsOpen && dialog.open) { dialog.close(); recordsButtonRef.current?.focus({ preventScroll: true }); }
      }, [recordsOpen]);

      React.useEffect(() => {
        if (clearConfirm) clearCancelRef.current?.focus();
      }, [clearConfirm]);

      React.useLayoutEffect(() => {
        const dialog = settingsDialogRef.current;
        if (!dialog) return;
        if (settingsOpen && !dialog.open) {
          dialog.showModal();
          (dialog.querySelector?.('select') || settingsCloseRef.current)?.focus();
        } else if (!settingsOpen && dialog.open) { dialog.close(); settingsButtonRef.current?.focus({ preventScroll: true }); }
      }, [settingsOpen]);

      function stopSound() {
        audioRef.current.epoch++;
        audioRef.current.player?.stop();
      }

      function audioStatus(status) {
        if (audioRef.current.disposed) return;
        audioRef.current.status = status;
        setSoundStatus(status);
      }

      async function prepareSound(preview = false) {
        const state = audioRef.current;
        const settings = soundPreferenceRef.current;
        if (state.disposed || settings.pack === 'off' || !settings.volume) return false;
        const epoch = state.epoch;
        let context;
        try {
          // Construct/resume synchronously in the click, focus or key gesture.
          if (!state.context) {
            const Audio = window.AudioContext || window.webkitAudioContext;
            if (!Audio) throw new Error('Web Audio unavailable');
            state.context = new Audio({ latencyHint: 'interactive' });
          }
          context = state.context;
          const resumed = context.state === 'running' ? Promise.resolve() : context.resume();
          // Handle rejection immediately, even while the local chunk is loading.
          const resumeResult = Promise.resolve(resumed).then(() => true, () => false);
          if (!state.player) {
            audioStatus('loading');
            const module = await loadAudioModule();
            if (state.disposed || state.context !== context) return false;
            if (!state.player) state.player = module.createAudioPlayer(context, module.samples, status => {
              if (state.context === context) audioStatus(status);
            });
          }
          if (state.disposed || state.context !== context || settings.pack !== soundPreferenceRef.current.pack) return false;
          state.player.setVolume(soundPreferenceRef.current.volume);
          if (state.pack !== settings.pack || state.status === 'error') {
            state.pack = settings.pack;
            state.preparing = state.player.select(settings.pack);
          }
          const ready = await state.preparing;
          const resumedOk = await resumeResult;
          if (state.disposed || state.context !== context || settings.pack !== soundPreferenceRef.current.pack) return false;
          if (!resumedOk || context.state !== 'running') { audioStatus('error'); return false; }
          if (preview && ready && epoch === state.epoch && !document.hidden) return state.player.preview();
          return Boolean(ready);
        } catch { if (!context || state.context === context) audioStatus('error'); return false; }
      }

      function changeSound(patch) {
        const next = { ...soundPreferenceRef.current, ...patch };
        if (!SOUND_PACKS.includes(next.pack) || !Number.isFinite(next.volume)) return;
        next.volume = Math.max(0, Math.min(100, Math.round(next.volume)));
        soundPreferenceRef.current = next; setSoundPreference(next);
        stopSound();
        try { window.localStorage.setItem(SOUND_KEY, JSON.stringify(next)); setSoundSaveError(false); }
        catch { setSoundSaveError(true); }
        const state = audioRef.current;
        state.player?.setVolume(next.volume);
        if (next.pack === 'off') {
          state.pack = 'off'; state.player?.select('off'); audioStatus('idle');
        } else if (next.volume) void prepareSound();
      }

      function playKeySound(event, input) {
        const current = sessionRef.current;
        const state = audioRef.current;
        if (document.hidden || document.activeElement !== event.currentTarget || current.result || !inputReady()
          || current.mode === 'timed' && current.startAt != null && performance.now() - current.startAt >= current.duration * 1000
          || event.repeat || input.repeat || event.ctrlKey || event.metaKey || event.altKey
          || soundPreferenceRef.current.pack === 'off' || !soundPreferenceRef.current.volume) return;
        const key = event.key;
        const composing = compositionRef.current.active || input.isComposing || event.isComposing || input.keyCode === 229;
        if (!(key?.length === 1 || ['Backspace', 'Delete', 'Process', 'Unidentified'].includes(key) || key === 'Enter' && composing)) return;
        const kind = key === ' ' || input.code === 'Space' ? 'space' : key === 'Backspace' || key === 'Delete' ? 'backspace' : key === 'Enter' ? 'enter' : 'generic';
        if (state.player && state.context.state === 'running' && state.status === 'ready' && state.pack === soundPreferenceRef.current.pack) state.player.play(kind);
        else if (state.status !== 'error') void prepareSound(); // Drop unready keystrokes, never replay a burst.
      }

      React.useEffect(() => {
        const state = audioRef.current;
        state.disposed = false;
        const hidden = () => { if (document.hidden) stopSound(); };
        document.addEventListener('visibilitychange', hidden);
        window.addEventListener('blur', stopSound);
        return () => {
          state.disposed = true; stopSound();
          document.removeEventListener('visibilitychange', hidden);
          window.removeEventListener('blur', stopSound);
          if (state.player) state.player.dispose();
          else if (state.context) { try { Promise.resolve(state.context.close()).catch(() => {}); } catch { /* Already closed. */ } }
          state.player = null; state.context = null; state.pack = null;
        };
      }, []);

      React.useLayoutEffect(() => {
        if (viewportRef.current) viewportRef.current.scrollTop = 0;
        if (focusAfterRestart.current) {
          focusAfterRestart.current = false;
          focusInput();
        }
      }, [session.id]);

      React.useLayoutEffect(() => {
        revealCaret(viewportRef.current);
        position();
      }, [session.id, session.typed, session.annotations, caretIndex, composition.text]);

      React.useEffect(() => {
        if (session.hints === 'off') return undefined;
        let cancelled = false;
        const id = session.id;
        loadAnnotations(session.language, session.text, session).then(annotations => {
          if (cancelled || sessionRef.current.id !== id) return;
          updateSession(previous => ({ ...previous, annotations, annotationState: 'ready' }));
        }).catch(() => {
          if (cancelled || sessionRef.current.id !== id) return;
          updateSession(previous => ({ ...previous, annotationState: 'error' }));
        });
        return () => { cancelled = true; };
      }, [session.id, annotationAttempt]);

      React.useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return undefined;
        const resize = () => {
          revealCaret(viewport);
          if (document.activeElement === inputRef.current) {
            revealInputRegion(viewport);
          }
          position();
        };
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
        if (observer) observer.observe(viewport);
        window.addEventListener('scroll', position, true);
        window.addEventListener('resize', resize);
        return () => {
          if (observer) observer.disconnect();
          window.removeEventListener('scroll', position, true);
          window.removeEventListener('resize', resize);
        };
      }, []);

      React.useEffect(() => {
        if (session.startAt == null || session.result) return undefined;
        const id = window.setInterval(() => {
          updateSession((previous) => {
            if (previous.startAt == null || previous.result) return previous;
            const now = performance.now();
            const elapsed = now - previous.startAt;
            if (previous.mode === 'timed' && elapsed >= previous.duration * 1000) {
              return finishSession({ ...previous, nowMs: now }, elapsed);
            }
            return { ...previous, nowMs: now };
          });
        }, 100);
        return () => window.clearInterval(id);
      }, [session.startAt, session.result]);

      React.useEffect(() => {
        const result = session.result;
        if (!result) {
          handledResultRef.current = null;
          return;
        }
        if (handledResultRef.current === result) return;
        handledResultRef.current = result;
        stopSound();
        const entry = historyEntry(session);
        const previous = recordsRef.current;
        const key = recordKey(result.language, result.duration, result.hints, entry.corpusVersion, entry.source, result);
        const current = result.eligible ? previous.best[key] : entry.mode === 'passage' ? samePassageBest(previous.history, entry) : null;
        const better = isBetter(result, current);
        setComparison(result.eligible || entry.mode === 'passage' ? { previous: current || null, mode: entry.mode } : null);
        setIsRecord(result.eligible ? better : entry.mode === 'passage' && Boolean(current) && better);
        const next = {
          ...previous,
          history: [entry, ...previous.history.filter(item => item.id !== entry.id)].slice(0, HISTORY_LIMIT),
          best: result.eligible && better ? { ...previous.best, [key]: { speed: result.speed, accuracy: result.accuracy, at: result.at } } : previous.best,
        };
        recordsRef.current = next;
        setRecords(next);
        setSaveError(!saveRecords(next));
      }, [session.result]);

      function openRecords() {
        const current = sessionRef.current;
        if (current.startAt != null && !current.result || compositionRef.current.active) return;
        stopSound();
        cancelCorpus();
        setRecordsPassage(null);
        setClearConfirm(false); setClearError(false); setRecordsOpen(true);
      }

      function closeRecords() {
        setClearConfirm(false); setClearError(false); setRecordsOpen(false);
      }

      React.useLayoutEffect(() => {
        if (recordsPassage) recordsShowAllRef.current?.focus();
      }, [recordsPassage]);

      function clearRecords() {
        const empty = { version: 4, best: {}, legacy: {}, history: [] };
        if (!saveRecords(empty)) { setClearError(true); return; }
        recordsRef.current = empty; setRecords(empty);
        setSaveError(false); setIsRecord(false); setComparison(null);
        setRecordsPassage(null); setClearConfirm(false); setClearError(false);
        recordsCloseRef.current?.focus();
      }

      React.useEffect(() => () => { corpusRequest.current?.abort(); corpusRequest.current = null; }, []);

      // A remembered local source also applies when the page is reopened or
      // the practice language changes, until a failed selection falls back.
      React.useEffect(() => {
        if (corpusPreference === 'local') nextPassage(false);
      }, [corpusPreference, session.language, session.mode, session.length, session.duration]);

      function changeCorpusPreference(source) {
        if (!['builtin', 'local'].includes(source) || source === corpusPreference) return;
        restart(session.duration, false, session.language, session.hints, null, null);
        setCorpusPreference(source);
        setCorpusPreferenceError(!saveCorpusPreference(source));
      }

      function changeExercise(preset, focus = false) {
        const next = exerciseFor(preset);
        if (!next || next.preset === exercisePreference.preset) return;
        setExercisePreference(next);
        restart(next.duration, focus, session.language, session.hints, null, null, next);
      }

      function exerciseKeyDown(event, index) {
        const presets = [...DURATIONS.map(String), ...PracticeCorpus.TEXT_LENGTHS];
        const keys = { ArrowRight: (index + 1) % presets.length, ArrowDown: (index + 1) % presets.length,
          ArrowLeft: (index + presets.length - 1) % presets.length, ArrowUp: (index + presets.length - 1) % presets.length,
          Home: 0, End: presets.length - 1 };
        if (!Object.hasOwn(keys, event.key)) return;
        event.preventDefault();
        event.currentTarget.closest('[role="radiogroup"]').querySelectorAll('[role="radio"]')[keys[event.key]].focus();
        changeExercise(presets[keys[event.key]]);
      }

      function cancelCorpus() {
        corpusRequest.current?.abort(); corpusRequest.current = null;
        setCorpusBusy(false); setToast(null);
      }

      async function nextPassage(focus = true) {
        if (corpusRequest.current) { cancelCorpus(); return; }
        if (corpusPreference === 'builtin') {
          restart(session.duration, focus, session.language, session.hints, null, null);
          return;
        }
        const controller = new AbortController();
        corpusRequest.current = controller;
        const current = sessionRef.current;
        setCorpusBusy(true); setToast(null);
        let timeout;
        const deadline = new Promise((_, reject) => {
          timeout = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, 12000);
        });
        let candidate = null;
        let fallback = 'corpusEmpty';
        try {
          const params = new URLSearchParams({ language: current.language, mode: current.mode, length: current.length });
          for (const fingerprint of current.source?.fingerprints || [current.source?.fingerprint].filter(Boolean)) params.append('exclude', fingerprint);
          for (const fingerprint of loadRecent().local[current.language]) params.append('recent', fingerprint);
          const body = await Promise.race([deadline, platform.fetchCorpus(params, controller.signal)]);
          const item = body.candidate;
          if (item && item.language === current.language && typeof item.text === 'string' && item.text.length > 0
            && (current.mode === 'timed' ? item.mode === 'timed' && item.text.length >= TEXT_CHARS
              && Array.isArray(item.source?.fingerprints) && item.source.fingerprints.length > 0 && item.source.fingerprints.length <= PracticeCorpus.RECENT_LIMIT
              && item.source.fingerprints.every(id => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id))
              : item.mode !== 'timed' && (item.length == null ? current.length === 'short' : item.length === current.length))
            && item.text.length <= 3000 && (current.mode === 'timed' ? /^[a-f0-9]{64}$/.test(item.source?.fingerprint || '') : item.source?.sessionId)) candidate = item;
          if (!candidate && !['empty', 'limited', 'insufficient'].includes(body.reason)) fallback = 'corpusUnavailable';
        } catch { fallback = 'corpusUnavailable'; }
        finally { clearTimeout(timeout); }
        if (corpusRequest.current !== controller || sessionRef.current.id !== current.id) return;
        corpusRequest.current = null;
        setCorpusBusy(false);
        if (candidate) {
          restart(current.duration, focus, current.language, current.hints, candidate.text, candidate.source);
        } else {
          restart(current.duration, focus, current.language, current.hints, null, null);
          setCorpusPreference('builtin');
          setCorpusPreferenceError(!saveCorpusPreference('builtin'));
          setToast({ message: fallback, id: ++toastSequence.current });
        }
      }

      function restart(nextDuration, focus = false, language = session.language, hints = language === 'en' ? 'off' : hintPreference.mode, originalText, source = language === session.language ? session.source : null,
        exercise = exercisePreference, pronunciation = hintPreference) {
        stopSound();
        cancelCorpus();
        const duration = nextDuration || session.duration;
        // Change the epoch before blurring. Some IMEs commit on blur; that
        // commit belongs to the old input node and must not enter the new run.
        const preserve = language === session.language && exercise.mode === session.mode && exercise.length === session.length;
        const text = originalText === null ? undefined : originalText || (source || preserve && session.mode === 'passage' ? session.text : undefined);
        const passageId = !source && text === session.text ? session.passageId : null;
        updateSession(() => createSession(duration, language, hints, text, source, exercise, passageId, pronunciation));
        if (inputRef.current) inputRef.current.blur();
        compositionRef.current = { active: false, anchor: 0 };
        setComposition({ active: false, text: '' });
        setCaretIndex(0);
        setIsRecord(false);
        setComparison(null);
        setSaveError(false);
        focusAfterRestart.current = focus;
      }

      function currentEvent() {
        return session.id === sessionRef.current.id;
      }

      function nativeEvent(event) { return event.nativeEvent || event; }

      function restartCurrent() {
        const current = sessionRef.current;
        restart(current.duration, true, current.language, current.hints, current.text, current.source);
      }

      function handlePracticeShortcut(event) {
        const primary = fullShortcuts && !event.shiftKey && !event.altKey
          && (isApple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey);
        const next = primary && (event.code === 'KeyR' || event.key?.toLowerCase() === 'r');
        const reset = event.key === 'Escape' && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
        const cycle = primary
          ? OPTION_SHORTCUTS.find(option => event.code === 'Key' + option.key || event.key?.toUpperCase() === option.key) : null;
        if ((!next && !reset && !cycle) || event.defaultPrevented) return;
        const inside = rootRef.current?.contains(event.target);
        if (!inside && ((!next && !cycle) || event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), .xterm'))) return;
        const modal = document.querySelector('dialog[open], [aria-modal="true"]');
        if (modal && !rootRef.current?.contains(modal)) return;
        // Keep native candidate/select Escape and modal dismissal intact. A
        // matching reload chord is suppressed here even when no action is safe.
        if (next) event.preventDefault();
        const input = nativeEvent(event);
        if (recordsOpen || settingsOpen || event.target?.closest?.('dialog, select')
          || compositionRef.current.active || input.isComposing || event.isComposing || input.keyCode === 229) return;
        event.preventDefault(); event.stopPropagation();
        if (event.repeat || input.repeat) return;
        if (next) void nextPassage();
        else if (cycle?.id === 'language') {
          restart(session.duration, true, LANGUAGES[(LANGUAGES.indexOf(session.language) + 1) % LANGUAGES.length]);
        } else if (cycle) {
          const presets = cycle.id === 'duration' ? DURATIONS.map(String) : PracticeCorpus.TEXT_LENGTHS;
          // Entering the other mode starts at its first option; the six
          // presets still share one selection and one persisted preference.
          changeExercise(presets[(presets.indexOf(exercisePreference.preset) + 1) % presets.length], true);
        } else restartCurrent();
      }

      function optionShortcutTip(option) {
        if (!fullShortcuts) return null;
        return h('span', { className: 'tp-shortcut-tip', id: 'tp-' + option.id + '-shortcut', role: 'tooltip' },
          isApple ? '⌘ ' + option.key : 'Ctrl+' + option.key);
      }

      shortcutHandlerRef.current = handlePracticeShortcut;
      React.useEffect(() => {
        // Desktop DSH consumes native bindings before DOM keydown. Reserve
        // these fixed actions only while this page is mounted, then restore
        // host bindings on unmount. Older hosts still use the DOM listener.
        const commands = fullShortcuts ? [{
          id: 'typing-practice.next-passage',
          label: () => t('panelLabel') + ' · ' + t('corpusNext'),
          keys: [isApple ? '⌘' : 'Ctrl', 'R'],
          bindings: [{ code: 'KeyR', modifiers: [isApple ? 'meta' : 'control'] }],
          group: 'application',
        }, ...OPTION_SHORTCUTS.map(option => ({
          id: 'typing-practice.cycle-' + option.id,
          label: () => t('panelLabel') + ' · ' + t(option.label),
          keys: [isApple ? '⌘' : 'Ctrl', option.key],
          bindings: [{ code: 'Key' + option.key, modifiers: [isApple ? 'meta' : 'control'] }],
          group: 'application',
        }))] : [];
        const shortcuts = getShortcuts();
        const releases = commands.map(command => shortcuts?.registerFixed?.(command));
        const keydown = event => shortcutHandlerRef.current(event);
        // Opening the page keeps focus on the sidebar; capture there as well.
        window.addEventListener('keydown', keydown, true);
        return () => {
          window.removeEventListener('keydown', keydown, true);
          for (const release of releases.reverse()) release?.();
        };
      }, [isApple]);

      function inputReady() {
        return ['off', 'ready'].includes(sessionRef.current.annotationState);
      }

      function startComposition(text) {
        if (text) updateSession((previous) => {
          const now = performance.now();
          const checked = checkDeadline(previous, now);
          return checked.result || checked.startAt != null ? checked
            : { ...checked, startAt: now, nowMs: now };
        });
        setComposition({ active: true, text });
      }

      function handleCompositionStart(event) {
        if (!currentEvent() || sessionRef.current.result || !inputReady()) return;
        compositionRef.current = { active: true, anchor: caretIndex };
        startComposition(event.data || '');
      }

      function handleCompositionUpdate(event) {
        if (!currentEvent()) return;
        if (!compositionRef.current.active) return;
        startComposition(event.data || '');
      }

      function updateCaret(element) {
        if (!element || compositionRef.current.active) return;
        const end = element.selectionEnd == null ? element.value.length : element.selectionEnd;
        setCaretIndex(characters(element.value.slice(0, end)).length);
      }

      function acceptBuffer(element) {
        if (!inputReady()) {
          element.value = sessionRef.current.typed;
          return;
        }
        const now = performance.now();
        const next = updateSession((previous) => reconcileText(previous, element.value, now));
        if (element.value !== next.typed) element.value = next.typed;
        updateCaret(element);
      }

      function handleCompositionEnd(event) {
        if (!currentEvent() || !compositionRef.current.active) return;
        compositionRef.current.active = false;
        setComposition({ active: false, text: '' });
        // The native buffer already contains the confirmed text (or the
        // restored pre-composition text after cancellation). Do not guess a
        // candidate from the target text or append event.data a second time.
        acceptBuffer(event.currentTarget);
      }

      function handleInput(event) {
        if (!currentEvent()) return;
        if (!inputReady()) { event.currentTarget.value = sessionRef.current.typed; return; }
        const input = nativeEvent(event);
        if (input.isComposing || compositionRef.current.active) {
          if (!compositionRef.current.active) compositionRef.current = { active: true, anchor: caretIndex };
          startComposition(input.data || '');
          return;
        }
        if (['insertFromPaste', 'insertFromDrop', 'insertFromYank'].includes(input.inputType)) {
          event.currentTarget.value = sessionRef.current.typed;
          updateCaret(event.currentTarget);
          return;
        }
        acceptBuffer(event.currentTarget);
      }

      function handleKeyDown(event) {
        if (!currentEvent()) return;
        if (event.key === 'Tab') return;
        if (!inputReady()) { event.preventDefault(); return; }
        const input = nativeEvent(event);
        playKeySound(event, input);
        // React's keyboard event and the browser's native event can disagree
        // at the edges of a composition. Let the IME own candidate keys.
        if (compositionRef.current.active || input.isComposing || event.isComposing || input.keyCode === 229) return;
        const checked = updateSession((previous) => checkDeadline(previous, performance.now()));
        if (checked.result || event.key === 'Enter') event.preventDefault();
      }

      function focusInput() {
        const element = inputRef.current;
        if (element) element.focus({ preventScroll: true });
      }

      function blockEvent(event) {
        event.preventDefault();
      }

      function renderRecordScore(speed, accuracy, language) {
        return h('div', { className: 'tp-record-score' },
          h('span', { className: 'tp-record-speed' }, speed),
          h('span', { className: 'tp-record-unit' }, t(language === 'en' ? 'statsWpm' : 'statsCpm')),
          h('p', { className: 'tp-record-meta' }, t('statsAccuracy') + ' ' + Math.round(accuracy * 100) + '%'));
      }

      function openSettings() {
        const current = sessionRef.current;
        if (current.startAt != null && !current.result || compositionRef.current.active) return;
        cancelCorpus(); stopSound(); setSettingsOpen(true);
      }

      function closeSettings() { stopSound(); setSettingsOpen(false); }

      function renderDialogClose(label, ref, onClick) {
        return h('button', { className: 'tp-btn tp-quiet tp-dialog-close', type: 'button', ref, onClick, 'aria-label': label },
          h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
            strokeLinecap: 'round', 'aria-hidden': true, focusable: false },
            h('path', { d: 'M5 5 19 19M19 5 5 19' })));
      }

      function renderSettings() {
        const props = { className: 'tp-records-dialog tp-settings-dialog', ref: settingsDialogRef, onClose: closeSettings };
        if (!settingsOpen) return h('dialog', props);
        return h('dialog', { ...props, 'aria-labelledby': 'tp-settings-title',
          onCancel: event => { event.preventDefault(); closeSettings(); }, onKeyDown: event => event.stopPropagation() },
          h('div', { className: 'tp-records-header' }, h('h2', { id: 'tp-settings-title' }, t('settings')),
            renderDialogClose(t('settingsClose'), settingsCloseRef, closeSettings)),
          h('div', { className: 'tp-settings-content' },
            [['cursor', renderCursor], ['annotations', renderAnnotations], ['sound', renderSound]].map(([section, render]) =>
              h('section', { key: section, className: 'tp-settings-section', 'aria-labelledby': 'tp-settings-' + section },
                h('h3', { id: 'tp-settings-' + section }, t(section)), render())),
            platform.Settings ? h(platform.Settings, { language: activeLanguage }) : null,
            h('p', { className: 'tp-settings-note' }, t('settingsLocalTextNote'))));
      }

      function changeHints(patch) {
        const current = sessionRef.current;
        if (current.startAt != null && !current.result || compositionRef.current.active) return;
        const next = { ...hintPreference, ...patch };
        if (!HINT_MODES.includes(next.mode) || !PINYIN_FORMATS.includes(next.pinyinFormat) || !SHUANGPIN_SCHEMES.includes(next.pinyinScheme)) return;
        setHintPreference(next);
        try { window.localStorage.setItem(HINT_KEY, JSON.stringify(next)); setHintSaveError(false); }
        catch { setHintSaveError(true); }
        const hints = current.language === 'en' ? 'off' : next.mode;
        if (hintIdentity(current.language, hints, next) !== hintIdentity(current.language, current.hints, current)) {
          restart(current.duration, false, current.language, hints, current.text, current.source, exercisePreference, next);
        }
      }

      function renderAnnotations() {
        // Fixed preview stays available in every language without loading the
        // Mandarin dictionary. Fixtures verify these two syllables per scheme.
        const isShuangpin = hintPreference.pinyinFormat === 'shuangpin';
        const preview = !isShuangpin ? ['shuāng', 'pīn'] : hintPreference.pinyinScheme === 'xiaohe' ? ['ul', 'pb'] : ['ud', 'pn'];
        return h('div', { className: 'tp-sound-body' },
          h('div', { className: 'tp-pinyin-layout' },
            h('div', { className: 'tp-pinyin-controls' },
              h('label', { className: 'tp-sound-field' },
                h('span', null, t('hintDisplay')),
                h('span', { className: 'tp-select' }, h('select', {
                  value: hintPreference.mode, 'aria-label': t('hintDisplay'), title: session.language === 'en' ? undefined : t('hintChange'),
                  onChange: event => changeHints({ mode: event.currentTarget.value }),
                }, HINT_MODES.map(mode => h('option', { key: mode, value: mode }, t('hint_' + mode)))),
                h('svg', { className: 'tp-select-chevron', viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false },
                  h('path', { d: 'M3 4.5 6 7.5 9 4.5' })))),
              h('div', { className: 'tp-sound-field' }, h('span', { id: 'tp-pinyin-format-label' }, t('pinyinFormat')),
                h('div', { className: 'tp-seg tp-pinyin-formats', role: 'group', 'aria-labelledby': 'tp-pinyin-format-label' },
                  PINYIN_FORMATS.map(format => h('button', { type: 'button', key: format,
                    className: 'tp-seg-btn' + (hintPreference.pinyinFormat === format ? ' active' : ''),
                    'aria-pressed': hintPreference.pinyinFormat === format,
                    onClick: () => changeHints({ pinyinFormat: format }),
                  }, t('pinyin_' + format))))),
              h('label', { className: 'tp-sound-field' }, h('span', null, t('shuangpinScheme')),
                h('span', { className: 'tp-select' }, h('select', {
                  value: hintPreference.pinyinScheme, disabled: !isShuangpin, 'aria-label': t('shuangpinScheme'),
                  'aria-describedby': 'tp-pinyin-note', onChange: event => changeHints({ pinyinScheme: event.currentTarget.value }),
                }, SHUANGPIN_SCHEMES.map(scheme => h('option', { key: scheme, value: scheme }, t('scheme_' + scheme)))),
                h('svg', { className: 'tp-select-chevron', viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false },
                  h('path', { d: 'M3 4.5 6 7.5 9 4.5' }))))),
            h('div', { className: 'tp-pinyin-preview', role: 'img', 'aria-label': t('pinyinPreview') + ': 双拼 · ' + preview.join(' ') },
              ['双', '拼'].map((char, i) => h('ruby', { className: 'tp-ruby', key: char, 'aria-hidden': true }, char,
                h('rt', { className: isShuangpin ? 'tp-shuangpin' : undefined }, preview[i]))))),
          h('p', { className: 'tp-pinyin-note', id: 'tp-pinyin-note' }, t('pinyinNote')),
          h('div', { className: 'tp-sound-status tp-hint-status', 'data-empty': !hintSaveError },
            h('span', { className: 'tp-status-size', 'aria-hidden': true }, t('hintSaveError')),
            h('span', { role: 'status' }, hintSaveError ? t('hintSaveError') : '')));
      }

      function changeCursor(patch) {
        const next = { ...cursorPreference, ...patch };
        if (!CURSOR_SHAPES.includes(next.shape) || typeof next.glow !== 'boolean' || typeof next.blink !== 'boolean') return;
        setCursorPreference(next);
        try { window.localStorage.setItem(CURSOR_KEY, JSON.stringify(next)); setCursorSaveError(false); }
        catch { setCursorSaveError(true); }
      }

      function renderCursor() {
        return h('div', { className: 'tp-sound-body' },
            h('div', { className: 'tp-cursor-layout' },
              h('div', { className: 'tp-cursor-controls' },
                h('label', { className: 'tp-sound-field' }, h('span', null, t('cursorShape')),
                  h('span', { className: 'tp-select' }, h('select', { value: cursorPreference.shape, 'aria-label': t('cursorShape'), onChange: event => changeCursor({ shape: event.currentTarget.value }) },
                    CURSOR_SHAPES.map(shape => h('option', { key: shape, value: shape }, t('cursor_' + shape)))),
                    h('svg', { className: 'tp-select-chevron', viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false }, h('path', { d: 'M3 4.5 6 7.5 9 4.5' })))),
                h('div', { className: 'tp-cursor-toggles' }, ['glow', 'blink'].map(option => h('label', { className: 'tp-cursor-toggle', key: option },
                  h('span', null, t(option === 'glow' ? 'cursorGlow' : 'cursorBlink')),
                  h('input', { type: 'checkbox', role: 'switch', checked: cursorPreference[option], onChange: event => changeCursor({ [option]: event.currentTarget.checked }) }))))),
              h('div', { className: 'tp-cursor-preview', role: 'img', 'aria-label': t('cursorPreview') },
                h('span', { className: 'tp-cursor-preview-text', 'aria-hidden': true }, 'Aa ', h('span', { className: 'tp-char caret' }, '中'), '文'))),
            h('div', { className: 'tp-sound-status tp-cursor-status', 'data-empty': !cursorSaveError },
              h('span', { className: 'tp-status-size', 'aria-hidden': true }, t('cursorSaveError')),
              h('span', { role: 'status' }, cursorSaveError ? t('cursorSaveError') : '')));
      }

      function renderSound() {
        return h('div', { className: 'tp-sound-body' },
          h('div', { className: 'tp-sound-picker' },
            h('label', { className: 'tp-sound-field' }, h('span', null, t('soundPack')),
              h('span', { className: 'tp-select' }, h('select', { value: soundPreference.pack, 'aria-label': t('soundPack'), onChange: event => changeSound({ pack: event.currentTarget.value }) },
                SOUND_PACKS.map(pack => h('option', { key: pack, value: pack }, t('sound_' + pack)))),
                h('svg', { className: 'tp-select-chevron', viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false }, h('path', { d: 'M3 4.5 6 7.5 9 4.5' })))),
            h('button', { className: 'tp-btn', type: 'button', disabled: soundPreference.pack === 'off' || !soundPreference.volume,
              onClick: () => { stopSound(); void prepareSound(true); } }, t('soundPreview'))),
            h('label', { className: 'tp-sound-field' }, h('span', null, t('soundVolume')),
              h('span', { className: 'tp-sound-volume' }, h('input', { type: 'range', min: 0, max: 100, step: 5, value: soundPreference.volume,
                'aria-valuetext': soundPreference.volume + '%', onChange: event => changeSound({ volume: Number(event.currentTarget.value) }) }),
              h('output', { 'aria-hidden': true }, soundPreference.volume + '%'))),
            h('div', { className: 'tp-sound-status tp-audio-status' },
              h('span', { className: 'tp-status-size', 'aria-hidden': true }, t('soundLoading')),
              h('span', { role: 'status' }, soundSaveError ? t('soundSaveError') : soundStatus === 'loading' ? t('soundLoading') : soundStatus === 'error' ? t('soundError') : '')),
            h('a', { className: 'tp-sound-credit', href: 'https://github.com/tplai/kbsim', target: '_blank', rel: 'noreferrer' }, t('soundCredit')),
          );
      }

      function renderRecords() {
        // Keep history rendering off the keystroke path while the dialog is closed.
        if (!recordsOpen) return h('dialog', { className: 'tp-records-dialog', ref: recordsDialogRef, onClose: closeRecords });
        const history = records.history.filter(item => (recordsLanguage === 'all' || item.language === recordsLanguage)
          && (!recordsPassage || passageKey(item) === recordsPassage));
        const bestRows = Object.entries(best).filter(([key]) => recordsLanguage === 'all' || key.startsWith(recordsLanguage + ':')).sort(([a], [b]) => a.localeCompare(b));
        const legacyRows = ['all', 'en'].includes(recordsLanguage) ? Object.entries(legacyBest) : [];
        const hasRecords = records.history.length || Object.keys(best).length || Object.keys(legacyBest).length;
        return h('dialog', { className: 'tp-records-dialog', ref: recordsDialogRef,
          'aria-labelledby': 'tp-records-title', 'aria-describedby': 'tp-records-limit',
          onCancel: event => {
            event.preventDefault();
            if (clearConfirm) { setClearConfirm(false); setClearError(false); recordsCloseRef.current?.focus(); }
            else closeRecords();
          },
          onClose: closeRecords,
          onKeyDown: event => event.stopPropagation(),
        },
          h('div', { className: 'tp-records-header' },
            h('h2', { id: 'tp-records-title' }, t('recordsTitle')),
            renderDialogClose(t('recordsClose'), recordsCloseRef, closeRecords)),
          !clearConfirm ? h('div', { className: 'tp-records-toolbar' },
            h('div', { className: 'tp-seg', role: 'group', 'aria-label': t('recordsTitle') },
              ['recent', 'best'].map(view => h('button', { type: 'button', key: view,
                className: 'tp-seg-btn' + (recordsView === view ? ' active' : ''), 'aria-pressed': recordsView === view,
                onClick: () => { setRecordsView(view); setRecordsPassage(null); },
              }, t(view === 'recent' ? 'recordsRecent' : 'recordsBest')))),
            h('span', { className: 'tp-select tp-records-filter' },
              h('select', { value: recordsLanguage, 'aria-label': t('recordsLanguage'), onChange: event => {
                const language = event.currentTarget.value;
                if (language === 'all' || LANGUAGES.includes(language)) { setRecordsLanguage(language); setRecordsPassage(null); }
              } }, ['all', ...LANGUAGES].map(language => h('option', { key: language, value: language }, t(language === 'all' ? 'recordsAll' : 'language_' + language)))),
              h('svg', { className: 'tp-select-chevron', viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false }, h('path', { d: 'M3 4.5 6 7.5 9 4.5' }))),
          ) : null,
          h('div', { className: 'tp-records-body' },
            clearConfirm ? h('div', { className: 'tp-clear-confirm' },
              h('h3', null, t('recordsClearTitle')),
              h('p', null, t('recordsClearBody')),
              clearError ? h('p', { className: 'tp-save-error', role: 'alert' }, t('recordsClearError')) : null,
              h('div', { className: 'tp-clear-actions' },
                h('button', { className: 'tp-btn', type: 'button', ref: clearCancelRef, onClick: () => {
                  setClearConfirm(false); setClearError(false); recordsCloseRef.current?.focus();
                } }, t('recordsCancel')),
                h('button', { className: 'tp-btn', type: 'button', onClick: clearRecords }, t('recordsClearConfirm'))),
            ) : recordsView === 'recent' ? h('div', null,
              recordsPassage ? h('div', { className: 'tp-records-context' }, h('span', null, t('recordsSameTitle')),
                h('button', { className: 'tp-record-link', type: 'button', ref: recordsShowAllRef, onClick: () => {
                  setRecordsPassage(null); recordsCloseRef.current?.focus();
                } }, t('recordsShowAll'))) : null,
              history.length ? h('ol', { className: 'tp-record-list' }, history.map(item => h('li', { className: 'tp-record-row', key: item.id },
                h('div', null,
                  h('p', { className: 'tp-record-title' }, t('language_' + item.language) + ' · ' + t(item.source === 'local' ? 'corpusLocal' : item.corpusVersion === 1 ? 'recordsOldCorpus' : 'corpusBuiltin')),
                  h('p', { className: 'tp-record-meta' },
                    (item.mode === 'timed' ? t('recordsTimed', { n: item.duration }) : t('corpusCount', { n: item.targetLength }))
                    + (item.length ? ' · ' + t('length_' + item.length) : '') + ' · ' + t('recordsHints', { mode: hintDescription(item.language, item.hints, item) }) + ' · ' + t(item.status === 'early' ? 'recordsEarly' : 'recordsCompleted')),
                  h('p', { className: 'tp-record-detail' }, t('recordsDetails', { seconds: (item.elapsedMs / 1000).toFixed(1), correct: item.correct, errors: item.wrongKeys })),
                  h('p', { className: 'tp-record-meta' }, formatRecordDate(item.at)),
                  passageKey(item) && !recordsPassage ? h('button', { type: 'button', className: 'tp-record-link', onClick: () => setRecordsPassage(passageKey(item)) }, t('recordsSame')) : null,
                ), renderRecordScore(item.speed, item.accuracy, item.language),
              ))) : h('p', { className: 'tp-records-empty' }, t('recordsEmpty')),
            ) : h('div', null,
              bestRows.length ? h('ul', { className: 'tp-record-list' }, bestRows.map(([key, item]) => {
                const [language, duration, source, hintId] = key.split(':');
                const [hints, scheme] = hintId.split('~');
                return h('li', { className: 'tp-record-row', key }, h('div', null,
                  h('p', { className: 'tp-record-title' }, t('language_' + language) + ' · ' + t('recordsTimed', { n: duration }) + ' · ' + t(source === 'local' ? 'corpusLocal' : 'corpusBuiltin')),
                  h('p', { className: 'tp-record-meta' }, t('recordsHints', { mode: hintDescription(language, hints === 'plain' ? 'off' : hints,
                    { pinyinFormat: scheme ? 'shuangpin' : 'full', pinyinScheme: scheme }) }) + (source === 'local' || key.endsWith(':corpus' + PracticeCorpus.CORPUS_VERSION) ? '' : ' · ' + t('recordsOldCorpus'))),
                  h('p', { className: 'tp-record-meta' }, formatRecordDate(item.at))), renderRecordScore(item.speed, item.accuracy, language));
              })) : h('p', { className: 'tp-records-empty' }, t('recordsBestEmpty')),
              legacyRows.length ? h('div', null, h('h3', { className: 'tp-records-legacy' }, t('recordsLegacy')),
                h('ul', { className: 'tp-record-list' }, legacyRows.map(([duration, item]) => h('li', { className: 'tp-record-row', key: duration },
                  h('div', null, h('p', { className: 'tp-record-title' }, t('language_en') + ' · ' + t('recordsTimed', { n: duration })),
                    h('p', { className: 'tp-record-meta' }, formatRecordDate(item.at))), renderRecordScore(item.wpm, item.accuracy, 'en'))))) : null,
            ),
          ),
          h('div', { className: 'tp-records-footer' },
            h('p', { id: 'tp-records-limit' }, t('recordsLimit')),
            !clearConfirm ? h('button', { className: 'tp-record-link', type: 'button', ref: clearButtonRef, disabled: !hasRecords,
              onClick: () => { setClearError(false); setClearConfirm(true); },
            }, t('recordsClear')) : null),
        );
      }

      const stats = sessionStats(session);
      const result = session.result;
      const shownSpeed = result ? result.speed : stats.speed;
      const isIme = session.language !== 'en';
      const speedUnit = t(isIme ? 'statsCpm' : 'statsWpm');
      const shownAccuracy = Math.round((result ? result.accuracy : stats.accuracy) * 100);
      const remaining = Math.max(0, Math.ceil((session.duration * 1000 - stats.ms) / 1000));
      const progress = Math.max(0, Math.min(1, session.mode === 'passage' ? characters(session.typed).length / session.target.length : stats.ms / (session.duration * 1000)));
      const bestForDuration = best[recordKey(session.language, session.duration, session.hints, PracticeCorpus.CORPUS_VERSION, session.source ? 'local' : 'builtin', session)] || null;
      const legacy = !isIme && !session.source && legacyBest[session.duration];
      const isPassage = session.mode === 'passage';
      const running = session.startAt != null && !result || composition.active;

      return h('div', { className: 'tp-root' + (isIme ? ' tp-ime' : '') + (session.hints !== 'off' ? ' tp-annotated' : ''),
        ref: rootRef,
        'data-cursor-shape': cursorPreference.shape, 'data-cursor-glow': String(cursorPreference.glow), 'data-cursor-blink': String(cursorPreference.blink) },
        h('div', { className: 'tp-toast-layer', role: 'status', 'aria-live': 'polite', 'aria-atomic': true },
          toast ? h('p', { className: 'tp-toast', key: toast.id }, t(toast.message)) : null),
        h('div', { className: 'tp-scroll' },
        h('div', { className: 'tp-page' },
          h('header', { className: 'tp-header' },
            h('div', { className: 'tp-brand' },
              h('div', { className: 'tp-logo', 'aria-hidden': true }, h(PanelIcon, { size: 28, active: true })),
              h('div', { className: 'tp-brandtext' },
                h('h1', { className: 'tp-title' }, t('panelTitle')),
                h('p', { className: 'tp-subtitle' }, t('panelSubtitle'),
                  h('span', { className: 'tp-privacy-note' }, t('corpusFooter')))),
            ),
            h('div', { className: 'tp-header-actions' },
              h('div', { className: 'tp-best', style: { visibility: isPassage ? 'hidden' : 'visible' } },
              isPassage ? t('corpusPassage') : bestForDuration
                ? t('bestValue', { speed: bestForDuration.speed, unit: speedUnit, acc: Math.round(bestForDuration.accuracy * 100) })
                : legacy && Number.isFinite(legacy.wpm) && Number.isFinite(legacy.accuracy)
                  ? t('legacyBestValue', { speed: legacy.wpm, acc: Math.round(legacy.accuracy * 100) }) : t('bestNone'),
              ),
              h('button', { className: 'tp-btn tp-quiet', type: 'button', ref: recordsButtonRef, onClick: openRecords,
                disabled: running, title: running ? t('recordsRunning') : undefined, 'aria-haspopup': 'dialog',
              }, t('records')),
              h('button', { className: 'tp-btn tp-quiet', type: 'button', ref: settingsButtonRef, disabled: running,
                title: running ? t('settingsRunning') : undefined, 'aria-haspopup': 'dialog', onClick: openSettings }, t('settings')),
            ),
          ),
          h('div', { className: 'tp-stats', role: 'group', 'aria-label': t('liveStats') },
            h(Stat, { label: speedUnit, value: shownSpeed, accent: true, description: isIme ? t('cpmTip') : undefined }),
            h(Stat, { label: t('statsAccuracy'), value: shownAccuracy, unit: t('unitPercent') }),
            h(Stat, { label: t('statsErrors'), value: result ? result.wrongKeys : session.wrongKeys }),
            h(Stat, { label: t(isPassage ? 'corpusElapsed' : 'statsRemaining'), value: isPassage ? Math.floor(stats.ms / 1000) : remaining, unit: t('unitSeconds') }),
          ),
          h('div', { className: 'tp-card' },
            h('div', {
              className: 'tp-timebar',
              role: 'progressbar',
              'aria-label': t('timebarLabel'),
              'aria-valuemin': 0,
              'aria-valuemax': 100,
              'aria-valuenow': Math.round(progress * 100),
            },
              h('div', { className: 'tp-timebar-fill', style: { width: (progress * 100).toFixed(1) + '%' } }),
            ),
            h('div', { className: 'tp-board-wrap' + (composition.active ? ' tp-composing' : ''), onClick: focusInput },
              h('div', { className: 'tp-viewport', ref: viewportRef, tabIndex: -1 },
                h(TextBoard, {
                  text: session.text,
                  typed: session.typed,
                  caretIndex: composition.active ? compositionRef.current.anchor : caretIndex,
                  finished: Boolean(result),
                  annotations: session.annotations,
                  hints: session.hints,
                }),
              ),
              h('textarea', {
                key: session.id,
                ref: inputRef,
                className: 'tp-input',
                'aria-label': t('inputLabel'),
                'aria-describedby': 'tp-start-hint',
                readOnly: !inputReady() || Boolean(result) && !composition.active,
                wrap: 'off',
                autoComplete: 'off',
                autoCorrect: 'off',
                autoCapitalize: 'off',
                spellCheck: false,
                onKeyDown: handleKeyDown,
                onPaste: blockEvent,
                onDrop: blockEvent,
                onInput: handleInput,
                onCompositionStart: handleCompositionStart,
                onCompositionUpdate: handleCompositionUpdate,
                onCompositionEnd: handleCompositionEnd,
                onSelect: (event) => { if (currentEvent()) updateCaret(event.currentTarget); },
                onFocus: (event) => {
                  setFocused(true);
                  void prepareSound();
                  revealCaret(viewportRef.current);
                  revealInputRegion(viewportRef.current);
                  position();
                },
                onBlur: () => { setFocused(false); stopSound(); },
              }),
              composition.active && composition.text ? h('div', {
                className: 'tp-composition', ref: previewRef, 'aria-hidden': true,
              }, composition.text) : null,
            ),
            result ? h('div', { className: 'tp-result', role: 'status', 'aria-live': 'polite' },
              h('div', { className: 'tp-result-title' },
                h('span', null, isPassage ? t('corpusCompleted', { seconds: (result.elapsedMs / 1000).toFixed(1) }) : result.eligible ? t('resultTitle') : t('resultEarly', { seconds: (result.elapsedMs / 1000).toFixed(1) })),
                isRecord ? h('span', { className: 'tp-record' }, t(isPassage ? 'newPassageRecord' : 'newRecordBadge')) : null,
              ),
              h('div', { className: 'tp-result-grid' },
                h(ResultItem, { label: speedUnit, value: result.speed }),
                h(ResultItem, { label: t('resultAccuracy'), value: Math.round(result.accuracy * 100) + '%' }),
                h(ResultItem, { label: t('resultCorrect'), value: result.correct }),
                h(ResultItem, { label: t('resultErrors'), value: result.wrongKeys }),
              ),
              comparison ? h('p', { className: 'tp-comparison' }, comparison.previous
                ? t(comparison.mode === 'passage' ? 'comparePassage' : 'compareTimed', {
                  speed: comparison.previous.speed, unit: speedUnit, acc: Math.round(comparison.previous.accuracy * 100),
                  delta: (result.speed > comparison.previous.speed ? '+' : '') + (result.speed - comparison.previous.speed),
                }) : t(comparison.mode === 'passage' ? 'compareFirstPassage' : 'compareFirst')) : null,
            ) : null,
            h('div', { className: 'tp-actions' },
              h('div', { className: 'tp-instructions' },
                ['focusHint', 'restartHint', 'restartHintIme', 'hintLoading'].map(key => h('span', {
                  key, className: 'tp-status-size', 'aria-hidden': true,
                }, t(key))),
                h('span', { className: 'tp-focus-hint', id: 'tp-start-hint',
                  style: { visibility: result || !inputReady() || session.startAt != null ? 'hidden' : 'visible' },
                }, t(focused ? (isIme ? 'restartHintIme' : 'restartHint') : 'focusHint')),
                !inputReady() ? h('div', { className: 'tp-annotation-status', role: 'status' },
                  h('span', null, t(session.annotationState === 'error' ? 'hintError' : 'hintLoading')),
                  session.annotationState === 'error' ? h('button', {
                    className: 'tp-btn', type: 'button',
                    onClick: () => {
                      updateSession(previous => ({ ...previous, annotationState: 'loading' }));
                      setAnnotationAttempt(attempt => attempt + 1);
                    },
                  }, t('hintRetry')) : null,
                ) : null,
              ),
              h('div', { className: 'tp-corpus-status' },
                h('span', { className: 'tp-status-size', 'aria-hidden': true }, t('corpusLoading')),
                h('span', { className: 'tp-corpus-name', title: session.source?.title || undefined,
                  style: { visibility: corpusBusy ? 'hidden' : 'visible' } },
                  (session.source ? t('corpusRecent') : t('corpusBuiltin')) + ' · ' + t('corpusCount', { n: session.target.length })),
                h('p', { className: 'tp-corpus-note', role: 'status', 'aria-atomic': true }, corpusBusy ? t('corpusLoading') : '')),
              h('div', { className: 'tp-run-actions' },
                h('span', { className: 'tp-action' },
                  h('button', { type: 'button', className: 'tp-btn tp-quiet tp-corpus-next', onClick: () => nextPassage(),
                    'aria-label': t(corpusBusy ? 'corpusCancel' : 'corpusNext'), 'aria-describedby': fullShortcuts ? 'tp-next-shortcut' : undefined,
                    'aria-keyshortcuts': fullShortcuts ? (isApple ? 'Meta+R' : 'Control+R') : undefined },
                    h('span', null, t(corpusBusy ? 'corpusCancel' : 'corpusNext')),
                    h('span', { className: 'tp-status-size', 'aria-hidden': true }, t('corpusNext')),
                    h('span', { className: 'tp-status-size', 'aria-hidden': true }, t('corpusCancel'))),
                  fullShortcuts ? h('span', { className: 'tp-shortcut-tip', id: 'tp-next-shortcut', role: 'tooltip' }, isApple ? '⌘ R' : 'Ctrl+R') : null),
                h('span', { className: 'tp-action' },
                  h('button', { type: 'button', className: 'tp-btn tp-quiet tp-restart', onClick: restartCurrent,
                    'aria-label': t('restartRun'), 'aria-describedby': 'tp-restart-shortcut', 'aria-keyshortcuts': 'Escape' }, t('restartRun')),
                  h('span', { className: 'tp-shortcut-tip', id: 'tp-restart-shortcut', role: 'tooltip' }, 'Esc'))),
            ),
          ),
          h('div', { className: 'tp-toolbar' },
            h('div', { className: 'tp-practice-options' },
            h('div', { className: 'tp-seg tp-practice-controls' },
              h('div', { className: 'tp-language tp-option-group', role: 'group', 'aria-label': t('languageLabel'),
                'aria-keyshortcuts': fullShortcuts ? (isApple ? 'Meta+T' : 'Control+T') : undefined, 'aria-describedby': fullShortcuts ? 'tp-language-shortcut' : undefined },
                LANGUAGES.map((language) => h('button', {
                  key: language,
                  type: 'button',
                  className: 'tp-seg-btn' + (language === session.language ? ' active' : ''),
                  'aria-pressed': language === session.language,
                  'aria-describedby': fullShortcuts ? 'tp-language-shortcut' : undefined,
                  onClick: () => restart(session.duration, false, language),
                }, t('language_' + language))),
                optionShortcutTip(OPTION_SHORTCUTS[0]),
              ),
              h('div', { className: 'tp-exercise', role: 'radiogroup', 'aria-label': t('exerciseLabel') },
                [DURATIONS.map(String), PracticeCorpus.TEXT_LENGTHS].map((presets, groupIndex) => h('div', {
                  key: OPTION_SHORTCUTS[groupIndex + 1].id, className: 'tp-preset-group tp-option-group', role: 'group',
                  'aria-label': t(OPTION_SHORTCUTS[groupIndex + 1].label),
                  'aria-keyshortcuts': fullShortcuts ? (isApple ? 'Meta+' : 'Control+') + OPTION_SHORTCUTS[groupIndex + 1].key : undefined,
                  'aria-describedby': fullShortcuts ? 'tp-' + OPTION_SHORTCUTS[groupIndex + 1].id + '-shortcut' : undefined,
                }, presets.map((preset, index) => h('button', {
                  key: preset, type: 'button', role: 'radio',
                  className: 'tp-seg-btn' + (preset === exercisePreference.preset ? ' active' : ''),
                  'aria-checked': preset === exercisePreference.preset, tabIndex: preset === exercisePreference.preset ? 0 : -1,
                  'aria-describedby': fullShortcuts ? 'tp-' + OPTION_SHORTCUTS[groupIndex + 1].id + '-shortcut' : undefined,
                  onKeyDown: event => exerciseKeyDown(event, groupIndex * DURATIONS.length + index), onClick: () => changeExercise(preset),
                }, PracticeCorpus.TEXT_LENGTHS.includes(preset) ? t('length_' + preset) : t('durationOption', { n: preset }))),
                optionShortcutTip(OPTION_SHORTCUTS[groupIndex + 1]))))),
            ),
            hasLocalCorpus ? h('div', { className: 'tp-corpus-controls' },
              h('div', { className: 'tp-seg', role: 'group', 'aria-label': t('corpusSource') },
                ['builtin', 'local'].map(source => h('button', {
                  key: source, type: 'button',
                  className: 'tp-seg-btn' + (source === corpusPreference ? ' active' : ''),
                  'aria-pressed': source === corpusPreference,
                  onClick: () => changeCorpusPreference(source),
                }, t(source === 'builtin' ? 'corpusBuiltin' : 'corpusLocal'))))) : null,
          ),
          exerciseSaveError || corpusPreferenceError || saveError ? h('div', { className: 'tp-foot' },
            exerciseSaveError ? h('span', { className: 'tp-corpus-note tp-preference-error', role: 'status' }, t('exerciseSaveError')) : null,
            corpusPreferenceError ? h('span', { className: 'tp-corpus-note tp-preference-error', role: 'status' }, t('corpusPreferenceError')) : null,
            saveError ? h('span', { className: 'tp-save-error', role: 'status' }, t('storageError')) : null,
          ) : null,
          renderRecords(),
          renderSettings(),
        )),
      );
    }

    return { TypingPage, PanelIcon, CSS, t };
}
