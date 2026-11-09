const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function characters(text) {
  return Array.from(segmenter.segment(text), part => part.segment);
}

// Compare the native buffer rather than appending event.data. Both adapters
// must preserve selection replacements, cancellation and multi-codepoint text.
export function textEdit(previous, value, limit = Infinity) {
  const before = characters(previous);
  const after = characters(value).slice(0, limit);
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length;
  let newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) { oldEnd--; newEnd--; }
  return { before, after, start, oldEnd, newEnd, inserted: after.slice(start, newEnd), changed: start !== oldEnd || start !== newEnd };
}

// Consuming a game word can clear the DOM buffer. Keep that reconciliation
// separate from scoring, and never rewrite the DOM during active composition.
export function createCommittedBuffer(commit) {
  let value = '';
  let composing = false;
  let trailing = null;
  function accept(element) {
    const source = element.value;
    if (!textEdit(value, source).changed) return;
    value = commit(source);
    if (element.value !== value) element.value = value;
    return { source, value };
  }
  return {
    get composing() { return composing; },
    begin() { composing = true; trailing = null; },
    end(element) {
      if (!composing) return;
      composing = false;
      trailing = accept(element) || null;
    },
    flush(element) {
      if (composing) return;
      value = commit(element.value);
      element.value = value;
      trailing = null;
    },
    input(element, event = {}) {
      if (composing || event.isComposing) { composing = true; return; }
      if (['insertFromPaste', 'insertFromDrop', 'insertFromYank'].includes(event.inputType)) { element.value = value; return; }
      if (trailing && /Composition/.test(event.inputType || '') && element.value === trailing.source) {
        element.value = value; trailing = null; return;
      }
      trailing = null;
      accept(element);
    },
  };
}
