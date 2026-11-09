import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createGamePage } from '../packages/practice/src/game/create-game.js';

test('DSH game renders bundled branding, isolated best score and settings without web interface controls', () => {
  const previous = globalThis.window;
  globalThis.window = {};
  try {
    const data = new Map([
      ['dsh.typing-practice.game.records.v1', JSON.stringify({ version: 1, rulesVersion: 2, wordsVersion: 1, best: 123, history: [] })],
      ['dsh.typing-practice.sound.v1', JSON.stringify({ version: 1, pack: 'holypanda', volume: 55 })],
    ]);
    const Page = createGamePage(React, { id: 'dsh', brandIconUrl: 'data:image/svg+xml,test-brand',
      recordsKey: 'dsh.typing-practice.game.records.v1',
      audioKeys: { effects: 'dsh.typing-practice.game.audio.v1', keyboard: 'dsh.typing-practice.sound.v1' } });
    const html = renderToStaticMarkup(React.createElement(Page, { language: 'en', storage: { getItem: key => data.get(key) } }));
    assert.match(html, /data-platform="dsh"/);
    assert.match(html, /src="data:image\/svg\+xml,test-brand"/);
    assert.doesNotMatch(html, /\/brand\/icons\/|Interface language/);
    assert.match(html, /Best 123/);
    assert.match(html, /Game sounds/);
    assert.match(html, /Keyboard sounds/);
    assert.match(html, /value="holypanda" selected=""/);
    assert.match(html, /aria-valuetext="55%"/);
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
});
