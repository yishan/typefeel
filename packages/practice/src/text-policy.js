// Shared by local conversation extraction and the offline corpus validator.
// Normalize typography only. Symbols with semantic meaning remain in place
// so the quality gate rejects their sentence instead of changing its meaning.
export const LANGUAGES = ['en', 'zh', 'yue'];
import { PASSAGE_LENGTHS } from './passage-lengths.js';
export const LENGTHS = PASSAGE_LENGTHS.short;
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const words = new Intl.Segmenter('en', { granularity: 'word' });
const cantonese = /我哋|你哋|佢哋|屋企|而家|聽日|尋日|噚日|傾偈|食嘢|唔|冇|咗|嘅|喺|嚟|啲|嗰|咁|佢|嘢|攞|睇|畀/gu;

export function measure(text, language) {
  return language === 'en' ? [...words.segment(text)].filter(part => part.isWordLike).length : [...graphemes.segment(text)].length;
}

export function matchesLanguage(text, language) {
  const han = (text.match(/\p{Script=Han}/gu) || []).length;
  const letters = (text.match(/\p{L}/gu) || []).length;
  const yue = [...text.matchAll(cantonese)].length >= 2;
  if (language === 'en') return han === 0 && /[A-Za-z]/.test(text) && letters / Math.max(1, text.length) > .5;
  return han / Math.max(1, letters) >= .6 && (language === 'yue' ? yue : !yue);
}

export function normalizeText(text, language) {
  let value = [...graphemes.segment(text.normalize('NFC'))].map(({ segment }) =>
    /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(segment) ? ' ' : segment).join('');
  value = value.replace(/[\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/gu, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[‘’‚‛＇]/gu, "'");
  if (language === 'en') {
    value = value.replace(/[“”„‟＂「」『』]/gu, '"')
      .replace(/[，。！？；：（）]/gu, char => ({ '，': ',', '。': '.', '！': '!', '？': '?', '；': ';', '：': ':', '（': '(', '）': ')' })[char]);
  } else {
    let straightOpen = false;
    value = value.replace(/[「」『』„‟＂"]/gu, char => {
      if (['「', '『', '„', '‟'].includes(char)) return '“';
      if (['」', '』'].includes(char)) return '”';
      straightOpen = !straightOpen;
      return straightOpen ? '“' : '”';
    });
  }
  return value.replace(/\s+/gu, ' ').trim();
}

export function hasUnsupportedCharacters(text, language) {
  // Keep ordinary punctuation and Latin contractions. Math, hotkeys, paths,
  // arrows and decorative alphabets do not become a typing obstacle.
  return language === 'en'
    ? /[^\p{Script=Latin}\p{M}0-9 .,!?;:'"()%\-]/u.test(text)
    : /[^\p{Script=Han}\p{Script=Latin}\p{M}0-9 .,!?;:'()%\-、，。！？；：“”（）]/u.test(text);
}

export function balancedPunctuation(text, language) {
  const stack = [];
  const pairs = { ')': '(', '）': '（', '”': '“' };
  let doubleOpen = false;
  for (const char of text) {
    if (char === '"' && language === 'en') { doubleOpen = !doubleOpen; continue; }
    if ('(（“'.includes(char)) stack.push(char);
    else if (pairs[char] && stack.pop() !== pairs[char]) return false;
  }
  return !stack.length && !doubleOpen;
}

export function qualityIssues(text, language) {
  if (!LANGUAGES.includes(language)) return ['language'];
  const issues = [];
  if (!matchesLanguage(text, language)) issues.push('language');
  if (hasUnsupportedCharacters(text, language)) issues.push('characters');
  if (!balancedPunctuation(text, language)) issues.push('punctuation');
  if (!/[.!?。！？]["”')）]*$/u.test(text)) issues.push('incomplete');
  if (/^(?:as (?:mentioned|shown) (?:above|below)|(?:the )?(?:above|following) (?:answer|list|table)|以上|上述|如下|第[二三四五六七八九十][点步項项]|上面提到|以下係|上面嗰段)/iu.test(text)) issues.push('context');
  return issues;
}

export function textSignature(text) { return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); }

export function nearDuplicate(left, right) {
  const a = textSignature(left), b = textSignature(right);
  if (a === b) return true;
  if (Math.min(a.length, b.length) / Math.max(a.length, b.length) < .8) return false;
  const grams = text => new Set(Array.from({ length: Math.max(0, text.length - 3) }, (_, i) => text.slice(i, i + 4)));
  const x = grams(a), y = grams(b);
  const shared = [...x].filter(item => y.has(item)).length;
  return x.size + y.size > 0 && 2 * shared / (x.size + y.size) >= .88;
}
