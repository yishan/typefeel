// "My notes" section of the practice settings dialog. The dialog is modal, so
// Obsidian modals would open behind it; a native input with a datalist
// suggests the vault's folders instead.

const copy = {
  zh: { title: '笔记语料', hint: '选择"我的笔记"作为语料来源时，只读取这些文件夹（含子文件夹）里的笔记。',
    empty: '尚未选择文件夹。', label: '添加文件夹', placeholder: '输入或选择文件夹', add: '添加', remove: '移除',
    root: '整个笔记库', missing: '找不到这个文件夹。', saveError: '文件夹设置未能保存。' },
  en: { title: 'My notes', hint: 'When "My notes" is the text source, only notes in these folders (and their subfolders) are read.',
    empty: 'No folders selected yet.', label: 'Add folder', placeholder: 'Type or choose a folder', add: 'Add', remove: 'Remove',
    root: 'Entire vault', missing: 'That folder does not exist.', saveError: 'Folder settings could not be saved.' },
};

export function createFolderSettings(React, folders) {
  const h = React.createElement;
  return function FolderSettings({ language }) {
    const t = copy[language] || copy.zh;
    const [selected, setSelected] = React.useState(folders.list);
    const [draft, setDraft] = React.useState('');
    const [error, setError] = React.useState(null);
    React.useEffect(() => folders.subscribe(() => setSelected(folders.list())), []);
    const label = path => path === '' ? t.root : path;
    async function add(event) {
      event.preventDefault();
      const path = folders.resolve(draft);
      if (path == null) { setError('missing'); return; }
      setError(null);
      setError(await folders.add(path) ? null : 'saveError');
      setDraft('');
    }
    async function remove(path) { setError(await folders.remove(path) ? null : 'saveError'); }
    return h('section', { className: 'tp-settings-section tf-folders', 'aria-labelledby': 'tf-folders-title' },
      h('h3', { id: 'tf-folders-title' }, t.title),
      h('p', { className: 'tf-folders-hint' }, t.hint),
      selected.length
        ? h('ul', { className: 'tf-folder-list' }, ...selected.map(path => h('li', { key: path },
          h('span', { className: 'tf-folder-path' }, label(path)),
          h('button', { type: 'button', className: 'tp-btn tp-quiet', 'aria-label': `${t.remove} ${label(path)}`, onClick: () => remove(path) }, t.remove))))
        : h('p', { className: 'tf-folders-empty' }, t.empty),
      h('form', { className: 'tf-folder-add', onSubmit: add },
        h('label', { className: 'tp-sound-field' }, h('span', null, t.label),
          h('input', { className: 'tf-folder-input', list: 'tf-folder-options', value: draft, placeholder: t.placeholder,
            spellCheck: false, autoComplete: 'off', onChange: event => { setDraft(event.currentTarget.value); setError(null); } })),
        h('datalist', { id: 'tf-folder-options' }, ...folders.available().filter(path => !selected.includes(path))
          .map(path => h('option', { key: path, value: path === '' ? '/' : path }))),
        h('button', { type: 'submit', className: 'tp-btn', disabled: !draft.trim() }, t.add)),
      error ? h('p', { className: 'tp-save-error', role: 'status' }, t[error]) : null);
  };
}
