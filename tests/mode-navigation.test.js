import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createModeNavigation } from '../packages/practice/src/mode-navigation.js';

test('shared mode navigation exposes selected mode, localized names and composition lock', () => {
  const { Context, Navigation } = createModeNavigation(React);
  for (const language of ['zh', 'en']) {
    const html = renderToStaticMarkup(React.createElement(Context.Provider, { value: { mode: 'game', setMode() {}, language } },
      React.createElement(Navigation, { disabled: true, title: 'Pause first' })));
    assert.match(html, new RegExp(language === 'zh' ? '游戏' : 'Game'));
    assert.match(html, /aria-pressed="false"[^>]*disabled=""/);
    assert.match(html, /aria-pressed="true"[^>]*disabled=""/);
    assert.match(html, /title="Pause first"/);
  }
});
