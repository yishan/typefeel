import assert from 'node:assert/strict';
import test from 'node:test';
import * as gameShortcuts from '../packages/practice/src/game/shortcuts.js';
const { handleGamePauseShortcut } = gameShortcuts;

function shortcut(input, overrides = {}) {
  let prevented = false;
  let paused = 0;
  const event = { ...input, preventDefault() { prevented = true; } };
  const handled = handleGamePauseShortcut(event, { status: 'running', composing: false, inside: true, dialogOpen: false,
    pause() { paused++; }, ...overrides });
  return { prevented, paused, handled };
}

test('Escape, Ctrl+P and Cmd+P pause without restarting or opening print', () => {
  for (const input of [{ key: 'Escape' }, { key: 'p', ctrlKey: true }, { key: 'p', metaKey: true }, { key: 'π', code: 'KeyP', metaKey: true }]) {
    assert.deepEqual(shortcut(input), { prevented: true, paused: 1, handled: true });
  }
});

test('pause shortcuts also pause a countdown and stay paused on repeated explicit presses', () => {
  assert.equal(shortcut({ key: 'Escape' }, { status: 'countdown' }).paused, 1);
  assert.deepEqual(shortcut({ key: 'p', ctrlKey: true }, { status: 'paused' }), { prevented: true, paused: 1, handled: true });
});

test('IME composition, dialogs, outside editors and inactive rounds retain native shortcuts', () => {
  for (const state of [{ composing: true }, { dialogOpen: true }, { inside: false }, { status: 'ready' }, { status: 'ended' }]) {
    for (const input of [{ key: 'Escape' }, { key: 'p', ctrlKey: true }, { key: 'p', metaKey: true }]) {
      assert.deepEqual(shortcut(input, state), { prevented: false, paused: 0, handled: false });
    }
  }
  for (const extra of [{ isComposing: true }, { keyCode: 229 }]) {
    assert.equal(shortcut({ key: 'Escape', ...extra }).handled, false);
  }
});

test('holding a pause shortcut suppresses native print repeats without repeatedly pausing', () => {
  for (const input of [{ key: 'Escape' }, { key: 'p', ctrlKey: true }, { key: 'p', metaKey: true }]) {
    assert.deepEqual(shortcut({ ...input, repeat: true }), { prevented: true, paused: 0, handled: true });
  }
});

test('extra modifiers and unrelated keys do not become game shortcuts', () => {
  for (const input of [{ key: 'p' }, { key: 'Escape', ctrlKey: true }, { key: 'p', ctrlKey: true, shiftKey: true },
    { key: 'p', metaKey: true, altKey: true }, { key: 'p', ctrlKey: true, metaKey: true }, { key: 'r', ctrlKey: true }]) {
    assert.equal(shortcut(input).handled, false);
  }
});

test('DSH reserves its native pause chord and returns a cleanup that restores the host binding', () => {
  assert.equal(typeof gameShortcuts.reserveGamePauseShortcut, 'function');
  for (const apple of [false, true]) {
    let command; let released = 0;
    const cleanup = gameShortcuts.reserveGamePauseShortcut({ registerFixed(value) { command = value; return () => released++; } }, apple, '暂停');
    assert.equal(command.id, 'typing-practice.game.pause');
    assert.deepEqual(command.bindings, [{ code: 'KeyP', modifiers: [apple ? 'meta' : 'control'] }]);
    assert.equal(command.label(), '暂停');
    cleanup(); assert.equal(released, 1);
  }
  assert.doesNotThrow(() => gameShortcuts.reserveGamePauseShortcut(undefined, false, 'Pause')?.());
});
