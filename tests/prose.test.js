import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { TIMED_CHARS, joinPassageText, pickPassage, pickTimedPassages, proseRuns, splitPassages } from '../packages/practice/src/prose.js';
import * as dshCorpus from '../packages/dsh-plugin/src/corpus.js';

const item = (text, fingerprint, language = 'en') => ({ text, language, source: { fingerprint } });

test('DSH corpus re-exports the shared prose parser', () => {
  assert.equal(dshCorpus.proseRuns, proseRuns);
  assert.equal(dshCorpus.splitPassages, splitPassages);
});

test('shared prose module bundles for browsers without Node APIs', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const result = await build({ absWorkingDir: root, entryPoints: ['packages/practice/src/prose.js'], bundle: true,
    platform: 'browser', format: 'esm', write: false, metafile: true, logLevel: 'silent' });
  const inputs = Object.keys(result.metafile.inputs);
  assert.ok(inputs.every(path => !path.startsWith('node:') && !path.includes('packages/dsh-plugin/')), inputs.join('\n'));
  assert.ok(!/\(\?<[=!]/.test(result.outputFiles[0].text), 'Regular expression lookbehind is unsupported before iOS 16.4');
});

test('joined text uses spaces only for English', () => {
  assert.equal(joinPassageText([item('One.', 'a'), item('Two.', 'b')]), 'One. Two.');
  assert.equal(joinPassageText([item('一。', 'a', 'zh'), item('二。', 'b', 'zh')]), '一。二。');
  assert.equal(joinPassageText([]), '');
});

test('passage selection prefers fresh text, then the least recently used repeat', () => {
  const fresh = [item('A', 'a'), item('B', 'b')];
  assert.equal(pickPassage(fresh, [], [], () => 0.99), fresh[1]);
  const repeats = [item('C', 'c'), item('D', 'd')];
  assert.equal(pickPassage([], repeats, ['d', 'c']), repeats[1]);
  assert.deepEqual(repeats.map(row => row.source.fingerprint), ['c', 'd'], 'input order is not mutated');
  assert.equal(pickPassage([], [], []), null);
});

test('timed selection fills the buffer with fresh text first and never returns a short buffer', () => {
  const long = 'x'.repeat(TIMED_CHARS / 2);
  const fresh = [item(long, 'a')];
  const repeats = [item(long, 'c'), item(long, 'b')];
  assert.deepEqual(pickTimedPassages(fresh, repeats, ['b', 'c']).map(row => row.source.fingerprint), ['a', 'b']);
  assert.equal(pickTimedPassages(fresh, [], []), null);
  assert.deepEqual(pickTimedPassages([item(long + long + 'x', 'z'), item(long, 'y')], [], []).map(row => row.source.fingerprint), ['z']);
});
