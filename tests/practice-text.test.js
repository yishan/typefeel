import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import corpus from '../data/passages.json' with { type: 'json' };
import { entries, selectPractice, selectPassage, TEXT_LENGTHS, CORPUS_VERSION, RECENT_LIMIT } from '../packages/practice/src/practice-text.js';
import { normalizeText, qualityIssues, nearDuplicate } from '../packages/practice/src/text-policy.js';
import { measure } from '../packages/practice/src/text-policy.js';
import { PASSAGE_LENGTHS } from '../packages/practice/src/passage-lengths.js';
import { validateCorpus } from '../scripts/check-corpus.mjs';

test('offline corpus contains 96 canonical complete entries per language in three balanced tiers', () => {
  assert.deepEqual(validateCorpus(), { en: 96, zh: 96, yue: 96 });
});

test('corpus validation rejects missing provenance, duplicate IDs, short prose, symbols and near duplicates', () => {
  for (const change of [
    data => { data.provenance.kind = 'unknown'; },
    data => { data.entries[0].id = data.entries[1].id; },
    data => { data.entries[0].text = 'Too short.'; },
    data => { data.entries[0].text += ' Press ⌘ now.'; },
    data => { data.entries[0].text = data.entries[1].text.replace('early', 'late'); },
    data => { data.entries[0].text = data.entries[0].text.replace(/\.$/, ''); },
  ]) {
    const invalid = structuredClone(corpus); change(invalid);
    assert.throws(() => validateCorpus(invalid), /Corpus validation failed/);
  }
});

test('typography cleanup is idempotent, preserves contractions and uses language-specific quotes', () => {
  const samples = [
    ['en', '“It’s ready,” she said. 「Let’s go!」 Ａ１２', '"It\'s ready," she said. "Let\'s go!" A12'],
    ['zh', '他说：「今天去公园。」她说："好。"', '他说：“今天去公园。”她说：“好。”'],
    ['yue', '佢話：『我哋返屋企啦。』', '佢話：“我哋返屋企啦。”'],
    ['en', 'A\u200b quiet 👨‍👩‍👧‍👦  🇭🇰 1️⃣ afternoon.\u202e', 'A quiet afternoon.'],
  ];
  for (const [language, input, expected] of samples) {
    assert.equal(normalizeText(input, language), expected);
    assert.equal(normalizeText(expected, language), expected);
  }
});

test('quality gate rejects meaningful unsupported symbols, incomplete quotes and dependent fragments', () => {
  const en = entries[0].text;
  for (const symbol of ['⌘', '→', '≤', '∑']) {
    // These symbols must not be silently erased or turn into a different instruction.
    const text = normalizeText(en + ' Press ' + symbol + ' now.', 'en');
    assert.ok(text.includes(symbol));
    assert.ok(qualityIssues(text, 'en').includes('characters'));
  }
  assert.ok(qualityIssues('"' + en, 'en').includes('punctuation'));
  assert.ok(qualityIssues('As mentioned above, ' + en, 'en').includes('context'));
  assert.ok(qualityIssues(en.slice(0, -1), 'en').includes('incomplete'));
});

test('near duplicate detection ignores case and punctuation but retains unrelated passages', () => {
  assert.equal(nearDuplicate(entries[0].text, entries[0].text.toUpperCase().replaceAll(',', '')), true);
  assert.equal(nearDuplicate(entries[0].text, entries[0].text.replace('bus stop', 'tram stop')), true);
  assert.equal(nearDuplicate(entries[0].text, entries[8].text), false);
});

for (const language of ['en', 'zh', 'yue']) {
  test(`${language}: selects complete authored paragraphs and avoids the recent sixteen`, () => {
    let recent = [];
    for (let i = 0; i < 12; i++) {
      const { text, ids } = selectPractice(language, recent, 1200, () => .5);
      assert.ok(text.length >= 1200);
      assert.equal(new Set(ids).size, ids.length);
      assert.ok(ids.every(id => !recent.includes(id)));
      assert.equal(text, ids.map(id => entries.find(entry => entry.id === id).text).join(language === 'en' ? ' ' : ''));
      recent = [...recent.filter(id => !ids.includes(id)), ...ids].slice(-RECENT_LIMIT);
    }
  });
}

test('small or exhausted selection pools reuse the oldest first and never loop or duplicate within a run', () => {
  const ids = entries.filter(entry => entry.language === 'en' && entry.length === 'short').map(entry => entry.id);
  assert.equal(selectPractice('en', ids, 1).ids[0], ids[0]);
  const huge = selectPractice('en', ids, 100000);
  assert.deepEqual(huge.ids, ids);
});

test('each language has 32 complete families with three independently valid length tiers', () => {
  for (const language of ['en', 'zh', 'yue']) for (const length of TEXT_LENGTHS) {
    const rows = entries.filter(entry => entry.language === language && entry.length === length);
    assert.equal(rows.length, 32);
    for (const entry of rows) {
      const [min, max] = PASSAGE_LENGTHS[length][language];
      assert.ok(measure(entry.text, language) >= min && measure(entry.text, language) <= max, entry.id);
      assert.deepEqual(qualityIssues(entry.text, language), [], entry.id);
    }
  }
});

test('passage selection crosses tiers without repeating a recent scene and exhausts gracefully', () => {
  const recent = [];
  for (let i = 0; i < 32; i++) {
    const selected = selectPassage('zh', { length: TEXT_LENGTHS[i % 3], recent, random: () => 0 });
    const entry = entries.find(entry => entry.id === selected.passageId);
    assert.ok(recent.every(id => entries.find(entry => entry.id === id).family !== entry.family));
    assert.equal(selected.text, entry.text); recent.push(entry.id);
  }
  assert.equal(selectPassage('zh', { length: 'long', recent }).passageId, 'zh-travel-01-long');
  assert.throws(() => selectPassage('zh', { length: 'huge' }), /invalid_length/);
  assert.throws(() => selectPassage('unknown'), /invalid_language/);
});

test('timed selection also avoids scenes recently used in passage mode', () => {
  const recent = entries.filter(entry => entry.language === 'yue' && entry.length === 'long').slice(0, 16).map(entry => entry.id);
  const chosen = selectPractice('yue', recent).ids;
  const families = recent.map(id => entries.find(entry => entry.id === id).family);
  assert.ok(chosen.every(id => !families.includes(entries.find(entry => entry.id === id).family)));
});
