import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { CSS as practiceCSS } from '../packages/practice/src/styles.js';
import { CSS as gameCSS } from '../packages/practice/src/game/styles.js';
import { hostTheme } from '../packages/dsh-plugin/src/theme.js';
import { obsidianTheme, obsidianStyles } from '../packages/obsidian-plugin/src/theme.js';
import { scopeCSS } from '../packages/obsidian-plugin/src/scope-css.js';
import { containedLayout } from '../packages/practice/src/host-layout.js';
import * as platform from '../packages/obsidian-plugin/src/platform.js';

const dist = fileURLToPath(new URL('../dist/obsidian-plugin/', import.meta.url));
const source = fileURLToPath(new URL('../packages/obsidian-plugin/', import.meta.url));

// A minimal stand-in for Obsidian's module: records what the plugin registers.
function loadPlugin(code, language = 'zh', data = null) {
  const registered = { views: [], commands: [], ribbons: [], events: [], settingTabs: [] };
  class Component { registerEvent(ref) { registered.events.push(ref); } }
  class ItemView extends Component { constructor(leaf) { super(); this.leaf = leaf; } getState() { return {}; } async setState() {} }
  class Plugin extends Component {
    constructor() {
      super();
      const on = (target, name) => `${target}:${name}`;
      this.app = { workspace: { on: name => on('workspace', name) }, vault: { on: name => on('vault', name) } };
    }
    registerView(type, create) { registered.views.push({ type, create }); }
    addCommand(command) { registered.commands.push(command); return command; }
    addRibbonIcon(icon, title, callback) { registered.ribbons.push({ icon, title, callback }); }
    addSettingTab(tab) { registered.settingTabs.push(tab); }
    async loadData() { return data; }
  }
  class PluginSettingTab { constructor(app, plugin) { this.app = app; this.plugin = plugin; this.containerEl = {}; } }
  class FuzzySuggestModal {}
  class Setting {}
  class Notice {}
  class TFolder {}
  const obsidian = { ItemView, Plugin, PluginSettingTab, FuzzySuggestModal, Setting, Notice, TFolder, getLanguage: () => language };
  const module = { exports: {} };
  const context = { module, exports: module.exports, require: name => {
    assert.equal(name, 'obsidian', `unexpected runtime require: ${name}`);
    return obsidian;
  } };
  vm.runInNewContext(code, context);
  return { Plugin: module.exports.default, registered };
}

test('Obsidian package ships the three installable files with a valid manifest', async () => {
  const manifest = JSON.parse(await readFile(dist + 'manifest.json', 'utf8'));
  assert.deepEqual(manifest, JSON.parse(await readFile(source + 'manifest.json', 'utf8')));
  assert.equal(manifest.id, 'typefeel');
  assert.ok(!/obsidian/i.test(manifest.id), 'Obsidian rejects plugin ids that contain "obsidian"');
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.minAppVersion, '1.8.7', 'getLanguage() requires Obsidian 1.8.7');
  assert.equal(manifest.isDesktopOnly, false);
  const css = await readFile(dist + 'styles.css', 'utf8');
  assert.ok(css.endsWith(obsidianStyles(practiceCSS + gameCSS)));
});

test('loading the Obsidian plugin evaluates only the shell and registers a view, ribbon and commands', async () => {
  const code = await readFile(dist + 'main.js', 'utf8');
  // No window or document here: the React app must not run until a view opens.
  const { Plugin, registered } = loadPlugin(code, 'zh-TW', { folders: ['/Notes/', 'Notes', 7] });
  const plugin = new Plugin();
  await plugin.onload();
  assert.deepEqual(registered.views.map(view => view.type), [platform.VIEW_TYPE]);
  assert.deepEqual(registered.commands.map(command => command.id), ['open-practice', 'open-game', 'practice-selection']);
  assert.ok(registered.commands.every(command => !command.hotkeys), 'community plugins must not set default hotkeys');
  assert.deepEqual(registered.commands.map(command => command.name),
    [platform.commandNames.zh.practice, platform.commandNames.zh.game, platform.commandNames.zh.selection]);
  assert.equal(typeof registered.commands[2].editorCallback, 'function', 'selection practice needs an editor');
  assert.deepEqual(registered.events, ['workspace:editor-menu', 'vault:rename', 'vault:delete']);
  assert.equal(registered.settingTabs.length, 1);
  assert.deepEqual({ ...plugin.settings, folders: [...plugin.settings.folders] }, { version: 1, folders: ['Notes'] });
  assert.deepEqual(registered.ribbons.map(ribbon => [ribbon.icon, ribbon.title]), [['keyboard', platform.commandNames.zh.ribbon]]);
  const view = registered.views[0].create({});
  assert.equal(view.getViewType(), platform.VIEW_TYPE);
  assert.equal(view.getDisplayText(), '字感');
  assert.deepEqual({ ...view.getState() }, { mode: 'practice' });
});

test('Obsidian interface languages map to Chinese or English', () => {
  for (const id of ['zh', 'zh-TW', 'ZH']) assert.equal(platform.interfaceLanguage(id), 'zh');
  for (const id of ['en', 'ja', 'de', '', undefined]) assert.equal(platform.interfaceLanguage(id), 'en');
  const locale = platform.createObsidianLocale('zh-TW');
  assert.equal(locale.getLocale().active, 'zh');
  assert.equal(typeof locale.subscribe(() => {}), 'function');
});

test('Obsidian storage keys are separate from the website and DSH', () => {
  const practice = platform.practiceOptions({});
  const game = platform.gameOptions({});
  assert.equal(practice.storagePrefix, 'typefeel.obsidian');
  assert.equal(practice.fullShortcuts, false, 'practice keeps the web shortcut set: Escape only');
  assert.equal(game.recordsKey, 'typefeel.obsidian.game.records.v1');
  assert.deepEqual(game.audioKeys, { effects: 'typefeel.obsidian.game.audio.v1', keyboard: 'typefeel.obsidian.sound.v1' });
  assert.equal(game.layout, 'container');
  assert.equal(platform.normalizeMode('game'), 'game');
  assert.equal(platform.normalizeMode('other'), 'practice');
});

test('DSH and Obsidian share the pane layout', () => {
  assert.ok(hostTheme.endsWith(containedLayout('dsh')));
  assert.ok(obsidianTheme.endsWith(containedLayout('obsidian')));
});

test('no other build pulls in Obsidian adapter code', async () => {
  const graphs = JSON.parse(await readFile(fileURLToPath(new URL('../dist/build-inputs.json', import.meta.url)), 'utf8'));
  for (const [target, inputs] of Object.entries(graphs)) {
    if (target !== 'obsidian') assert.ok(!inputs.some(path => path.includes('packages/obsidian-plugin/')), target);
  }
  assert.ok(!graphs.obsidian.some(path => /packages\/dsh-plugin\/|apps\/web\//.test(path)));
});

test('Obsidian styles scope every shared rule to the view host without touching keyframes', () => {
  const css = scopeCSS(`/* note */ .a, .b:is(.c, .d) { color: red; }
@media (max-width: 600px) { .a { color: blue; } }
@keyframes spin { from { opacity: 0; } to { opacity: 1; } }`, '.h');
  assert.equal(css, `.h .a, .h .b:is(.c, .d) { color: red; }
@media (max-width: 600px) {
.h .a { color: blue; }
}
@keyframes spin { from { opacity: 0; } to { opacity: 1; } }
`);
  assert.throws(() => scopeCSS('@font-face { font-family: x; }', '.h'), /Unsupported at-rule/);
  const shipped = obsidianStyles(practiceCSS + gameCSS);
  const selectors = shipped.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '').match(/[^{}]+(?=\{)/g)
    .map(selector => selector.trim()).filter(selector => selector && !selector.startsWith('@'));
  const unscoped = selectors.filter(selector => !selector.split(/,\s*(?![^()]*\))/).every(part => part.startsWith('.typefeel-host')));
  assert.deepEqual(unscoped, ['.workspace-leaf-content[data-type="typefeel"] > .view-content']);
});
