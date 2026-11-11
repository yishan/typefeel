import { ItemView, Plugin, getLanguage } from 'obsidian';
import { HOST_CLASS, VIEW_TYPE, commandNames, interfaceLanguage, normalizeMode } from './platform.js';

class TypefeelView extends ItemView {
  constructor(leaf) {
    super(leaf);
    this.mode = 'practice';
    this.dispose = null;
    this.navigation = true;
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return interfaceLanguage(getLanguage()) === 'zh' ? '字感' : 'Type Feel'; }
  getIcon() { return 'keyboard'; }
  getState() { return { ...super.getState(), mode: this.mode }; }

  async setState(state, result) {
    const mode = normalizeMode(state?.mode);
    const changed = mode !== this.mode;
    this.mode = mode;
    await super.setState(state, result);
    if (changed && this.dispose) await this.render();
  }

  async onOpen() { await this.render(); }

  async render() {
    this.dispose?.();
    this.contentEl.empty();
    const host = this.contentEl.createDiv({ cls: HOST_CLASS });
    const { mount } = await import('./app.js');
    // The view may close while the app module is loading.
    if (!host.isConnected) return;
    this.dispose = mount(host, {
      languageId: getLanguage(), mode: this.mode,
      onModeChange: mode => { this.mode = mode; this.app.workspace.requestSaveLayout(); },
    });
  }

  async onClose() {
    this.dispose?.();
    this.dispose = null;
  }
}

export default class TypefeelPlugin extends Plugin {
  async onload() {
    const names = commandNames[interfaceLanguage(getLanguage())];
    this.registerView(VIEW_TYPE, leaf => new TypefeelView(leaf));
    this.addRibbonIcon('keyboard', names.ribbon, () => this.open('practice'));
    this.addCommand({ id: 'open-practice', name: names.practice, callback: () => this.open('practice') });
    this.addCommand({ id: 'open-game', name: names.game, callback: () => this.open('game') });
  }

  // Reuse an open Type Feel tab; otherwise open one in the main area.
  async open(mode) {
    const { workspace } = this.app;
    const leaf = workspace.getLeavesOfType(VIEW_TYPE)[0] ?? workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW_TYPE, active: true, state: { mode } });
    await workspace.revealLeaf(leaf);
  }
}
