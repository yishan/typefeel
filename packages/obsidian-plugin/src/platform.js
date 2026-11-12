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
    settingsLocalTextNote: '"我的笔记"只在本机读取所选文件夹中的笔记，用于本次练习，不会上传，也不会另存。设置与成绩只保存在这台设备上。',
    corpusLocal: '我的笔记', corpusRecent: '我的笔记', corpusLoading: '正在从笔记中选取段落…',
    corpusEmpty: '所选文件夹中没有找到合适的段落，已使用默认语料。',
    corpusUnavailable: '暂时无法读取笔记，已使用默认语料。',
    corpusUnconfigured: '请先在设置中选择用于练习的笔记文件夹，已使用默认语料。',
  },
  en: {
    panelTitle: 'Typefeel',
    panelSubtitle: 'Chinese, Cantonese and English typing practice, with live speed and accuracy.',
    corpusFooter: '',
    settingsLocalTextNote: 'My notes reads notes in the folders you choose, on this device, for this practice run only. Nothing is uploaded or copied. Settings and scores are saved only on this device.',
    corpusLocal: 'My notes', corpusRecent: 'My notes', corpusLoading: 'Choosing a passage from your notes…',
    corpusEmpty: 'No suitable passage found in the selected folders. Using built-in text.',
    corpusUnavailable: 'Your notes could not be read. Using built-in text.',
    corpusUnconfigured: 'Choose note folders in Settings first. Using built-in text.',
  },
};

export const commandNames = {
  zh: { ribbon: '打开字感', practice: '打开打字练习', game: '打开落字游戏', selection: '用选中内容练习打字',
    noSelection: '请先选中要练习的文字。', unsuitable: '选中的内容不适合练习：需要至少一句可以输入的中文、粤语或英文。' },
  en: { ribbon: 'Open Typefeel', practice: 'Open typing practice', game: 'Open falling words game', selection: 'Practice typing the selection',
    noSelection: 'Select the text you want to practice first.', unsuitable: 'This selection cannot be practiced. Select at least one typeable sentence in Chinese, Cantonese or English.' },
};

export function practiceOptions({ isApple, locale, brandIconUrl, Navigation, loadPronunciation, loadAudio, fetchCorpus, Settings }) {
  return {
    id: 'obsidian', storagePrefix: STORAGE_PREFIX, fullShortcuts: false, isApple,
    locale, copy, brandIconUrl, Navigation, loadPronunciation, loadAudio, fetchCorpus, Settings,
  };
}

export function gameOptions({ isApple, brandIconUrl }) {
  return {
    id: 'obsidian', layout: 'container', brandIconUrl, isApple,
    recordsKey: `${STORAGE_PREFIX}.game.records.v1`,
    audioKeys: { effects: `${STORAGE_PREFIX}.game.audio.v1`, keyboard: `${STORAGE_PREFIX}.sound.v1` },
  };
}

export function normalizeMode(mode) {
  return MODES.includes(mode) ? mode : 'practice';
}

// Cmd/Ctrl+P opens Obsidian's command palette. While a game is running or
// counting down in this view, the shared game listener pauses on that chord, so
// the view scope keeps it from also reaching the palette. Paused, ready and
// ended games, open dialogs and IME composition leave the palette available.
export function reservesGamePause(event, root, active) {
  const chord = (event.key?.toLowerCase() === 'p' || event.code === 'KeyP')
    && Boolean(event.metaKey) !== Boolean(event.ctrlKey) && !event.altKey && !event.shiftKey;
  if (!chord || !root || event.isComposing || event.keyCode === 229) return false;
  return ['running', 'countdown'].includes(root.dataset?.status)
    && Boolean(active) && root.contains(active) && !active.closest?.('dialog[open]');
}
