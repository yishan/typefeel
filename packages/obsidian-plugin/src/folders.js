// Folder settings for the note corpus. Paths are vault-relative without
// slashes at either end; '' is the whole vault. Stored per vault in data.json.

export function normalizeFolder(path) {
  return String(path ?? '').trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\/+|\/+$/g, '');
}

export function inFolders(path, folders) {
  return folders.some(folder => folder === '' || path === folder || path.startsWith(folder + '/'));
}

export function parseSettings(data) {
  const folders = Array.isArray(data?.folders) ? data.folders.filter(item => typeof item === 'string').map(normalizeFolder) : [];
  return { version: 1, folders: [...new Set(folders)].sort() };
}

// A renamed folder keeps its place; renaming a parent moves its children.
export function renameFolder(folders, oldPath, newPath) {
  return [...new Set(folders.map(folder => folder === oldPath ? newPath
    : folder.startsWith(oldPath + '/') ? newPath + folder.slice(oldPath.length) : folder))].sort();
}

export function removeFolder(folders, path) {
  return folders.filter(folder => folder !== path && !folder.startsWith(path + '/'));
}
