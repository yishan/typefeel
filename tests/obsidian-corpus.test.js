import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { cleanObsidianMarkdown } from '../packages/obsidian-plugin/src/markdown.js';
import { inFolders, normalizeFolder, parseSettings, removeFolder, renameFolder } from '../packages/obsidian-plugin/src/folders.js';
import { createVaultCorpus, selectionRequest, sha256 } from '../packages/obsidian-plugin/src/vault-corpus.js';
import { proseRuns, selectionLanguage, selectionPassage } from '../packages/practice/src/prose.js';
import { createPractice } from '../packages/practice/src/create-practice.js';
import { entries } from '../packages/practice/src/practice-text.js';

const zh = entries.find(entry => entry.id === 'zh-travel-01').text;
const en = entries.find(entry => entry.language === 'en' && entry.length === 'short').text;
const enLong = entries.filter(entry => entry.language === 'en' && entry.length === 'short').slice(0, 8).map(entry => entry.text);

test('Obsidian Markdown keeps what a reader sees as prose', () => {
  const markdown = `---
tags: [daily]
---
# Heading

I read [[Notes/Deep Work#Rules|the rules]] and [[Daily/Plan]] today. ==Focus== helps. #focus #学习 %%private%% ^blk1

> [!note] Callout title
> The callout body is prose.

See ![[image.png]] here.

$$
x^2
$$

A footnote[^1] stays.

[^1]: Footnote text.
`;
  assert.deepEqual(proseRuns(cleanObsidianMarkdown(markdown)).map(run => run.text),
    ['I read the rules and Plan today. Focus helps.', 'The callout body is prose.', 'A footnote stays.']);
  assert.equal(cleanObsidianMarkdown('Price #1 and page#anchor stay.'), 'Price #1 and page#anchor stay.');
  assert.equal(cleanObsidianMarkdown('## Heading'), '## Heading');
});

test('folder settings are normalized, renamed with their children and removed', () => {
  assert.equal(normalizeFolder(' /Notes//Daily/ '), 'Notes/Daily');
  assert.equal(normalizeFolder('/'), '');
  assert.deepEqual(parseSettings({ folders: ['b', '/a/', 'a', null] }), { version: 1, folders: ['a', 'b'] });
  assert.deepEqual(parseSettings(null), { version: 1, folders: [] });
  assert.ok(inFolders('Notes/Daily/x.md', ['Notes']));
  assert.ok(!inFolders('Notebook/x.md', ['Notes']), 'a folder prefix is not a parent folder');
  assert.ok(inFolders('x.md', ['']), 'the vault root contains every note');
  assert.deepEqual(renameFolder(['Notes', 'Notes/Daily', 'Other'], 'Notes', 'Journal'), ['Journal', 'Journal/Daily', 'Other']);
  assert.deepEqual(removeFolder(['Notes', 'Notes/Daily', 'Notebook'], 'Notes'), ['Notebook']);
});

function vault(notes) {
  const reads = [];
  const files = Object.entries(notes).map(([path, text], index) => ({ path, basename: path.split('/').pop().replace(/\.md$/, ''), mtime: index, text }));
  return { reads, listFiles: () => files, read: async file => { reads.push(file.path); return file.text; } };
}
const query = values => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) for (const item of [value].flat()) params.append(key, item);
  return params;
};

test('note corpus reads only the selected folders and keeps paths out of recent-use data', async () => {
  const notes = vault({ 'Practice/zh.md': `# 旅行\n\n${zh}\n`, 'Private/zh.md': zh.replace('。', '，秘密。'), 'Practice/en.md': en });
  const fetchCorpus = createVaultCorpus({ getFolders: () => ['Practice'], ...notes });
  const body = await fetchCorpus(query({ language: 'zh', mode: 'passage', length: 'short' }));
  assert.ok(!notes.reads.includes('Private/zh.md'), 'notes outside the selected folders are never read');
  assert.equal(body.candidate.language, 'zh');
  assert.equal(body.candidate.mode, 'passage');
  assert.equal(body.candidate.length, 'short');
  assert.equal(body.candidate.source.sessionId, 'Practice/zh.md');
  assert.equal(body.candidate.source.fingerprint, await sha256(body.candidate.text));
  assert.ok(zh.includes(body.candidate.text));
});

test('note corpus reports why no passage was chosen', async () => {
  const none = createVaultCorpus({ getFolders: () => [], ...vault({ 'a.md': zh }) });
  assert.deepEqual(await none(query({ language: 'zh' })), { candidate: null, reason: 'unconfigured' });
  const empty = createVaultCorpus({ getFolders: () => [''], ...vault({ 'a.md': 'Too short.' }) });
  assert.deepEqual(await empty(query({ language: 'en' })), { candidate: null, reason: 'empty' });
  const failing = createVaultCorpus({ getFolders: () => [''], listFiles: () => [{ path: 'a.md', mtime: 0 }], read: async () => { throw new Error('locked'); } });
  assert.deepEqual(await failing(query({ language: 'en' })), { candidate: null, reason: 'read_failed' });
  const invalid = createVaultCorpus({ getFolders: () => [''], ...vault({}) });
  assert.equal((await invalid(query({ language: 'fr' }))).reason, 'invalid_options');
});

test('note corpus excludes the current passage and prefers fresh text over recent text', async () => {
  const notes = vault({ 'a.md': enLong[0], 'b.md': enLong[1] });
  const fetchCorpus = createVaultCorpus({ getFolders: () => [''], ...notes });
  const [first, second] = [await sha256(enLong[0]), await sha256(enLong[1])];
  const fresh = await fetchCorpus(query({ language: 'en', recent: [second] }));
  assert.equal(fresh.candidate.source.fingerprint, first);
  const repeat = await fetchCorpus(query({ language: 'en', exclude: [first], recent: [second] }));
  assert.equal(repeat.candidate.source.fingerprint, second, 'only recent text is left, so the oldest repeat is used');
  const none = await fetchCorpus(query({ language: 'en', exclude: [first, second] }));
  assert.equal(none.candidate, null);
});

test('timed note practice joins distinct passages into one buffer', async () => {
  const notes = Object.fromEntries(enLong.map((text, index) => [`n${index}.md`, text]));
  const fetchCorpus = createVaultCorpus({ getFolders: () => [''], ...vault(notes) });
  const body = await fetchCorpus(query({ language: 'en', mode: 'timed', length: 'short' }));
  assert.equal(body.candidate.mode, 'timed');
  assert.ok(body.candidate.text.length >= 1200);
  assert.ok(body.candidate.source.fingerprints.length >= 2 && body.candidate.source.fingerprints.length <= 16);
  assert.equal(body.candidate.source.fingerprint, await sha256(body.candidate.text));
  const short = createVaultCorpus({ getFolders: () => [''], ...vault({ 'a.md': en }) });
  assert.deepEqual(await short(query({ language: 'en', mode: 'timed' })), { candidate: null, reason: 'insufficient' });
});

test('a selection becomes one typeable passage in the detected language', async () => {
  assert.equal(selectionLanguage('I wrote a short list before leaving.'), 'en');
  assert.equal(selectionLanguage('我哋今日去咗街市，佢話啲菜好新鮮。'), 'yue');
  assert.equal(selectionLanguage('学习新内容时，我会在旁边放一本小笔记本。'), 'zh');
  assert.equal(selectionLanguage('12345'), null);
  assert.deepEqual(selectionPassage('I read the rules and practiced every day. Focus helps a lot. Press ⌘K now. More text after.', 'en'),
    { text: 'I read the rules and practiced every day. Focus helps a lot.', length: 'short' });
  assert.equal(selectionPassage('Too short.', 'en'), null);
  assert.equal(selectionPassage('Write to me at a@b.com about this long sentence here.', 'en'), null);
  const long = selectionPassage(enLong.join(' '), 'en');
  assert.equal(long.length, 'long');
  const request = await selectionRequest(`- [[Plan|Plans]] help when ${en}`, { path: 'Daily/x.md', basename: 'x' });
  assert.equal(request.language, 'en');
  assert.ok(request.text.startsWith('Plans help when '));
  assert.deepEqual({ sessionId: request.source.sessionId, title: request.source.title }, { sessionId: 'Daily/x.md', title: 'x' });
  assert.equal(request.source.fingerprint, await sha256(request.text));
  assert.equal(await selectionRequest('```\ncode only\n```', null), null);
});

test('the shared practice accepts only well-formed handed-over text', async () => {
  const { startWithText } = createPractice(React, { storagePrefix: 'test.handover' });
  const fingerprint = await sha256(en);
  assert.equal(startWithText({ language: 'en', length: 'short', text: en, source: { sessionId: 'a.md', fingerprint } }), true);
  for (const bad of [null, { language: 'fr', length: 'short', text: en, source: { sessionId: '', fingerprint } },
    { language: 'en', length: 'huge', text: en, source: { sessionId: '', fingerprint } },
    { language: 'en', length: 'short', text: 'x'.repeat(3001), source: { sessionId: '', fingerprint } },
    { language: 'en', length: 'short', text: en, source: { sessionId: '', fingerprint: 'abc' } },
    { language: 'en', length: 'short', text: '  ', source: { sessionId: '', fingerprint } }]) {
    assert.equal(startWithText(bad), false);
  }
});
