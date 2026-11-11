import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createPractice } from '../../practice/src/create-practice.js';
import { createModeNavigation } from '../../practice/src/mode-navigation.js';
import { createGamePage } from '../../practice/src/game/create-game.js';
import { createObsidianLocale, practiceOptions, gameOptions, normalizeMode } from './platform.js';
import brandIconUrl from '../icon.svg';

// Loaded on first open, so Obsidian startup only evaluates the small plugin
// shell. Pronunciation data and keyboard samples load on first use.
const loadPronunciation = name => name === 'pinyin'
  ? import('../../practice/src/pinyin.js') : import('../../practice/src/jyutping.js');
const loadAudio = () => import('typefeel:audio');

let pages;
function createPages(languageId) {
  const locale = createObsidianLocale(languageId);
  const { Context, Navigation } = createModeNavigation(React);
  const { TypingPage } = createPractice(React, practiceOptions({ locale, brandIconUrl, Navigation, loadPronunciation, loadAudio }));
  const GamePage = createGamePage(React, gameOptions({ brandIconUrl }));
  const language = locale.getLocale().active;
  let storage;
  try { storage = window.localStorage; } catch { /* Shared storage functions handle unavailable storage. */ }
  function TypefeelPage({ initialMode, onModeChange }) {
    const [mode, updateMode] = React.useState(() => normalizeMode(initialMode));
    function setMode(next) { updateMode(next); onModeChange(next); }
    return React.createElement(Context.Provider, { value: { mode, setMode, language } },
      mode === 'game' ? React.createElement(GamePage, { language, storage, Navigation, loadAudio }) : React.createElement(TypingPage));
  }
  return TypefeelPage;
}

// Each tab gets its own React root; preferences and records are shared.
export function mount(element, { languageId, mode, onModeChange }) {
  pages ??= createPages(languageId);
  const root = createRoot(element);
  root.render(React.createElement(pages, { initialMode: mode, onModeChange }));
  return () => root.unmount();
}
