import { createHash } from 'node:crypto';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { LENGTHS, measure, normalizeText, hasUnsupportedCharacters, qualityIssues, nearDuplicate } from '../../practice/src/text-policy.js';
import { PASSAGE_LENGTHS, TEXT_LENGTHS } from '../../practice/src/passage-lengths.js';
export { LENGTHS, measure, matchesLanguage } from '../../practice/src/text-policy.js';

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
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

export async function extractPassages(events, options, signal) {
  if (!Object.hasOwn(LENGTHS, options.language) || !TEXT_LENGTHS.includes(options.length ?? 'short')) throw new Error('invalid_options');
  const completed = new Set(events.filter(event => event.type === 'turn/end' && event.data?.reason?.kind === 'completed').map(event => event.data.turn));
  const candidates = [];
  const seen = new Set();
  let budget = 200000;
  let limited = events.length > 20000;
  const recent = events.slice(-20000);
  for (let i = recent.length - 1; i >= 0; i--) {
    if (i % 64 === 0) { await new Promise(resolve => setImmediate(resolve)); signal?.throwIfAborted(); }
    const event = recent[i];
    if (!Number.isFinite(event.time) || event.time < options.since || event.time > options.until) continue;
    const role = event.type === 'user/message' ? 'user' : event.type === 'assistant/message' ? 'assistant' : null;
    if (!role) continue;
    const message = role === 'user' ? event.data : event.data?.message;
    if (message?.role !== role || message.source?.kind !== (role === 'user' ? 'user' : 'model') || !Array.isArray(message.content)) continue;
    if (role === 'assistant' && (!completed.has(event.data.turn) || message.content.some(block => block.type === 'tool-call'))) continue;
    for (let blockIndex = 0; blockIndex < message.content.length; blockIndex++) {
      const block = message.content[blockIndex];
      if (block.type !== 'text' || typeof block.text !== 'string') continue;
      if (block.text.length > 20000) { limited = true; continue; }
      budget -= block.text.length;
      if (budget < 0) return { candidates, limited: true };
      for (const run of proseRuns(block.text)) for (const part of splitPassages(run.text, options.language, options.length)) {
        const fingerprint = createHash('sha256').update(part.text).digest('hex');
        if (seen.has(fingerprint) || candidates.some(item => nearDuplicate(item.text, part.text))) continue;
        seen.add(fingerprint);
        candidates.push({
          id: `${event.seq}:${blockIndex}:${part.start}:${fingerprint.slice(0, 12)}`,
          text: part.text, language: options.language, length: options.length ?? 'short',
          count: measure(part.text, options.language), chars: [...graphemes.segment(part.text)].length,
          source: { sessionId: options.sessionId, seq: event.seq, time: event.time, role, messageId: message.id,
            blockIndex, lineStart: run.lineStart, lineEnd: run.lineEnd,
            cleanStart: part.start, cleanEnd: part.end, fingerprint },
        });
        if (candidates.length === 30) return { candidates, limited: true };
      }
    }
  }
  signal?.throwIfAborted();
  return { candidates, limited };
}
