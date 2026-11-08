import { createPractice } from '../../practice/src/create-practice.js';
import { dictionaries } from '../../practice/src/copy.js';
import { hostTheme } from './theme.js';

export function createPlugin(React, loadChunk) {
  return {
    inject: ['slots'],
    apply(ctx) {
      const slots = ctx.get('slots');
      if (!slots) return;
      const locale = ctx.get('locale');
      let translate;
      if (locale) {
        try {
          const dispose = locale.register('typing-practice', dictionaries);
          if (typeof dispose === 'function') ctx.effect(() => dispose);
        } catch { /* Fall back to bundled copy. */ }
        try { translate = locale.bind('typing-practice'); } catch { /* Optional host service. */ }
      }
      const { TypingPage, PanelIcon, CSS, t } = createPractice(React, {
        storagePrefix: 'dsh.typing-practice', locale, translate,
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
      ctx.effect(() => {
        const style = document.createElement('style');
        style.setAttribute('data-typing-practice-style', '');
        style.textContent = CSS + hostTheme;
        document.head.appendChild(style);
        return () => style.remove();
      });
      slots.inject('sidebar.panellist', () => slots.register({
        name: 'sidebar.panellist', id: 'typing-practice', order: 15,
        label: () => t('panelLabel'), locale: 'typing-practice',
      }, PanelIcon));
      slots.inject('main', () => slots.register({ name: 'main', key: 'typing-practice' }, TypingPage));
    },
  };
}
