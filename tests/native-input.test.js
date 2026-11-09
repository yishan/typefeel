import assert from 'node:assert/strict';
import test from 'node:test';
import { characters, textEdit, createCommittedBuffer } from '../packages/practice/src/native-input.js';

test('native text diff preserves graphemes and selection replacements', () => {
  assert.equal(characters('你👨‍👩‍👧‍👦é').length, 3);
  const edit = textEdit('春天到了', '春风到了');
  assert.equal(edit.start, 1);
  assert.deepEqual(edit.inserted, ['风']);
  assert.equal(textEdit('春天', '春天').changed, false);
  assert.equal(textEdit('春天', '春').inserted.length, 0);
});

test('composition is never consumed until confirmed and trailing input is a no-op', () => {
  const commits = [];
  const buffer = createCommittedBuffer(value => { commits.push(value); return ''; });
  const element = { value: 'chuntian' };
  buffer.begin(); buffer.input(element, { isComposing: true });
  assert.deepEqual(commits, []);
  element.value = '春天'; buffer.end(element);
  buffer.input(element, { inputType: 'insertText' });
  assert.deepEqual(commits, ['春天']);
  assert.equal(element.value, '');
});

test('a trailing composition notification cannot restore consumed text; a new identical commit counts', () => {
  let count = 0;
  const buffer = createCommittedBuffer(() => { count++; return ''; });
  const element = { value: '春天' };
  buffer.begin(); buffer.end(element);
  element.value = '春天'; buffer.input(element, { inputType: 'insertFromComposition' });
  assert.equal(count, 1);
  assert.equal(element.value, '');
  buffer.begin(); element.value = '春天'; buffer.end(element);
  assert.equal(count, 2);
});

test('separate confirmed characters accumulate and cancellation preserves the old buffer', () => {
  const commits = [];
  const buffer = createCommittedBuffer(value => { commits.push(value); return value === '春天' ? '' : value; });
  const element = { value: '春' };
  buffer.begin(); buffer.end(element);
  buffer.begin(); element.value = '春'; buffer.end(element);
  assert.deepEqual(commits, ['春']);
  buffer.begin(); element.value = '春天'; buffer.end(element);
  assert.deepEqual(commits, ['春', '春天']);
});

test('edits and repeated non-IME letters are real new input; paste and drop are restored', () => {
  const commits = [];
  const buffer = createCommittedBuffer(value => { commits.push(value); return ''; });
  const element = { value: 'a' };
  buffer.input(element, { inputType: 'insertText' });
  element.value = 'a'; buffer.input(element, { inputType: 'insertText' });
  element.value = 'paste'; buffer.input(element, { inputType: 'insertFromPaste' });
  assert.deepEqual(commits, ['a', 'a']);
  assert.equal(element.value, '');
});

test('a composition that finishes while paused can be consumed once when explicitly resumed', () => {
  let paused = true;
  let shots = 0;
  const buffer = createCommittedBuffer(value => { if (paused) return value; shots++; return ''; });
  const element = { value: '春天' };
  buffer.begin(); buffer.end(element);
  assert.equal(shots, 0);
  paused = false;
  buffer.flush(element);
  buffer.input(element, { inputType: 'insertText' });
  assert.equal(shots, 1);
  assert.equal(element.value, '');
});
