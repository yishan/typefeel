// Chooses practice text from notes in the folders the person selected. Reads
// through the given vault functions only, so tests run without Obsidian.
// Note text stays in memory for this practice run: scores and recent-use
// records keep fingerprints, never paths or text.
import { LENGTHS, measure, nearDuplicate } from '../../practice/src/text-policy.js';
import { TEXT_LENGTHS } from '../../practice/src/passage-lengths.js';
import { RECENT_LIMIT } from '../../practice/src/practice-text.js';
import { TIMED_CHARS, joinPassageText, pickPassage, pickTimedPassages, proseRuns, selectionLanguage, selectionPassage, splitPassages } from '../../practice/src/prose.js';
import { cleanObsidianMarkdown } from './markdown.js';
import { inFolders } from './folders.js';

const FILE_LIMIT = 200;
const CHAR_BUDGET = 200000;
const NOTE_LIMIT = 20000;
const CANDIDATE_LIMIT = 30;
const fingerprint = /^[a-f0-9]{64}$/;

export async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

const pause = () => new Promise(resolve => setTimeout(resolve, 0));

// files: [{ path, basename, mtime }]; read(file) resolves to Markdown.
export function createVaultCorpus({ getFolders, listFiles, read }) {
  let busy = false;
  return async function fetchCorpus(params, signal) {
    const language = params.get('language');
    const mode = params.get('mode') || 'passage';
    const length = params.get('length') || 'short';
    const exclude = params.getAll('exclude');
    const recent = params.getAll('recent');
    if (!Object.hasOwn(LENGTHS, language) || !TEXT_LENGTHS.includes(length) || !['timed', 'passage'].includes(mode)
      || exclude.some(id => !fingerprint.test(id)) || recent.some(id => !fingerprint.test(id))) return { candidate: null, reason: 'invalid_options' };
    const folders = getFolders();
    if (!folders.length) return { candidate: null, reason: 'unconfigured' };
    if (busy) return { candidate: null, reason: 'busy' };
    busy = true;
    try {
      const files = listFiles().filter(file => inFolders(file.path, folders)).sort((a, b) => b.mtime - a.mtime);
      const passageLength = mode === 'timed' ? 'short' : length;
      const fresh = [];
      const repeats = [];
      const seen = new Set(exclude);
      let budget = CHAR_BUDGET;
      let limited = files.length > FILE_LIMIT;
      let failures = 0;
      let inspected = 0;
      const enough = () => mode === 'timed' ? joinPassageText(fresh).length >= TIMED_CHARS : fresh.length >= CANDIDATE_LIMIT;
      for (const file of files.slice(0, FILE_LIMIT)) {
        await pause();
        signal?.throwIfAborted();
        let markdown;
        try { markdown = await read(file); } catch { failures++; continue; }
        inspected++;
        if (markdown.length > NOTE_LIMIT) { limited = true; markdown = markdown.slice(0, NOTE_LIMIT); }
        budget -= markdown.length;
        for (const run of proseRuns(cleanObsidianMarkdown(markdown))) {
          for (const part of splitPassages(run.text, language, passageLength)) {
            const id = await sha256(part.text);
            if (seen.has(id) || [...fresh, ...repeats].some(item => nearDuplicate(item.text, part.text))) continue;
            seen.add(id);
            (recent.includes(id) ? repeats : fresh).push({
              text: part.text, language, length: passageLength, count: measure(part.text, language),
              source: { sessionId: file.path, title: file.basename, fingerprint: id },
            });
          }
        }
        if (enough()) break;
        if (budget < 0) { limited = true; break; }
      }
      signal?.throwIfAborted();
      if (!inspected && failures) return { candidate: null, reason: 'read_failed' };
      if (mode === 'timed') {
        const selected = pickTimedPassages(fresh, repeats, recent);
        if (!selected || selected.length > RECENT_LIMIT) return { candidate: null, reason: 'insufficient' };
        const text = joinPassageText(selected);
        return { candidate: { language, mode, length: null, text,
          source: { sessionId: selected[0].source.sessionId, title: selected[0].source.title,
            fingerprint: await sha256(text), fingerprints: selected.map(item => item.source.fingerprint) } } };
      }
      const candidate = pickPassage(fresh, repeats, recent);
      if (candidate) return { candidate: { ...candidate, mode } };
      return { candidate: null, reason: limited ? 'limited' : 'empty' };
    } finally {
      busy = false;
    }
  };
}

// Practice request for text selected in a note, or null when nothing in the
// selection can be typed.
export async function selectionRequest(markdown, file) {
  const runs = proseRuns(cleanObsidianMarkdown(markdown)).map(run => run.text);
  const language = selectionLanguage(runs.join(' '));
  if (!language) return null;
  const passage = selectionPassage(runs.join(language === 'en' ? ' ' : ''), language);
  if (!passage) return null;
  return { language, length: passage.length, text: passage.text,
    source: { sessionId: file?.path ?? '', title: file?.basename, fingerprint: await sha256(passage.text) } };
}
