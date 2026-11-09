export const SOUND_PACKS = ['off', 'mxblue', 'mxbrown', 'cream', 'holypanda'];

export function soundPreference(saved) {
  return { version: 1, pack: saved?.version === 1 && SOUND_PACKS.includes(saved.pack) ? saved.pack : 'off',
    volume: saved?.version === 1 && Number.isFinite(saved.volume) ? Math.max(0, Math.min(100, Math.round(saved.volume))) : 30 };
}

export function keySoundKind(event, input = event, activeComposition = false) {
  if (event.repeat || input.repeat || event.ctrlKey || event.metaKey || event.altKey) return null;
  const key = event.key;
  const composing = activeComposition || input.isComposing || event.isComposing || input.keyCode === 229;
  if (!(key?.length === 1 || ['Backspace', 'Delete', 'Process', 'Unidentified'].includes(key) || key === 'Enter' && composing)) return null;
  return key === ' ' || input.code === 'Space' ? 'space' : key === 'Backspace' || key === 'Delete' ? 'backspace' : key === 'Enter' ? 'enter' : 'generic';
}
