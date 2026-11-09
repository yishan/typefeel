// The carrier owns the selected mode and any URL integration.
export function createModeNavigation(React) {
  const Context = React.createContext(null);
  function Navigation({ disabled, title }) {
    const { mode, setMode, language } = React.useContext(Context);
    const zh = language === 'zh';
    return React.createElement('nav', { className: 'tp-seg tf-mode-switch', 'aria-label': zh ? '模式' : 'Mode' },
      ...[['practice', zh ? '练习' : 'Practice'], ['game', zh ? '游戏' : 'Game']].map(([id, label]) =>
        React.createElement('button', { key: id, className: 'tp-seg-btn' + (mode === id ? ' active' : ''), type: 'button',
          'aria-pressed': mode === id, disabled, title: disabled ? title : undefined, onClick: () => setMode(id) }, label)));
  }
  return { Context, Navigation };
}
