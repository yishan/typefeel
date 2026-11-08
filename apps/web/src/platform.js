// Shared by the web mount and platform contract tests. No DSH globals or API.
export const webOptions = {
  storagePrefix: 'typefeel.practice',
  fullShortcuts: false,
  copy: {
    zh: { panelTitle: '字感', settingsLocalTextNote: '练习内容不会上传。设置与成绩只保存在当前浏览器中，你可以安心练习。' },
    en: { panelTitle: 'Type Feel', settingsLocalTextNote: 'Your practice text stays in your browser. Settings and scores are saved only on this device.' },
  },
};

export function createWebPlatform(locale, Settings) {
  return {
    ...webOptions, locale, Settings,
    loadPronunciation: name => name === 'pinyin'
      ? import('../../../packages/practice/src/pinyin.js') : import('../../../packages/practice/src/jyutping.js'),
    loadAudio: () => import('typefeel:audio'),
  };
}
