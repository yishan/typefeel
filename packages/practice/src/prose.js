import { fromMarkdown } from 'mdast-util-from-markdown';
import { LENGTHS, measure, matchesLanguage, normalizeText, hasUnsupportedCharacters, qualityIssues } from './text-policy.js';
import { PASSAGE_LENGTHS, TEXT_LENGTHS } from './passage-lengths.js';

// Turns a person's own Markdown into practice passages. Shared by every local
// text source (DSH conversations, Obsidian notes); no Node or host APIs here.
const sentences = new Intl.Segmenter(undefined, { granularity: 'sentence' });
const unsuitable = /(?:https?:\/\/|www\.)\S+|(?:\/(?:Users|home|tmp|etc|var)\/|[A-Z]:\\)\S+|\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{16,}|AKIA[A-Z0-9]{16})\b|(?:api[_ -]?key|access[_ -]?token|password|secret|密码|密钥)\s*[:=：]\s*\S+|-----BEGIN [A-Z ]*PRIVATE KEY|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\x1b\[|^\s*(?:\[?(?:INFO|DEBUG|ERROR|WARN)\b|Traceback|at \S+\s*\()/imu;

// Keep prose and link labels. Code, HTML, media, tables and headings are
// boundaries, not holes to silently concatenate across. Never render HTML.
function inline(node) {
  if (node.type === 'text') return node.value;
  if (node.type === 'break') return ' ';
  if (['emphasis', 'strong', 'link', 'linkReference'].includes(node.type)) {
    const parts = node.children.map(inline);
    return parts.some(part => part == null) ? null : parts.join('');
  }
  return null;
}

export function proseRuns(markdown) {
  const tree = fromMarkdown(markdown);
  const runs = [];
  let run;
  const flush = () => { if (run) runs.push(run); run = undefined; };
  function walk(nodes) {
    for (const node of nodes) {
      if (node.type === 'paragraph') {
        const pieces = node.children.map(inline);
        const text = pieces.some(piece => piece == null) ? '' : pieces.join('').replace(/\s+/gu, ' ').trim();
        if (!text || unsuitable.test(text) || /[|<>]|\u0000/u.test(text)) { flush(); continue; }
        if (run) { run.text += ' ' + text; run.lineEnd = node.position.end.line; }
        else run = { text, lineStart: node.position.start.line, lineEnd: node.position.end.line };
      } else if (['list', 'listItem', 'blockquote'].includes(node.type)) {
        flush(); walk(node.children); flush();
      } else flush();
    }
  }
  walk(tree.children);
  flush();
  return runs;
}

export function splitPassages(text, language, length = 'short') {
  if (!TEXT_LENGTHS.includes(length) || !Object.hasOwn(LENGTHS, language)) throw new Error('invalid_options');
  const [min, max] = PASSAGE_LENGTHS[length][language];
  // Canonical text is also the input to length checks, readings and hashes.
  text = normalizeText(text, language);
  if (unsuitable.test(text)) return [];
  const result = [];
  let start = 0;
  let end = 0;
  const flush = () => {
    const value = text.slice(start, end).trim();
    if (measure(value, language) >= min && !qualityIssues(value, language).length) result.push({ text: value, start, end });
    start = end;
  };
  for (const part of sentences.segment(text)) {
    const nextEnd = part.index + part.segment.length;
    // A meaningful unsupported symbol makes its whole sentence unsuitable.
    // Treat it as a boundary instead of joining the surrounding prose.
    if (hasUnsupportedCharacters(part.segment, language) || measure(part.segment.trim(), language) > max) {
      flush(); start = end = nextEnd; continue;
    }
    if (measure(text.slice(start, nextEnd).trim(), language) > max) { flush(); start = part.index; }
    end = nextEnd;
  }
  flush();
  return result;
}

// Timed practice needs one continuous buffer of at least this many characters,
// the same minimum as built-in timed practice.
export const TIMED_CHARS = 1200;

export function joinPassageText(items) {
  return items.map(item => item.text).join(items[0]?.language === 'en' ? ' ' : '');
}

// Oldest recent use first, so a forced repeat is the least recently practised.
export function byRecentUse(items, recent) {
  return [...items].sort((a, b) => recent.indexOf(a.source.fingerprint) - recent.indexOf(b.source.fingerprint));
}

// Prepare complete, distinct passages before starting. Never stall the clock
// for another read, repeat a short excerpt, or mix in built-ins.
export function pickTimedPassages(fresh, repeats, recent, minChars = TIMED_CHARS) {
  const selected = [];
  for (const item of [...fresh, ...byRecentUse(repeats, recent)]) {
    selected.push(item);
    if (joinPassageText(selected).length >= minChars) break;
  }
  return joinPassageText(selected).length >= minChars ? selected : null;
}

// Prefer fresh text; reuse the oldest recent match only when nothing fresh is left.
export function pickPassage(fresh, repeats, recent, random = Math.random) {
  if (fresh.length) return fresh[Math.floor(random() * fresh.length)];
  return repeats.length ? byRecentUse(repeats, recent)[0] : null;
}

// A person's own selection is practised as one passage. It need not be a
// complete, balanced excerpt, but every kept sentence must be typeable.
const SELECTION_MIN = { en: 5, zh: 10, yue: 10 };

export function selectionLanguage(text) {
  return ['en', 'yue', 'zh'].find(language => matchesLanguage(text, language)) ?? null;
}

// The first contiguous run of typeable sentences, capped at a long passage.
// Returns { text, length } or null when nothing practicable is selected.
export function selectionPassage(text, language) {
  if (!Object.hasOwn(LENGTHS, language)) throw new Error('invalid_options');
  text = normalizeText(text, language);
  if (unsuitable.test(text)) return null;
  const max = PASSAGE_LENGTHS.long[language][1];
  const separator = language === 'en' ? ' ' : '';
  const kept = [];
  for (const part of sentences.segment(text)) {
    const sentence = part.segment.trim();
    if (!sentence) continue;
    if (hasUnsupportedCharacters(sentence, language)) { if (kept.length) break; continue; }
    if (measure([...kept, sentence].join(separator), language) > max) break;
    kept.push(sentence);
  }
  const passage = kept.join(separator);
  const count = measure(passage, language);
  if (count < SELECTION_MIN[language]) return null;
  return { text: passage, length: TEXT_LENGTHS.find(length => count <= PASSAGE_LENGTHS[length][language][1]) };
}
