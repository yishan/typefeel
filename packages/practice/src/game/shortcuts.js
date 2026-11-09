export function handleGamePauseShortcut(event, { status, composing, inside, dialogOpen, pause }) {
  const escape = event.key === 'Escape' && !event.metaKey && !event.ctrlKey;
  const print = (event.key?.toLowerCase() === 'p' || event.code === 'KeyP') && Boolean(event.metaKey) !== Boolean(event.ctrlKey);
  if ((!escape && !print) || event.altKey || event.shiftKey
    || composing || event.isComposing || event.keyCode === 229 || dialogOpen || !inside
    || !['running', 'countdown', 'paused'].includes(status)) return false;
  event.preventDefault();
  if (!event.repeat) pause();
  return true;
}

// DSH desktop handles native chords before DOM keydown. Reserve the binding
// while the game is mounted, as the practice adapter does for its fixed chords.
export function reserveGamePauseShortcut(shortcuts, apple, label) {
  return shortcuts?.registerFixed?.({
    id: 'typing-practice.game.pause', label: () => label,
    keys: [apple ? '⌘' : 'Ctrl', 'P'],
    bindings: [{ code: 'KeyP', modifiers: [apple ? 'meta' : 'control'] }], group: 'application',
  });
}
