import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { annotate as pinyin } from '../packages/practice/src/pinyin.js';
import { annotate as jyutping } from '../packages/practice/src/jyutping.js';
import { alignReadings } from '../packages/practice/src/annotations.js';
import { entries } from '../packages/practice/src/practice-text.js';

test('Mandarin readings use context and retain tone marks', () => {
  assert.deepEqual(pinyin('银行行走').map(t => t.reading), ['yín', 'háng', 'xíng', 'zǒu']);
});

test('Cantonese readings use context and preserve tone numbers', () => {
  assert.deepEqual(jyutping('銀行行路').map(t => t.reading), ['ngan4', 'hong4', 'haang4', 'lou6']);
  const home = jyutping('返屋企煮飯');
  assert.deepEqual(home.slice(1, 3).map(t => [t.wordStart, t.wordEnd]), [[1, 3], [1, 3]]);
  assert.equal(jyutping('慢慢行')[2].reading, 'haang4');
  assert.equal(jyutping('返到屋企')[0].reading, 'faan1');
});

for (const [name, annotate] of Object.entries({ pinyin, jyutping })) {
  test(`${name}: mixed text, punctuation and graphemes stay aligned`, () => {
    const text = '銀行𠮷é👨‍👩‍👧‍👦 A，字\u{E0100}好。';
    const tokens = annotate(text);
    assert.equal(tokens.map(t => t.char).join(''), text);
    assert.equal(tokens.length, [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length);
    for (const token of tokens) {
      if (!/\p{Script=Han}/u.test(token.char)) assert.equal(token.reading, null);
      assert.equal(text.slice(token.offset, token.offset + token.char.length), token.char);
      assert.ok(token.wordStart >= 0 && token.wordEnd <= tokens.length);
    }
    assert.equal(tokens.find(t => t.char === '𠮷').reading, null);
    assert.ok(tokens.find(t => t.char.startsWith('字')).reading);
  });
  test(`${name}: shipped DSH chunk is self-contained and equivalent to source`, () => {
    let registration;
    vm.runInNewContext(readFileSync(new URL(`../dist/dsh-plugin/client.${name}.js`, import.meta.url), 'utf8'), {
      window: { __ModuleLoader__: { load(row) { registration = row; } } },
    });
    assert.equal(registration.id, 'dsh-typing-practice');
    assert.equal(registration.chunk, `client.${name}.js`);
    const engine = registration.factory(() => { throw new Error('Unexpected external dependency'); });
    const text = '銀行行路，我哋返屋企。';
    assert.deepEqual(JSON.parse(JSON.stringify(engine.annotate(text))), annotate(text));
  });
}

test('all built-in passages have aligned readings for every Han character', () => {
  for (const { id, language, text } of entries.filter(entry => entry.language !== 'en')) {
    const tokens = (language === 'zh' ? pinyin : jyutping)(text);
    assert.equal(tokens.map(t => t.char).join(''), text);
    assert.deepEqual(tokens.filter(t => /\p{Script=Han}/u.test(t.char) && !t.reading), [], id);
  }
});

test('misaligned engine output is rejected rather than shifting later hints', () => {
  assert.throws(() => alignReadings('你好', [['你', 'nǐ']], 'zh'), /alignment/);
});
