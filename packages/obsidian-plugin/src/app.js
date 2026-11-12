import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createPractice } from '../../practice/src/create-practice.js';
import { createModeNavigation } from '../../practice/src/mode-navigation.js';
import { createGamePage } from '../../practice/src/game/create-game.js';
import { createObsidianLocale, practiceOptions, gameOptions, normalizeMode } from './platform.js';
import { createVaultCorpus } from './vault-corpus.js';
import { createFolderSettings } from './folder-settings.js';
import brandIconUrl from '../icon.svg';
export { selectionRequest } from './vault-corpus.js';

// Loaded on first open, so Obsidian startup only evaluates the small plugin
// shell. Pronunciation data and keyboard samples load on first use.
const loadPronunciation = name => name === 'pinyin'
  ? import('../../practice/src/pinyin.js') : import('../../practice/src/jyutping.js');
const loadAudio = () => import('typefeel:audio');

// service: { languageId, folders, listFiles, read } from the plugin instance.
// A re-enabled plugin passes a new service, so pages never keep a stale one.
function createPages(service) {
  const locale = createObsidianLocale(service.languageId);
  const { Context, Navigation } = createModeNavigation(React);
  const fetchCorpus = createVaultCorpus({ getFolders: service.folders.list, listFiles: service.listFiles, read: service.read });
  const Settings = createFolderSettings(React, service.folders);
  const isApple = service.isApple ?? false;
  const { TypingPage, startWithText } = createPractice(React,
    practiceOptions({ isApple, locale, brandIconUrl, Navigation, loadPronunciation, loadAudio, fetchCorpus, Settings }));
  const GamePage = createGamePage(React, gameOptions({ isApple, brandIconUrl }));
  const language = locale.getLocale().active;
  let storage;
  try { storage = window.localStorage; } catch { /* Shared storage functions handle unavailable storage. */ }
  function Page({ initialMode, onModeChange }) {
    const [mode, updateMode] = React.useState(() => normalizeMode(initialMode));
    function setMode(next) { updateMode(next); onModeChange(next); }
    return React.createElement(Context.Provider, { value: { mode, setMode, language } },
      mode === 'game' ? React.createElement(GamePage, { language, storage, Navigation, loadAudio }) : React.createElement(TypingPage));
  }
  return { service, Page, startWithText };
}

let current;
function pagesFor(service) {
  if (current?.service !== service) current = createPages(service);
  return current;
}

// Each tab gets its own React root; preferences and records are shared.
export function mount(element, { service, mode, onModeChange }) {
  const { Page } = pagesFor(service);
  const root = createRoot(element);
  root.render(React.createElement(Page, { initialMode: mode, onModeChange }));
  return () => root.unmount();
}

// Practise handed-over text in the next (or current) practice page.
export function handOver(service, request) {
  return pagesFor(service).startWithText(request);
}
