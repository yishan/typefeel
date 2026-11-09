import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { createPractice } from '../../../packages/practice/src/create-practice.js';
import { createLocale, initialLanguage, initialTheme } from './preferences.js';
import { createWebPlatform } from './platform.js';
import { createModeNavigation } from '../../../packages/practice/src/mode-navigation.js';
import './web.css';

const h = React.createElement;
let storage;
try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem() { throw new Error('Storage unavailable'); } }; }
const locale = createLocale(initialLanguage(storage, navigator.languages || [navigator.language]));
const media = window.matchMedia('(prefers-color-scheme: dark)');
let theme = initialTheme(storage);

function applyTheme() {
  const resolved = theme === 'system' ? media.matches ? 'dark' : 'light' : theme;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]').content = resolved === 'dark' ? '#18191b' : '#fafafa';
}
function applyLanguage() {
  const language = locale.getLocale().active;
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = language === 'zh' ? '字感 · Type Feel' : 'Type Feel · 字感';
}
media.addEventListener('change', applyTheme);
locale.subscribe(applyLanguage);
applyTheme(); applyLanguage();

function WebSettings({ language }) {
  const [selectedTheme, setSelectedTheme] = React.useState(theme);
  const [saveError, setSaveError] = React.useState(false);
  const zh = language === 'zh';
  function save(key, value) {
    try { storage.setItem(key, value); setSaveError(false); } catch { setSaveError(true); }
  }
  const chevron = h('svg', { className: 'tp-select-chevron', viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true }, h('path', { d: 'M3 4.5 6 7.5 9 4.5' }));
  return h('section', { className: 'tp-settings-section', 'aria-labelledby': 'tf-interface-title' },
    h('h3', { id: 'tf-interface-title' }, zh ? '界面' : 'Interface'),
    h('div', { className: 'tp-sound-body tf-interface-controls' },
      h('label', { className: 'tp-sound-field' }, h('span', null, zh ? '语言' : 'Language'),
        h('span', { className: 'tp-select' }, h('select', { value: language, 'aria-label': zh ? '界面语言' : 'Interface language', onChange: event => {
          const next = event.currentTarget.value; save('typefeel.language', next); locale.setLanguage(next);
        } }, h('option', { value: 'zh' }, '简体中文'), h('option', { value: 'en' }, 'English')), chevron)),
      h('label', { className: 'tp-sound-field' }, h('span', null, zh ? '外观' : 'Appearance'),
        h('span', { className: 'tp-select' }, h('select', { value: selectedTheme, 'aria-label': zh ? '外观' : 'Appearance', onChange: event => {
          theme = event.currentTarget.value; setSelectedTheme(theme); save('typefeel.theme', theme); applyTheme();
        } }, ...[['system', zh ? '跟随系统' : 'System'], ['light', zh ? '浅色' : 'Light'], ['dark', zh ? '深色' : 'Dark']].map(([value, label]) => h('option', { key: value, value }, label))), chevron)),
      saveError ? h('p', { className: 'tp-save-error', role: 'status' }, zh ? '设置已应用，但未能保存到浏览器。' : 'Settings applied, but could not be saved in this browser.') : null));
}

const { Context: ModeContext, Navigation: ModeSwitch } = createModeNavigation(React);

const webPlatform = { ...createWebPlatform(locale, WebSettings), Navigation: ModeSwitch };
const { TypingPage, CSS } = createPractice(React, webPlatform);
const style = document.createElement('style');
style.dataset.typefeelStyle = '';
style.textContent = CSS;
document.head.appendChild(style);
const GamePage = React.lazy(async () => {
  const game = await import('../../../packages/practice/src/game/create-game.js');
  const gameStyle = document.createElement('style');
  gameStyle.dataset.typefeelGameStyle = '';
  gameStyle.textContent = game.CSS;
  document.head.appendChild(gameStyle);
  return { default: game.createGamePage(React) };
});

function App() {
  const [mode, updateMode] = React.useState(() => location.hash === '#game' ? 'game' : 'practice');
  function setMode(id) {
    history.replaceState(null, '', id === 'game' ? '#game' : location.pathname + location.search);
    updateMode(id);
  }
  const [language, setLanguage] = React.useState(locale.getLocale().active);
  React.useEffect(() => locale.subscribe(() => setLanguage(locale.getLocale().active)), []);
  return h(ModeContext.Provider, { value: { mode, setMode, language } },
    h(React.Suspense, { fallback: h('p', { className: 'tf-loading', role: 'status' }, language === 'zh' ? '正在加载…' : 'Loading…') },
      mode === 'game' ? h(GamePage, { language, storage, Navigation: ModeSwitch, Settings: WebSettings, loadAudio: webPlatform.loadAudio }) : h(TypingPage)));
}
createRoot(document.getElementById('app')).render(h(React.Fragment, null, h(App), h(Analytics)));
