import corpus from '../../../data/passages.json' with { type: 'json' };
import { TEXT_LENGTHS, PASSAGE_LENGTHS } from './passage-lengths.js';
export { TEXT_LENGTHS, PASSAGE_LENGTHS };

export const CORPUS_VERSION = corpus.version;
export const RECENT_LIMIT = 16;
export const entries = corpus.entries;
const familyOf = id => entries.find(entry => entry.id === id)?.family || id;

export function selectPassage(language, { length = 'short', recent = [], random = Math.random } = {}) {
  if (!TEXT_LENGTHS.includes(length)) throw new Error('invalid_length');
  const rows = entries.filter(entry => entry.language === language && entry.length === length);
  if (!rows.length) throw new Error('invalid_language');
  const families = recent.map(familyOf);
  const fresh = rows.filter(entry => !families.includes(entry.family));
  const entry = fresh.length ? fresh[Math.floor(random() * fresh.length)]
    : rows.sort((a, b) => families.lastIndexOf(a.family) - families.lastIndexOf(b.family))[0];
  return { text: entry.text, ids: [entry.id], passageId: entry.id, length, topic: entry.topic };
}

// Shuffle topics, preserving the authored order of paragraphs within a topic.
// Prefer unseen paragraphs, then the least recent ones only if needed to fill
// the run. Never repeat an entry within a run, even for an oversized request.
export function selectPractice(language, recent = [], minChars = 1200, random = Math.random) {
  // Timed practice retains its short-text difficulty and score family.
  const rows = entries.filter(entry => entry.language === language && entry.length === 'short');
  const topics = [...new Set(rows.map(entry => entry.topic))];
  for (let i = topics.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [topics[i], topics[j]] = [topics[j], topics[i]];
  }
  const families = recent.map(familyOf);
  const seen = new Set(families);
  const ordered = topics.flatMap(topic => rows.filter(entry => entry.topic === topic && !seen.has(entry.family)));
  ordered.push(...rows.filter(entry => seen.has(entry.family)).sort((a, b) => families.lastIndexOf(a.family) - families.lastIndexOf(b.family)));
  const chosen = [];
  let text = '';
  for (const entry of ordered) {
    text += (text && language === 'en' ? ' ' : '') + entry.text;
    chosen.push(entry.id);
    if (text.length >= minChars) break;
  }
  return { text, ids: chosen };
}
