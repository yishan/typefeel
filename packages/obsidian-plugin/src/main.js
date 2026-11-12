import { FuzzySuggestModal, ItemView, Notice, Platform, Plugin, PluginSettingTab, Scope, Setting, TFolder, getLanguage } from 'obsidian';
import { HOST_CLASS, VIEW_TYPE, commandNames, interfaceLanguage, normalizeMode, reservesGamePause } from './platform.js';
import { normalizeFolder, parseSettings, removeFolder, renameFolder } from './folders.js';

const settingsCopy = {
  zh: { name: '笔记文件夹', description: '选择"我的笔记"作为语料来源时，只读取这些文件夹（含子文件夹）里的笔记。笔记只在本机读取，不会上传。',
    add: '添加文件夹', remove: '移除', empty: '尚未选择文件夹。', root: '整个笔记库', choose: '选择用于练习的文件夹' },
  en: { name: 'Note folders', description: 'When "My notes" is the text source, only notes in these folders (and their subfolders) are read, on this device only.',
    add: 'Add folder', remove: 'Remove', empty: 'No folders selected yet.', root: 'Entire vault', choose: 'Choose a folder to practice from' },
};

class TypefeelView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.mode = 'practice';
    this.dispose = null;
    this.navigation = true;
    // Active only while this view is focused. A catch-all handler that returns
    // undefined passes every other key on to Obsidian's own scopes.
    this.scope = new Scope(this.app.scope);
    this.scope.register(null, null, event => {
      const root = this.contentEl.querySelector('.tf-game-root');
      if (reservesGamePause(event, root, root?.ownerDocument.activeElement)) return false;
    });
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return this.plugin.language === 'zh' ? '字感' : 'Type Feel'; }
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
    this.dispose = null;
    this.contentEl.empty();
    const host = this.contentEl.createDiv({ cls: HOST_CLASS });
    const { mount } = await import('./app.js');
    // The view may close or re-render while the app module is loading.
    if (!host.isConnected) return;
    this.dispose = mount(host, {
      service: this.plugin.service, mode: this.mode,
      onModeChange: mode => { this.mode = mode; this.app.workspace.requestSaveLayout(); },
    });
  }

  async onClose() {
    this.dispose?.();
    this.dispose = null;
  }
}

class FolderModal extends FuzzySuggestModal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.setPlaceholder(settingsCopy[plugin.language].choose);
  }
  getItems() {
    const selected = this.plugin.settings.folders;
    return this.app.vault.getAllFolders(true).filter(folder => !selected.includes(folder.isRoot() ? '' : folder.path));
  }
  getItemText(folder) { return folder.isRoot() ? settingsCopy[this.plugin.language].root : folder.path; }
  onChooseItem(folder) { this.plugin.addFolder(folder.isRoot() ? '' : folder.path); }
}

class TypefeelSettingTab extends PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    const t = settingsCopy[this.plugin.language];
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName(t.name).setDesc(t.description)
      .addButton(button => button.setButtonText(t.add).setCta().onClick(() => new FolderModal(this.plugin).open()));
    const folders = this.plugin.settings.folders;
    if (!folders.length) new Setting(containerEl).setDesc(t.empty);
    for (const path of folders) {
      new Setting(containerEl).setName(path === '' ? t.root : path)
        .addExtraButton(button => button.setIcon('x').setTooltip(t.remove).onClick(() => this.plugin.removeFolder(path)));
    }
  }
}

export default class TypefeelPlugin extends Plugin {
  async onload() {
    this.language = interfaceLanguage(getLanguage());
    this.settings = parseSettings(await this.loadData());
    this.listeners = new Set();
    this.service = this.createService();
    const names = commandNames[this.language];
    this.registerView(VIEW_TYPE, leaf => new TypefeelView(leaf, this));
    this.addRibbonIcon('keyboard', names.ribbon, () => this.open('practice'));
    this.addCommand({ id: 'open-practice', name: names.practice, callback: () => this.open('practice') });
    this.addCommand({ id: 'open-game', name: names.game, callback: () => this.open('game') });
    this.addCommand({ id: 'practice-selection', name: names.selection, editorCallback: (editor, info) => this.practiceSelection(editor, info) });
    this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, info) => {
      if (!editor.somethingSelected()) return;
      menu.addItem(item => item.setTitle(names.selection).setIcon('keyboard').onClick(() => this.practiceSelection(editor, info)));
    }));
    // Keep chosen folders when they are renamed; forget them when deleted.
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      if (file instanceof TFolder && this.settings.folders.some(folder => folder === oldPath || folder.startsWith(oldPath + '/'))) {
        this.saveFolders(renameFolder(this.settings.folders, oldPath, file.path));
      }
    }));
    this.registerEvent(this.app.vault.on('delete', file => {
      if (file instanceof TFolder && this.settings.folders.some(folder => folder === file.path || folder.startsWith(file.path + '/'))) {
        this.saveFolders(removeFolder(this.settings.folders, file.path));
      }
    }));
    this.settingTab = new TypefeelSettingTab(this);
    this.addSettingTab(this.settingTab);
  }

  createService() {
    const { vault } = this.app;
    const exists = path => path === '' || vault.getFolderByPath(path) != null;
    return {
      isApple: Platform.isMacOS || Platform.isIosApp,
      languageId: getLanguage(),
      listFiles: () => vault.getMarkdownFiles().map(file => ({ path: file.path, basename: file.basename, mtime: file.stat.mtime, file })),
      read: item => vault.cachedRead(item.file),
      folders: {
        list: () => this.settings.folders.filter(exists),
        available: () => vault.getAllFolders(true).map(folder => folder.isRoot() ? '' : folder.path).sort(),
        resolve: path => { const folder = normalizeFolder(path); return exists(folder) ? folder : null; },
        add: path => this.addFolder(path),
        remove: path => this.removeFolder(path),
        subscribe: listener => { this.listeners.add(listener); return () => this.listeners.delete(listener); },
      },
    };
  }

  addFolder(path) {
    return this.saveFolders([...this.settings.folders, normalizeFolder(path)]);
  }

  removeFolder(path) {
    return this.saveFolders(this.settings.folders.filter(folder => folder !== path));
  }

  async saveFolders(folders) {
    this.settings = parseSettings({ folders });
    for (const listener of this.listeners) listener();
    if (this.settingTab.containerEl.isConnected) this.settingTab.display();
    try { await this.saveData(this.settings); return true; } catch { return false; }
  }

  async practiceSelection(editor, info) {
    const names = commandNames[this.language];
    const selection = editor.getSelection();
    if (!selection.trim()) { new Notice(names.noSelection); return; }
    const { selectionRequest, handOver } = await import('./app.js');
    const request = await selectionRequest(selection, info?.file);
    if (!request) { new Notice(names.unsuitable); return; }
    await this.open('practice');
    handOver(this.service, request);
  }

  // Reuse an open Type Feel tab; otherwise open one in the main area.
  async open(mode) {
    const { workspace } = this.app;
    const leaf = workspace.getLeavesOfType(VIEW_TYPE)[0] ?? workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW_TYPE, active: true, state: { mode } });
    await workspace.revealLeaf(leaf);
  }
}
