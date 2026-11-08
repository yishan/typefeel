// Local pronunciation hints, not an input method. These are keyboard-layout
// facts, expressed independently of any IME implementation. Reference rules:
// https://flypy.cc/
// https://github.com/rime/rime-double-pinyin (Xiaohe and Ziranma schemata)
// https://github.com/fcitx/libime/blob/master/src/libime/pinyin/shuangpindata.h
// https://pinyin.sogou.com/help.php?list=3&q=4 (zero initials)
// https://github.com/Yidadaa/shuangpin/blob/main/src/utils/spconfig.json (Sogou)
export const SHUANGPIN_VERSION = 1;
export const SHUANGPIN_SCHEMES = ['xiaohe', 'ziranma', 'microsoft', 'sogou'];

const initials = { zh: 'v', ch: 'i', sh: 'u' };
const naturalFinals = {
  a: 'a', o: 'o', e: 'e', i: 'i', u: 'u', ü: 'v',
  ai: 'l', ei: 'z', ao: 'k', ou: 'b', an: 'j', en: 'f', ang: 'h', eng: 'g', er: 'r',
  ia: 'w', ie: 'x', iao: 'c', iu: 'q', ian: 'm', in: 'n', iang: 'd', ing: 'y', iong: 's',
  ua: 'w', uo: 'o', uai: 'y', ui: 'v', uan: 'r', un: 'p', uang: 'd', ong: 's', ue: 't', üe: 't',
};
const finals = {
  xiaohe: { ...naturalFinals, ai: 'd', ei: 'w', ao: 'c', ou: 'z', ia: 'x', ua: 'x', ie: 'p',
    iao: 'n', in: 'b', iang: 'l', uang: 'l', ing: 'k', uai: 'k', un: 'y' },
  ziranma: naturalFinals,
  microsoft: { ...naturalFinals, ing: ';', ü: 'y', üe: 'v' },
  sogou: { ...naturalFinals, ing: ';', ü: 'y' },
};

export function shuangpin(reading, scheme) {
  if (typeof reading !== 'string' || !SHUANGPIN_SCHEMES.includes(scheme)) return null;
  // Remove tones only: stripping all combining marks would turn ü into u.
  const syllable = reading.toLowerCase().normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '')
    .normalize('NFC').replace(/[1-5]$/, '').replace(/u:|v/g, 'ü');
  const map = finals[scheme];
  if (/^(?:[aoe]|ai|ei|ao|ou|an|en|ang|eng|er)$/.test(syllable)) {
    if (scheme === 'microsoft' || scheme === 'sogou') return 'o' + map[syllable];
    if (syllable.length === 1) return syllable.repeat(2);
    return syllable.length === 2 ? syllable : syllable[0] + map[syllable];
  }
  // Split written Pinyin, including y/w and contracted iu/ui/un. j/q/x/y
  // keep their written u, while nü/lü and nüe/lüe retain the umlaut.
  const parts = /^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])([a-zü]+)$/.exec(syllable);
  if (!parts || !Object.hasOwn(map, parts[2])) return null;
  return (initials[parts[1]] || parts[1]) + map[parts[2]];
}

export function formatReadings(tokens, format = 'full', scheme = 'xiaohe') {
  if (format !== 'shuangpin' || !SHUANGPIN_SCHEMES.includes(scheme)) return tokens;
  return tokens.map(token => {
    if (!token.reading) return token;
    const keys = shuangpin(token.reading, scheme);
    return { ...token, displayReading: keys || token.reading, shuangpin: Boolean(keys), readingFallback: !keys };
  });
}
