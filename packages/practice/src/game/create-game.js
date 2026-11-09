import { createGameEngine, SHOT_MS } from './engine.js';
import { createCommittedBuffer } from '../native-input.js';
import { loadGameRecords, saveGameResult } from './records.js';
import { handleGamePauseShortcut } from './shortcuts.js';
import { createGameAudio, loadGameAudioPreferences, saveGameAudioPreferences, KEYBOARD_PACKS } from './audio.js';
import { dictionaries } from '../copy.js';
export { CSS } from './styles.js';

const copy = {
  zh: { title: '字感', subtitle: '落字游戏', score: '得分', lives: '生命', level: '等级', combo: '连击', pause: '暂停', resume: '继续',
    settings: '设置', close: '关闭', start: '开始', ready: '落字', rule: '输入完整文字，发射光标。漏掉 5 个，本局结束。',
    paused: '已暂停', ended: '本局结束', restart: '再来一局', input: '输入落下的文字', placeholder: '输入文字',
    hint: '整字或整词上屏后自动发射', error: '没有匹配的目标，请输入完整词组', best: '最高', time: '存活', kills: '消除', bestCombo: '最高连击',
    gameplay: '玩法', gameplayHint: '输入完整词组以发射光标消灭目标。',
    matchingHint: '每次上屏只匹配一个完整目标，多字、少字均不匹配。上屏后输入框自动清空。',
    pauseHint: '按 Esc 或 Ctrl/Cmd+P 暂停，点击「继续」恢复。',
    levelHint: '每存活 30 秒提升一级，文字出现更频繁、下落更快，同屏目标上限逐步增加。',
    effects: '游戏音效', keyboard: '键盘音效', volume: '音量', keyboardPack: '声音', preview: '试听',
    audioLoading: '正在加载键盘音效…', audioError: '音效暂时无法播放，可以继续游戏。', audioSaveError: '音效设置已应用，但未能保存到浏览器。',
    saveError: '本局成绩未能保存到浏览器。', switchHint: '暂停后可切换模式', seconds: '秒' },
  en: { title: 'Type Feel', subtitle: 'Falling words', score: 'Score', lives: 'Lives', level: 'Level', combo: 'Combo', pause: 'Pause', resume: 'Continue',
    settings: 'Settings', close: 'Close', start: 'Start', ready: 'Falling words', rule: 'Type a complete target to fire a cursor. Five missed targets end the round.',
    paused: 'Paused', ended: 'Round over', restart: 'Play again', input: 'Type a falling word', placeholder: 'Type a word',
    hint: 'Confirm a whole character or word to fire', error: 'No matching target. Confirm a complete word.', best: 'Best', time: 'Survived', kills: 'Cleared', bestCombo: 'Best combo',
    gameplay: 'How to play', gameplayHint: 'Confirm a complete word to fire a cursor and clear the target.',
    matchingHint: 'Each commit must match one whole target. Extra or missing characters do not match. The input clears after every commit.',
    pauseHint: 'Press Esc or Ctrl/Cmd+P to pause. Choose Continue to resume.',
    levelHint: 'Every 30 seconds, the level increases. Targets appear more often and fall faster; the target limit gradually increases.',
    effects: 'Game sounds', keyboard: 'Keyboard sounds', volume: 'Volume', keyboardPack: 'Sound', preview: 'Preview',
    audioLoading: 'Loading keyboard sounds…', audioError: 'Audio is unavailable. You can keep playing.', audioSaveError: 'Sound settings applied, but could not be saved in your browser.',
    saveError: 'This score could not be saved in your browser.', switchHint: 'Pause to switch modes', seconds: 's' },
};

export function createGamePage(React) {
  const h = React.createElement;
  return function GamePage({ language = 'zh', storage, Navigation, Settings, loadAudio }) {
    const t = copy[language] || copy.zh;
    const soundCopy = dictionaries[language] || dictionaries.zh;
    const engineRef = React.useRef(null);
    if (!engineRef.current) engineRef.current = createGameEngine();
    const engine = engineRef.current;
    const [round, setRound] = React.useState(0);
    const [view, setView] = React.useState(() => ({ ...engine.state }));
    const [composing, setComposing] = React.useState(false);
    const [records, setRecords] = React.useState(() => ({ ...loadGameRecords(storage), saved: true }));
    const [settingsOpen, setSettingsOpen] = React.useState(false);
    const [compact, setCompact] = React.useState(false);
    const [missFlash, setMissFlash] = React.useState(false);
    const [audioPreferences, setAudioPreferences] = React.useState(() => loadGameAudioPreferences(storage));
    const audioPreferencesRef = React.useRef(audioPreferences);
    const [audioStatus, setAudioStatus] = React.useState({ effects: 'idle', keyboard: 'idle' });
    const [audioSaveError, setAudioSaveError] = React.useState(false);
    const audioRef = React.useRef(null);
    if (!audioRef.current) audioRef.current = createGameAudio({
      AudioContext: window.AudioContext || window.webkitAudioContext, loadAudio, preferences: audioPreferences,
      onStatus: (group, status) => setAudioStatus(previous => ({ ...previous, [group]: status })),
    });
    const rootRef = React.useRef(null);
    const stageRef = React.useRef(null);
    const inputRef = React.useRef(null);
    const dialogRef = React.useRef(null);
    const restartRef = React.useRef(null);
    const targetNodes = React.useRef(new Map());
    const shotNodes = React.useRef(new Map());
    const savedEngine = React.useRef(null);
    const bufferRef = React.useRef(null);
    const keyboardRef = React.useRef(null);
    const syncRef = React.useRef(null);
    const layoutRef = React.useRef({ width: 0, height: 0 });

    function refresh() {
      const current = engineRef.current;
      audioRef.current.observe(current, !document.hidden && document.hasFocus());
      setView({ ...current.state, targets: current.state.targets.map(target => ({ ...target })), shots: [...current.state.shots] });
      if (current.state.status === 'ended' && savedEngine.current !== current) {
        savedEngine.current = current;
        setRecords(saveGameResult(storage, current.state));
      }
    }
    syncRef.current = refresh;

    function makeBuffer() {
      return createCommittedBuffer(value => {
        const current = engineRef.current;
        if (current.state.status === 'running') current.submit(value, performance.now());
        refresh();
        return '';
      });
    }
    if (!bufferRef.current) bufferRef.current = makeBuffer();

    function focusInput() { inputRef.current?.focus({ preventScroll: true }); }
    function start() { void audioRef.current.prepare(); engineRef.current.start(performance.now()); refresh(); focusInput(); }
    function restart() {
      audioRef.current.stop(); void audioRef.current.prepare();
      engineRef.current = createGameEngine({ lanes: engineRef.current.lanes });
      bufferRef.current = makeBuffer();
      setComposing(false); setRound(value => value + 1);
      engineRef.current.start(performance.now()); refresh();
    }
    function pause() {
      const current = engineRef.current;
      if (current.state.status !== 'ended') audioRef.current.stop();
      current.pause(performance.now()); refresh();
    }
    function resume() {
      const current = engineRef.current;
      void audioRef.current.prepare();
      current.resume(performance.now());
      if (inputRef.current) inputRef.current.readOnly = false;
      refresh(); focusInput();
    }
    const currentEvent = event => event.currentTarget === inputRef.current && engine === engineRef.current;
    const guardPointer = event => event.preventDefault();
    function changeAudio(group, patch) {
      const previous = audioPreferencesRef.current;
      const next = { ...previous, [group]: { ...previous[group], ...patch } };
      audioPreferencesRef.current = next; setAudioPreferences(next);
      audioRef.current.configure(next);
      setAudioSaveError(!saveGameAudioPreferences(storage, next, group));
      void audioRef.current.prepare();
    }
    function closeSettings() { audioRef.current.stop(); setSettingsOpen(false); }

    function draw() {
      const current = engineRef.current;
      const stage = stageRef.current;
      if (!stage) return;
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const travel = Math.max(0, height - 42);
      for (const target of current.state.targets) {
        const node = targetNodes.current.get(target.id);
        if (!node) continue;
        const progress = target.status === 'hit' ? target.hitProgress : current.progress(target);
        const x = (target.lane + .5) * width / current.lanes;
        node.style.transform = `translate3d(${x}px, ${2 + travel * progress}px, 0) translateX(-50%)`;
        node.dataset.danger = String(progress > .8 && target.status !== 'hit');
      }
      for (const shot of current.state.shots) {
        const node = shotNodes.current.get(shot.id);
        if (!node) continue;
        const p = Math.min(1, Math.max(0, (current.state.time - shot.firedAt) / SHOT_MS));
        const endX = (shot.lane + .5) * width / current.lanes;
        const endY = 18 + travel * shot.progress;
        const dx = endX - width / 2;
        const dy = endY - (height - 12);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        node.style.transform = `translate3d(${width / 2 + dx * p}px, ${height - 12 + dy * p}px, 0) rotate(${angle}deg)`;
      }
    }

    React.useLayoutEffect(draw, [view]);
    React.useEffect(() => () => audioRef.current.dispose(), []);
    React.useEffect(() => {
      if (round) focusInput();
    }, [round]);
    React.useEffect(() => {
      if (!view.misses) { setMissFlash(false); return; }
      setMissFlash(true);
      const timer = setTimeout(() => setMissFlash(false), 350);
      return () => clearTimeout(timer);
    }, [view.misses, round]);
    React.useEffect(() => {
      let frame;
      let lastVersion = -1;
      let lastSecond = -1;
      function animate(now) {
        const current = engineRef.current;
        current.tick(now);
        const second = Math.floor(current.state.time / 1000);
        if (lastVersion !== current.version || lastSecond !== second) {
          lastVersion = current.version; lastSecond = second; syncRef.current();
        }
        draw();
        frame = requestAnimationFrame(animate);
      }
      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    }, []);

    React.useEffect(() => {
      function layout() {
        const viewport = window.visualViewport;
        const height = viewport?.height || window.innerHeight;
        if (rootRef.current) rootRef.current.style.height = `${height}px`;
        setCompact(height < 600);
        const width = stageRef.current?.clientWidth || window.innerWidth;
        const previous = layoutRef.current;
        const lanes = Math.max(2, Math.min(5, Math.floor(width / 140)));
        const current = engineRef.current;
        const widthChanged = Math.abs(previous.width - width) > 2;
        const keyboardResize = document.activeElement === inputRef.current && window.matchMedia('(pointer: coarse)').matches;
        if (previous.width && (widthChanged || Math.abs(previous.height - height) > 80 && !keyboardResize)) {
          audioRef.current.stop();
          current.pause(performance.now());
        }
        if (lanes !== current.lanes) current.setLanes(lanes);
        layoutRef.current = { width, height };
        syncRef.current();
      }
      function hidden() { if (document.hidden) { audioRef.current.stop(); engineRef.current.pause(performance.now()); syncRef.current(); } }
      function blur() { audioRef.current.stop(); engineRef.current.pause(performance.now()); syncRef.current(); }
      layout();
      window.addEventListener('resize', layout);
      window.visualViewport?.addEventListener('resize', layout);
      document.addEventListener('visibilitychange', hidden);
      window.addEventListener('blur', blur);
      return () => {
        window.removeEventListener('resize', layout);
        window.visualViewport?.removeEventListener('resize', layout);
        document.removeEventListener('visibilitychange', hidden);
        window.removeEventListener('blur', blur);
      };
    }, []);

    keyboardRef.current = event => handleGamePauseShortcut(event, {
      status: engineRef.current.state.status, composing: bufferRef.current.composing,
      inside: Boolean(rootRef.current?.contains(document.activeElement)), dialogOpen: settingsOpen, pause,
    });
    React.useEffect(() => {
      const keydown = event => keyboardRef.current(event);
      window.addEventListener('keydown', keydown, true);
      return () => window.removeEventListener('keydown', keydown, true);
    }, []);
    React.useEffect(() => {
      if (view.status === 'ended' && !composing) restartRef.current?.focus({ preventScroll: true });
    }, [view.status, composing]);
    React.useEffect(() => {
      if (settingsOpen && !dialogRef.current?.open) dialogRef.current?.showModal();
      if (!settingsOpen && dialogRef.current?.open) dialogRef.current?.close();
    }, [settingsOpen]);

    function stat(label, value) {
      return h('div', { className: 'tf-game-stat' }, h('span', { className: 'tf-game-stat-label' }, label), h('span', { className: 'tf-game-stat-value' }, value));
    }
    function primary(label, onClick, ref) { return h('button', { className: 'tp-btn tf-game-primary', type: 'button', onClick, ref }, label); }
    function audioControls(group) {
      const preference = audioPreferences[group];
      const title = t[group === 'effects' ? 'effects' : 'keyboard'];
      const keyboard = group === 'keyboard';
      return h('section', { className: 'tp-settings-section tf-game-audio-section', 'aria-labelledby': `tf-game-${group}-title` },
        h('div', { className: 'tf-game-audio-heading' }, h('h3', { id: `tf-game-${group}-title` }, title),
          h('button', { type: 'button', className: 'tp-btn tp-quiet', 'aria-label': `${t.preview}${language === 'zh' ? '' : ' '}${title}`,
            disabled: !preference.enabled || !preference.volume || keyboard && audioStatus.keyboard === 'loading',
            onClick: () => { if (keyboard) void audioRef.current.previewKeyboard(); else void audioRef.current.previewEffects(); } }, t.preview),
          h('label', { className: 'tp-cursor-toggle' }, h('input', { type: 'checkbox', role: 'switch', 'aria-label': title,
            checked: preference.enabled, onChange: event => changeAudio(group, { enabled: event.currentTarget.checked }) }))),
        keyboard ? h('label', { className: 'tp-sound-field' }, h('span', null, t.keyboardPack),
          h('span', { className: 'tp-select' }, h('select', { 'aria-label': language === 'zh' ? '键盘声音' : 'Keyboard sound',
            value: preference.pack, disabled: !preference.enabled, onChange: event => changeAudio(group, { pack: event.currentTarget.value }) },
            ...KEYBOARD_PACKS.map(pack => h('option', { key: pack, value: pack }, soundCopy['sound_' + pack]))),
          h('svg', { className: 'tp-select-chevron', viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true }, h('path', { d: 'M3 4.5 6 7.5 9 4.5' })))) : null,
        h('label', { className: 'tp-sound-field' }, h('span', null, t.volume), h('span', { className: 'tp-sound-volume' },
          h('input', { type: 'range', min: 0, max: 100, step: 5, value: preference.volume, disabled: !preference.enabled,
            'aria-label': `${title}${language === 'zh' ? '' : ' '}${t.volume}`, 'aria-valuetext': `${preference.volume}%`,
            onChange: event => changeAudio(group, { volume: Number(event.currentTarget.value) }) }), h('output', { 'aria-hidden': true }, `${preference.volume}%`))),
        keyboard ? h('a', { className: 'tp-sound-credit', href: 'https://github.com/tplai/kbsim', target: '_blank', rel: 'noreferrer' }, soundCopy.soundCredit) : null);
    }
    const live = ['running', 'countdown'].includes(view.status);
    const overlay = view.status === 'ready'
      ? [h('h2', { key: 'title' }, t.ready), h('p', { key: 'rule' }, t.rule), primary(t.start, start)]
      : view.status === 'countdown'
        ? [h('span', { className: 'tf-game-countdown', key: 'count', role: 'status' }, view.countdown)]
        : view.status === 'paused'
          ? [h('h2', { key: 'title' }, t.paused), primary(t.resume, resume)]
          : view.status === 'ended'
            ? [h('h2', { key: 'title' }, t.ended), h('div', { className: 'tf-game-result-score', key: 'score' }, view.score),
              h('div', { className: 'tf-game-result-stats', key: 'stats' }, stat(t.time, `${(view.time / 1000).toFixed(1)}${language === 'zh' ? ' 秒' : 's'}`), stat(t.kills, view.kills), stat(t.bestCombo, view.bestCombo)),
              primary(t.restart, restart, restartRef), !records.saved ? h('p', { key: 'save', role: 'status' }, t.saveError) : null]
            : null;

    return h('div', { className: 'tp-root tf-game-root', ref: rootRef, 'data-status': view.status, 'data-compact': String(compact) },
      h('div', { className: 'tp-scroll' }, h('div', { className: 'tp-page tf-game-page' },
        h('header', { className: 'tp-header' },
          h('div', { className: 'tp-brand' },
            h('span', { className: 'tp-logo', 'aria-hidden': true }, h('img', { src: '/brand/icons/icon.svg', alt: '' })),
            h('div', { className: 'tp-brandtext' }, h('h1', { className: 'tp-title' }, t.title), h('p', { className: 'tp-subtitle' }, t.subtitle))),
          Navigation ? h(Navigation, { disabled: live || composing, title: t.switchHint }) : null,
          h('div', { className: 'tp-header-actions' },
            h('button', { className: 'tp-btn tp-quiet', type: 'button', disabled: !live || composing,
              'aria-keyshortcuts': 'Escape Control+P Meta+P', onPointerDown: guardPointer, onClick: pause }, t.pause),
            Settings ? h('button', { className: 'tp-btn tp-quiet', type: 'button', disabled: composing, onPointerDown: guardPointer,
              onClick: () => { pause(); setSettingsOpen(true); void audioRef.current.prepare(); } }, t.settings) : null)),
        h('div', { className: 'tf-game-stats', role: 'group', 'aria-label': language === 'zh' ? '游戏统计' : 'Game statistics' },
          h('div', { className: 'tf-game-progress' }, stat(t.level, view.level), stat(t.combo, view.combo)),
          h('div', { className: 'tf-game-stat tf-game-health', 'aria-live': 'polite' }, h('span', { className: 'tf-game-stat-label' }, t.lives),
            h('div', { className: 'tf-game-lives', role: 'img', 'data-low': String(view.lives <= 2), 'aria-label': `${t.lives} ${view.lives} / 5` },
              ...Array.from({ length: 5 }, (_, i) => h('i', { key: i, className: 'tf-game-life', 'data-lost': String(i >= view.lives), 'aria-hidden': true })))),
          h('div', { className: 'tf-game-score' }, stat(t.score, view.score))),
        h('div', { className: 'tf-game-stage', ref: stageRef, 'data-miss': String(missFlash),
          onPointerDown: event => { if (live) { event.preventDefault(); focusInput(); } } },
          ...view.targets.map(target => {
            return h('div', { key: target.id, className: 'tf-game-target', 'data-hit': String(target.status === 'hit'),
              ref: node => node ? targetNodes.current.set(target.id, node) : targetNodes.current.delete(target.id) },
              target.text);
          }),
          ...view.shots.map(shot => h('span', { key: `shot-${shot.id}`, className: 'tf-game-shot', 'aria-hidden': true,
            ref: node => node ? shotNodes.current.set(shot.id, node) : shotNodes.current.delete(shot.id) })),
          overlay ? h('div', { className: 'tf-game-overlay' }, ...overlay) : null),
        h('div', { className: 'tf-game-dock' },
          h('div', { className: 'tf-game-emitter', 'aria-hidden': true }),
          h('textarea', { key: round, className: 'tf-game-input', ref: inputRef, rows: 1, wrap: 'off',
            'aria-label': t.input, 'aria-describedby': 'tf-game-input-hint tf-game-input-error', 'aria-invalid': view.error && !composing,
            placeholder: t.placeholder, autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'off', spellCheck: false, maxLength: 32,
            readOnly: ['paused', 'ended'].includes(view.status) && !composing,
            onCompositionStart: event => { if (!currentEvent(event)) return; bufferRef.current.begin(); setComposing(true); },
            onCompositionEnd: event => { if (!currentEvent(event)) return; bufferRef.current.end(event.currentTarget); setComposing(false); },
            onInput: event => {
              if (!currentEvent(event)) return;
              bufferRef.current.input(event.currentTarget, event.nativeEvent);
              if (bufferRef.current.composing) setComposing(true);
            },
            onKeyDown: event => {
              if (!document.hidden && document.activeElement === event.currentTarget && ['running', 'countdown'].includes(engineRef.current.state.status)) {
                audioRef.current.key(event, event.nativeEvent, bufferRef.current.composing);
              }
              if (!bufferRef.current.composing && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229 && event.key === 'Enter') event.preventDefault();
            },
            onFocus: () => { void audioRef.current.prepare(); },
            onPaste: event => event.preventDefault(), onDrop: event => event.preventDefault(), onBlur: pause,
          }),
          h('p', { className: 'tf-game-hint', id: 'tf-game-input-error', 'data-error': String(view.error && !composing), role: 'status' }, view.error && !composing ? t.error : '')),
        h('footer', { className: 'tf-game-footer' }, h('span', { id: 'tf-game-input-hint' }, t.hint), h('span', { className: 'tf-game-summary' }, `${t.best} ${records.best} · ${Math.floor(view.time / 1000)}${language === 'zh' ? ' 秒' : 's'}`)),
      )),
      Settings ? h('dialog', { className: 'tf-game-settings', ref: dialogRef, 'aria-label': t.settings, onCancel: closeSettings, onClose: closeSettings },
        h('div', { className: 'tf-game-settings-header' }, h('h2', null, t.settings),
          h('button', { className: 'tp-btn tp-quiet', type: 'button', 'aria-label': t.close, onClick: closeSettings },
            h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true }, h('path', { d: 'M5 5 19 19M19 5 5 19' })))),
        audioControls('effects'), audioControls('keyboard'),
        h('p', { className: 'tf-game-audio-status', role: 'status' }, audioSaveError ? t.audioSaveError
          : audioPreferences.keyboard.enabled && audioStatus.keyboard === 'error' || audioPreferences.effects.enabled && audioStatus.effects === 'error' ? t.audioError
            : audioPreferences.keyboard.enabled && audioStatus.keyboard === 'loading' ? t.audioLoading : ''),
        h(Settings, { language }),
        h('section', { className: 'tp-settings-section tf-game-rules', 'aria-labelledby': 'tf-game-rules-title' },
          h('h3', { id: 'tf-game-rules-title' }, t.gameplay),
          h('p', null, t.gameplayHint), h('p', null, t.matchingHint), h('p', null, t.pauseHint), h('p', null, t.levelHint))) : null);
  };
}
