// Shared by the web mount and platform contract tests. No DSH globals or API.
export const webOptions = {
  get isApple() {
    return typeof window !== 'undefined'
      ? /Mac|iPhone|iPad|iPod/i.test(window.navigator?.userAgentData?.platform || window.navigator?.platform || '')
      : (typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgentData?.platform || navigator.platform || ''));
  },
  storagePrefix: 'typefeel.practice',
  fullShortcuts: false,
  brandIconUrl: '/brand/icons/icon.svg',
  copy: {
    zh: {
      panelTitle: '字感',
      panelSubtitle: '中粤英打字练习，实时统计速度与准确率',
      corpusFooter: '',
      settingsLocalTextNote: '练习内容不会上传。设置与成绩只保存在当前浏览器中，你可以安心练习。',
    },
    en: {
      panelTitle: 'Type Feel',
      panelSubtitle: 'Chinese, Cantonese and English typing practice, with live speed and accuracy.',
      corpusFooter: '',
      settingsLocalTextNote: 'Your practice text stays in your browser. Settings and scores are saved only on this device.',
    },
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
