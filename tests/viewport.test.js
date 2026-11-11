import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../packages/practice/src/create-practice.js', import.meta.url), 'utf8');
// Exercise the shipped geometry helpers. Real CSS line wrapping, masking and
// input anchoring are checked in the browser fixture, not emulated here.
const helpers = source.slice(source.indexOf('    function revealCaret('), source.indexOf('    const TextBoard'));
const context = vm.createContext({ window: { getComputedStyle: viewport => ({ lineHeight: String(viewport.lineHeight) }), innerHeight: 800, innerWidth: 1024 } });
vm.runInContext(helpers, context);

function scene(lineHeight = 38.85, rows = 20) {
  const state = { row: 0, glyphOffset: 0, scroll: 0, top: 100, outerScrolls: 0, writes: 0 };
  const first = { getBoundingClientRect: () => ({ top: state.top + lineHeight - state.scroll }) };
  const anchor = { getBoundingClientRect: () => ({ left: 150, top: state.top + (state.row + 1) * lineHeight - state.scroll + state.glyphOffset,
    bottom: state.top + (state.row + 1) * lineHeight - state.scroll + state.glyphOffset + 24, height: 24 }) };
  const viewport = {
    lineHeight, parentElement: { scrollIntoView() { state.outerScrolls++; } },
    getBoundingClientRect: () => ({ left: 100, right: 900, top: state.top, bottom: state.top + 6 * lineHeight }),
    querySelector: selector => selector === '[data-input-anchor]' ? anchor : selector === '.tp-char' ? first : null,
    get scrollTop() { return state.scroll; },
    set scrollTop(value) { state.writes++; state.scroll = Math.max(0, Math.min((rows - 1) * lineHeight, value)); },
  };
  return { viewport, state, anchor };
}

test('every wrapped row occupies the same position, including first, last and reverse traversal', () => {
  for (const height of [38.85, 56.7, 48.6]) {
    const { viewport, state, anchor } = scene(height);
    for (const row of [0, 1, 2, 12, 19, 18, 4, 0]) {
      state.row = row;
      context.revealCaret(viewport);
      assert.ok(Math.abs(viewport.scrollTop - row * height) < .001);
      assert.ok(Math.abs(anchor.getBoundingClientRect().top - (state.top + height)) < .001);
    }
    assert.equal(state.outerScrolls, 0);
  }
});

test('Latin/ruby glyph offsets within a row do not jitter or repeatedly scroll the viewport', () => {
  const { viewport, state } = scene(56.7);
  state.row = 3; context.revealCaret(viewport);
  const writes = state.writes, offset = viewport.scrollTop;
  for (const delta of [-4, -.25, 0, 2, 5]) {
    state.glyphOffset = delta; context.revealCaret(viewport);
    assert.equal(viewport.scrollTop, offset);
  }
  assert.equal(state.writes, writes);
});

test('reflow and a fresh run reset the tracked row without retaining a stale scroll offset', () => {
  const { viewport, state } = scene();
  state.row = 10; context.revealCaret(viewport);
  state.row = 4; context.revealCaret(viewport);
  assert.ok(Math.abs(viewport.scrollTop - 4 * 38.85) < .001);
  state.row = 0; context.revealCaret(viewport); assert.equal(viewport.scrollTop, 0);
  viewport.lineHeight = 'normal'; assert.doesNotThrow(() => context.revealCaret(viewport));
  assert.doesNotThrow(() => context.revealCaret(null));
});

// A position: fixed element whose containing block starts at `offset`: the
// viewport on the website, a contained pane in DSH and Obsidian.
function fixedElement(offset = { left: 0, top: 0 }) {
  const style = {};
  return { style, getBoundingClientRect: () => ({ left: parseFloat(style.left) + offset.left, top: parseFloat(style.top) + offset.top }) };
}

test('the native IME input and composition preview follow the pinned visual anchor', () => {
  const { viewport, state, anchor } = scene(56.7);
  const input = fixedElement(), preview = fixedElement();
  for (const row of [0, 1, 19, 8]) {
    state.row = row; context.revealCaret(viewport); context.positionInput(viewport, input, preview);
    assert.equal(parseFloat(input.style.top), anchor.getBoundingClientRect().top);
    assert.equal(parseFloat(input.style.left), anchor.getBoundingClientRect().left);
    assert.equal(parseFloat(preview.style.top), anchor.getBoundingClientRect().top + 26);
  }
});

test('the IME anchor stays at the caret when a contained pane is the containing block', () => {
  const { viewport, state, anchor } = scene(56.7);
  const offset = { left: 270, top: 60 };
  const input = fixedElement(offset), preview = fixedElement(offset);
  for (const row of [0, 3, 8]) {
    state.row = row; context.revealCaret(viewport); context.positionInput(viewport, input, preview);
    assert.deepEqual(input.getBoundingClientRect(), { left: anchor.getBoundingClientRect().left, top: anchor.getBoundingClientRect().top });
    assert.equal(preview.getBoundingClientRect().top, anchor.getBoundingClientRect().top + 26);
  }
});

test('focus leaves a visible region still and reveals clipped context only when needed', () => {
  const { viewport, state } = scene();
  context.revealInputRegion(viewport); assert.equal(state.outerScrolls, 0);
  state.top = 800; context.revealInputRegion(viewport); assert.equal(state.outerScrolls, 1);
  state.top = -100; context.revealInputRegion(viewport); assert.equal(state.outerScrolls, 2);
  assert.doesNotThrow(() => context.revealInputRegion(null));
});


test('a clipped DSH host reveals future rows even when the current line is still visible', () => {
  const { viewport, state } = scene(56.7);
  viewport.closest = () => ({ getBoundingClientRect: () => ({ top: 50, bottom: 320 }) });
  state.top = 220;
  context.revealInputRegion(viewport);
  // The six-row region cannot fit this host; retain the visible current row.
  assert.equal(state.outerScrolls, 0);
  viewport.closest = () => ({ getBoundingClientRect: () => ({ top: 50, bottom: 600 }) });
  state.top = 300;
  context.revealInputRegion(viewport);
  // Here all rows can fit, so reveal the clipped future context on focus.
  assert.equal(state.outerScrolls, 1);
});

test('focus reveals clipped context using the scrollable region instead of full root bounds', () => {
  const { viewport, state } = scene(56.7);
  viewport.closest = selector => ({ getBoundingClientRect: () => ({ top: 50, bottom: selector === '.tp-scroll' ? 500 : 600 }) });
  state.top = 200;
  context.revealInputRegion(viewport);
  assert.equal(state.outerScrolls, 1);
});
