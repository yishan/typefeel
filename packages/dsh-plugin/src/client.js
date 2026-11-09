import { createPractice } from '../../practice/src/create-practice.js';
import { dictionaries } from '../../practice/src/copy.js';
import { createModeNavigation } from '../../practice/src/mode-navigation.js';
import { createGamePage, CSS as gameCSS } from '../../practice/src/game/create-game.js';
import { hostTheme } from './theme.js';
import brandIconUrl from '../icon.svg';

export function createPlugin(React, loadChunk) {
  function SettingsFooter({ language }) {
    const zh = language === 'zh';
    return React.createElement('p', { className: 'tp-settings-note tp-settings-website' },
      zh ? '也可以在浏览器中使用 Typefeel 字感 ' : 'You can also use Typefeel 字感 in your browser: ',
      React.createElement('a', { href: 'https://typefeel.app', target: '_blank', rel: 'noopener noreferrer' },
        'Typefeel.app'));
  }

  return {
    inject: ['slots', 'locale'],
    apply(ctx) {
      const slots = ctx.get('slots');
      if (!slots) return;
      const locale = ctx.get('locale');
      const { Context: ModeContext, Navigation } = createModeNavigation(React);
      let translate;
      if (locale) {
        try {
          const dispose = locale.register('typing-practice', dictionaries);
          if (typeof dispose === 'function') ctx.effect(() => dispose);
        } catch { /* Fall back to bundled copy. */ }
        try { translate = locale.bind('typing-practice'); } catch { /* Optional host service. */ }
      }
      const { TypingPage, PanelIcon, CSS, t } = createPractice(React, {
        id: 'dsh', Navigation,
        storagePrefix: 'dsh.typing-practice', locale, translate,
        brandIconUrl,
        SettingsFooter,
        fullShortcuts: true, shortcuts: () => ctx.get('shortcuts'),
        loadPronunciation: name => loadChunk(`./client.${name}.js`),
        loadAudio: () => loadChunk('./client.audio.js'),
        async fetchCorpus(params, signal) {
          const transport = window.__DSH_TRANSPORT__;
          const send = transport?.fetch ? transport.fetch.bind(transport) : fetch;
          const response = await send('/api/typing-practice/recent?' + params, { signal, cache: 'no-store' });
          if (!response.ok) throw new Error('unavailable');
          return response.json();
        },
      });
      const GamePage = createGamePage(React, {
        id: 'dsh', layout: 'container', brandIconUrl,
        recordsKey: 'dsh.typing-practice.game.records.v1',
        audioKeys: { effects: 'dsh.typing-practice.game.audio.v1', keyboard: 'dsh.typing-practice.sound.v1' },
        shortcuts: () => ctx.get('shortcuts'),
      });
      let storage;
      try { storage = window.localStorage; } catch { /* Shared storage functions handle unavailable storage. */ }
      function activeLanguage() {
        try {
          const snapshot = locale?.getLocale?.();
          return String(snapshot?.active || snapshot?.id || snapshot?.locale || snapshot?.current || '').toLowerCase().startsWith('en') ? 'en' : 'zh';
        } catch { return 'zh'; }
      }
      function TypefeelPage() {
        const [mode, setMode] = React.useState('practice');
        const [language, setLanguage] = React.useState(activeLanguage);
        React.useEffect(() => {
          try {
            const dispose = locale?.subscribe?.(() => setLanguage(activeLanguage()));
            return typeof dispose === 'function' ? dispose : undefined;
          } catch { /* Keep the bundled language if an optional locale service fails. */ }
        }, []);
        return React.createElement(ModeContext.Provider, { value: { mode, setMode, language } },
          mode === 'game' ? React.createElement(GamePage, { language, storage, Navigation,
            loadAudio: () => loadChunk('./client.audio.js') }) : React.createElement(TypingPage));
      }
      ctx.effect(() => {
        const style = document.createElement('style');
        style.setAttribute('data-typing-practice-style', '');
        style.textContent = CSS + gameCSS + hostTheme;
        document.head.appendChild(style);
        return () => style.remove();
      });
      slots.inject('sidebar.panellist', () => slots.register({
        name: 'sidebar.panellist', id: 'typing-practice', order: 15,
        label: () => t('panelLabel'), locale: 'typing-practice',
      }, PanelIcon));
      slots.inject('main', () => slots.register({ name: 'main', key: 'typing-practice' }, TypefeelPage));
    },
  };
}
