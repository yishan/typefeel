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
