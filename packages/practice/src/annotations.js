// The display/scoring unit is a grapheme; engines return code points. Join by
// original UTF-16 offsets, never by the length of the pronunciation array.
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const wordSegmenters = {
  zh: new Intl.Segmenter('zh-Hans', { granularity: 'word' }),
  yue: new Intl.Segmenter('zh-Hant', { granularity: 'word' }),
};
// ICU's written-Chinese segmentation misses some everyday Cantonese words.
// These boundaries affect hint visibility only, not contextual pronunciation.
const cantoneseWords = ['屋企', '早啲', '食嘢', '傾偈', '聽日', '朝早', '得閒', '唔使', '唔明', '緊要', '平平安安', '出面', '出門口', '我哋', '一齊', '落街', '收工', '茶餐廳', '奶茶', '窗邊', '街市', '生果', '新鮮', '附近', '嗰陣', '順便', '電話', '星期', '飲茶'].sort((a, b) => b.length - a.length);

export function alignReadings(text, rows, language) {
  if (rows.map(([char]) => char).join('') !== text) throw new Error('Pronunciation alignment failed');
  const byOffset = new Map();
  let offset = 0;
  for (const [char, reading] of rows) {
    byOffset.set(offset, reading || null);
    offset += char.length;
  }
  const tokens = Array.from(graphemes.segment(text), ({ segment, index }) => ({
    char: segment, offset: index,
    reading: /\p{Script=Han}/u.test(segment) ? byOffset.get(index) || null : null,
    wordStart: 0, wordEnd: 0,
  }));
  const segments = new Map(Array.from(wordSegmenters[language].segment(text), part => [part.index, part.segment]));
  for (let i = 0; i < tokens.length;) {
    const start = tokens[i].offset;
    const override = language === 'yue' && cantoneseWords.find(word => text.startsWith(word, start));
    const word = override || segments.get(start) || tokens[i].char;
    let end = i + 1;
    while (end < tokens.length && tokens[end].offset < start + word.length) end++;
    for (let k = i; k < end; k++) {
      tokens[k].wordStart = i;
      tokens[k].wordEnd = end;
    }
    i = end;
  }
  return tokens;
}
