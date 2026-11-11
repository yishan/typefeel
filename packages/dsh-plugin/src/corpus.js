import { createHash } from 'node:crypto';
import { LENGTHS, measure, nearDuplicate } from '../../practice/src/text-policy.js';
import { TEXT_LENGTHS } from '../../practice/src/passage-lengths.js';
import { proseRuns, splitPassages } from '../../practice/src/prose.js';
export { proseRuns, splitPassages } from '../../practice/src/prose.js';
export { LENGTHS, measure, matchesLanguage } from '../../practice/src/text-policy.js';

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

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
