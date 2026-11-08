export function initialLanguage(storage, languages = []) {
  try { const saved = storage.getItem('typefeel.language'); if (saved === 'zh' || saved === 'en') return saved; } catch { /* Use browser preference. */ }
  return String(languages[0] || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function initialTheme(storage) {
  try { const saved = storage.getItem('typefeel.theme'); if (['light', 'dark', 'system'].includes(saved)) return saved; } catch { /* Use system preference. */ }
  return 'system';
}

export function createLocale(language) {
  const listeners = new Set();
  return {
    getLocale: () => ({ active: language }),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    setLanguage(next) {
      if (!['zh', 'en'].includes(next) || next === language) return;
      language = next;
      for (const listener of listeners) listener();
    },
  };
}
