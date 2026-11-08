import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { initialLanguage, initialTheme, createLocale } from '../apps/web/src/preferences.js';

test('web language follows the browser unless a valid local choice exists', () => {
  const empty = { getItem: () => null };
  for (const id of ['zh-CN', 'zh-TW', 'zh-HK', 'ZH']) assert.equal(initialLanguage(empty, [id]), 'zh');
  for (const id of ['en-US', 'fr', 'ja']) assert.equal(initialLanguage(empty, [id, 'zh-CN']), 'en');
  assert.equal(initialLanguage({ getItem: () => 'en' }, ['zh-CN']), 'en');
  assert.equal(initialLanguage({ getItem: () => 'zh' }, ['en-US']), 'zh');
  assert.equal(initialLanguage({ getItem: () => 'invalid' }, ['en-US']), 'en');
  assert.equal(initialLanguage({ getItem() { throw Error(); } }, ['zh-CN']), 'zh');
});

test('appearance and locale changes handle invalid storage and dispose subscriptions', () => {
  assert.equal(initialTheme({ getItem: () => 'dark' }), 'dark');
  assert.equal(initialTheme({ getItem: () => 'other' }), 'system');
  assert.equal(initialTheme({ getItem() { throw Error(); } }), 'system');
  const locale = createLocale('zh'); let count = 0;
  const dispose = locale.subscribe(() => count++);
  locale.setLanguage('en'); locale.setLanguage('en'); locale.setLanguage('invalid');
  assert.equal(locale.getLocale().active, 'en'); assert.equal(count, 1);
  dispose(); locale.setLanguage('zh'); assert.equal(count, 1);
});

test('web and plugin bundles are compiled from the same practice source, corpus, styles and engines', async () => {
  const graphs = JSON.parse(await readFile(new URL('../dist/build-inputs.json', import.meta.url), 'utf8'));
  for (const path of ['packages/practice/src/create-practice.js', 'packages/practice/src/styles.js', 'packages/practice/src/copy.js', 'data/passages.json']) {
    assert.ok(graphs.web.includes(path), `web missing ${path}`);
    assert.ok(graphs['dsh-client'].includes(path), `plugin missing ${path}`);
  }
  for (const name of ['pinyin', 'jyutping', 'audio-player']) {
    const path = `packages/practice/src/${name}.js`;
    assert.ok(graphs.web.includes(path));
    assert.ok(Object.entries(graphs).some(([key, paths]) => key.startsWith('dsh-') && paths.includes(path)));
  }
  assert.equal(graphs.web.some(path => path.includes('packages/dsh-plugin/')), false);
  assert.equal(graphs['dsh-client'].some(path => path.includes('react-dom/')), false);
});

test('static web artifact has no DSH carrier, remote CDN or local source dependency', async () => {
  const html = await readFile(new URL('../dist/web/index.html', import.meta.url), 'utf8');
  assert.match(html, /字感 · Type Feel/);
  assert.match(html, /src="\/assets\/app-[A-Z0-9]+\.js"/);
  assert.doesNotMatch(html, /(?:src|href)="https?:/);
  const files = await readdir(new URL('../dist/web/assets', import.meta.url));
  for (const file of files.filter(name => name.endsWith('.js'))) {
    const source = await readFile(new URL('../dist/web/assets/' + file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /__DSH_TRANSPORT__|__ModuleLoader__|\/api\/typing-practice\/recent|\/Users\/yishan\//);
    for (const [, dependency] of source.matchAll(/(?:from|import\()\s*["'](\.\/[^"']+)["']/g)) assert.ok(files.includes(dependency.slice(2)), `missing ${dependency}`);
  }
  const notices = await readFile(new URL('../dist/web/THIRD_PARTY_NOTICES.txt', import.meta.url), 'utf8');
  for (const library of ['react', 'react-dom', 'pinyin-pro', 'to-jyutping', 'kbsim']) assert.ok(notices.includes(library));
});

test('game code and word corpus are included only through the web entry', async () => {
  const graphs = JSON.parse(await readFile(new URL('../dist/build-inputs.json', import.meta.url), 'utf8'));
  for (const path of ['packages/practice/src/game/create-game.js', 'packages/practice/src/game/engine.js', 'data/game-words.json']) {
    assert.ok(graphs.web.includes(path), `web missing ${path}`);
    assert.equal(graphs['dsh-client'].includes(path), false, `plugin imported ${path}`);
  }
  for (const key of ['web', 'dsh-client']) assert.ok(graphs[key].includes('packages/practice/src/native-input.js'));
});
