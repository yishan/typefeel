// Obsidian platform options for the shared practice and game pages. Pure data
// and functions only: no `obsidian` import, so tests can load this module.

export const VIEW_TYPE = 'typefeel';
// Class of the element each view mounts into; styles.css is scoped to it.
export const HOST_CLASS = 'typefeel-host';
export const STORAGE_PREFIX = 'typefeel.obsidian';
export const MODES = ['practice', 'game'];

// Obsidian supports many interface languages; Type Feel has Chinese and English.
export function interfaceLanguage(id) {
  return String(id || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

// Obsidian applies an interface language change only after a restart, so the
// locale is fixed for the lifetime of the plugin.
export function createObsidianLocale(id) {
  const active = interfaceLanguage(id);
  return { getLocale: () => ({ active }), subscribe: () => () => {} };
}

export const copy = {
  zh: {
    panelTitle: '字感',
    panelSubtitle: '中粤英打字练习，实时统计速度与准确率',
    corpusFooter: '',
    settingsLocalTextNote: '练习内容不会上传。设置与成绩只保存在这台设备上，你可以安心练习。',
  },
  en: {
    panelTitle: 'Type Feel',
    panelSubtitle: 'Chinese, Cantonese and English typing practice, with live speed and accuracy.',
    corpusFooter: '',
    settingsLocalTextNote: 'Your practice text is never uploaded. Settings and scores are saved only on this device.',
  },
};

export const commandNames = {
  zh: { ribbon: '打开字感', practice: '打开打字练习', game: '打开落字游戏' },
  en: { ribbon: 'Open Type Feel', practice: 'Open typing practice', game: 'Open falling words game' },
};

export function practiceOptions({ locale, brandIconUrl, Navigation, loadPronunciation, loadAudio }) {
  return {
    id: 'obsidian', storagePrefix: STORAGE_PREFIX, fullShortcuts: false,
    locale, copy, brandIconUrl, Navigation, loadPronunciation, loadAudio,
  };
}

export function gameOptions({ brandIconUrl }) {
  return {
    id: 'obsidian', layout: 'container', brandIconUrl,
    recordsKey: `${STORAGE_PREFIX}.game.records.v1`,
    audioKeys: { effects: `${STORAGE_PREFIX}.game.audio.v1`, keyboard: `${STORAGE_PREFIX}.sound.v1` },
  };
}

export function normalizeMode(mode) {
  return MODES.includes(mode) ? mode : 'practice';
}
