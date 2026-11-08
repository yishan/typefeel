import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { shuangpin, formatReadings, SHUANGPIN_SCHEMES } from '../packages/practice/src/shuangpin.js';
import { annotate } from '../packages/practice/src/pinyin.js';
import { entries } from '../packages/practice/src/practice-text.js';

// Hand-checked syllables, not expected values generated from the implementation.
// Columns: full Pinyin, Xiaohe, Ziranma, Microsoft, Sogou. References:
// https://github.com/rime/rime-double-pinyin/blob/master/double_pinyin_flypy.schema.yaml
// https://github.com/rime/rime-double-pinyin/blob/master/double_pinyin.schema.yaml
// https://github.com/fcitx/libime/blob/master/src/libime/pinyin/shuangpindata.h
// https://pinyin.sogou.com/help.php?list=3&q=4
// https://github.com/Yidadaa/shuangpin/blob/main/src/utils/spconfig.json
const fixtures = `
ā aa aa oa oa
ō oo oo oo oo
é ee ee oe oe
ài ai ai ol ol
ěi ei ei oz oz
ǎo ao ao ok ok
ǒu ou ou ob ob
ān an an oj oj
ēn en en of of
áng ah ah oh oh
ēng eg eg og og
ér er er or or
bā ba ba ba ba
bō bo bo bo bo
dé de de de de
nǐ ni ni ni ni
lù lu lu lu lu
lǜ lv lv ly ly
nǚ nv nv ny ny
bái bd bl bl bl
bèi bw bz bz bz
bāo bc bk bk bk
gǒu gz gb gb gb
bàn bj bj bj bj
běn bf bf bf bf
bāng bh bh bh bh
bèng bg bg bg bg
jiā jx jw jw jw
jiē jp jx jx jx
jiāo jn jc jc jc
liù lq lq lq lq
jiān jm jm jm jm
pīn pb pn pn pn
jiāng jl jd jd jd
jīng jk jy j; j;
jiǒng js js js js
chuā ix iw iw iw
guō go go go go
kuài kk ky ky ky
shuǐ uv uv uv uv
guān gr gr gr gr
shùn uy up up up
shuāng ul ud ud ud
zhōng vs vs vs vs
xué xt xt xt xt
lüè lt lt lv lt
nüè nt nt nv nt
chī ii ii ii ii
shī ui ui ui ui
zhī vi vi vi vi
yīng yk yy y; y;
yún yy yp yp yp
wēng wg wg wg wg
jū ju ju ju ju
qù qu qu qu qu
xū xu xu xu xu
yǔ yu yu yu yu
juǎn jr jr jr jr
jùn jy jp jp jp
`;

for (const [column, scheme] of SHUANGPIN_SCHEMES.entries()) {
  test(`${scheme}: reference syllables cover every final, zero initial and umlaut rule`, () => {
    for (const line of fixtures.trim().split('\n')) {
      const [reading, ...codes] = line.split(' ');
      assert.equal(shuangpin(reading, scheme), codes[column], reading);
    }
  });
}

test('tone normalization preserves umlauts, contracted spellings and unsupported readings', () => {
  for (const reading of ['NǙ', 'nu\u0308\u030c', 'nü3', 'nv3', 'nu:3']) assert.equal(shuangpin(reading, 'microsoft'), 'ny');
  assert.equal(shuangpin('nù', 'microsoft'), 'nu');
  for (const reading of ['m', 'ń', 'ǹg', 'ê', 'hm', 'huār', 'hello', '', null, 'xué。']) {
    for (const scheme of SHUANGPIN_SCHEMES) assert.equal(shuangpin(reading, scheme), null, String(reading));
  }
  for (const scheme of ['invalid', 'constructor', '__proto__', undefined]) assert.equal(shuangpin('nǐ', scheme), null);
});

test('contextual readings and alignment survive scheme switches without mutating the reading cache', () => {
  const text = '银行行走，音乐快乐。A é👨‍👩‍👧‍👦𠮷嗯';
  const tokens = annotate(text);
  const original = structuredClone(tokens);
  tokens.forEach(Object.freeze); Object.freeze(tokens);
  assert.deepEqual(tokens.slice(0, 4).map(t => t.reading), ['yín', 'háng', 'xíng', 'zǒu']);
  assert.deepEqual(tokens.slice(5, 9).map(t => t.reading), ['yīn', 'yuè', 'kuài', 'lè']);
  const xiaohe = formatReadings(tokens, 'shuangpin', 'xiaohe');
  const microsoft = formatReadings(tokens, 'shuangpin', 'microsoft');
  assert.deepEqual(xiaohe.slice(0, 4).map(t => t.displayReading), ['yb', 'hh', 'xk', 'zz']);
  assert.deepEqual(microsoft.slice(0, 4).map(t => t.displayReading), ['yn', 'hh', 'x;', 'zb']);
  assert.equal(xiaohe.at(-1).displayReading, 'ǹg');
  assert.equal(xiaohe.at(-1).readingFallback, true);
  assert.equal(xiaohe.at(-2).reading, null);
  for (const converted of [xiaohe, microsoft]) {
    assert.equal(converted.map(t => t.char).join(''), text);
    assert.deepEqual(converted.map(({ char, offset, reading, wordStart, wordEnd }) => ({ char, offset, reading, wordStart, wordEnd })), original);
  }
  assert.equal(formatReadings(tokens, 'full', 'sogou'), tokens);
  assert.equal(formatReadings(tokens, 'shuangpin', 'invalid'), tokens);
  assert.deepEqual(tokens, original);
});

test('all 96 Chinese passages have a two-key hint for every annotated Han grapheme', () => {
  const passages = entries.filter(item => item.language === 'zh');
  assert.equal(passages.length, 96);
  for (const { id, text } of passages) {
    const tokens = annotate(text);
    for (const scheme of SHUANGPIN_SCHEMES) {
      const display = formatReadings(tokens, 'shuangpin', scheme);
      assert.equal(display.map(t => t.char).join(''), text);
      assert.equal(display.length, tokens.length);
      for (const token of display) {
        if (token.reading) {
          assert.equal(token.readingFallback, false, `${id}: ${token.char}/${token.reading}/${scheme}`);
          assert.match(token.displayReading, /^[a-z;]{2}$/);
        } else assert.equal(token.displayReading, undefined);
      }
    }
  }
});

test('shipped Mandarin chunk includes identical local conversion rules', () => {
  let registration;
  vm.runInNewContext(readFileSync(new URL('../dist/dsh-plugin/client.pinyin.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load(value) { registration = value; } } },
  });
  const engine = registration.factory(() => { throw new Error('Unexpected external dependency'); });
  const text = '双拼安英女略嗯，银行行走音乐快乐。';
  for (const scheme of SHUANGPIN_SCHEMES) {
    assert.deepEqual(JSON.parse(JSON.stringify(engine.formatReadings(engine.annotate(text), 'shuangpin', scheme))),
      formatReadings(annotate(text), 'shuangpin', scheme));
  }
});
