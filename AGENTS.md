# Type Feel / 字感

The authoritative practice source is `packages/practice/src`. The web app, DSH
plugin and Obsidian plugin all build from it. Do not copy shared behavior into
any adapter.

- `apps/web`: static browser shell, branding, appearance and interface language.
- `packages/dsh-plugin`: DSH module, slots, theme, shortcuts and local conversations.
- `packages/obsidian-plugin`: Obsidian view, commands, theme, view scope and the
  folder-scoped note corpus. Design: `docs/plans/2026-11-11-obsidian-plugin-design.md`.
- `data/passages.json`: original corpus, 96 passages per language.
- `dist`: generated output; never edit or commit it.

Preserve the immersive layout and native IME behavior. Web practice shortcuts
are Escape only; the web game pauses with Escape or Cmd/Ctrl+P. DSH keeps its
existing Cmd/Ctrl shortcuts. Obsidian follows the web set; its view scope keeps
Cmd/Ctrl+P from the command palette only while a focused game is running or
counting down, and the plugin registers no default hotkeys. Never read DSH
conversations from the standalone website or Obsidian. Obsidian reads notes only
from folders the user chose. Keep the DSH storage keys and module identity
stable so installed users retain preferences and records; likewise the Obsidian
plugin id `typefeel` and its `typefeel.obsidian` storage prefix. When adding an
Obsidian API call, check its `@since` against `minAppVersion` (1.8.7).

Before delivery run `npm run build` and `npm test`. Browser-check the affected
input flows and responsive views. Unit tests do not prove native IME candidate
placement. Do not publish npm, update a distribution repo or create a release
without a release request. `npm run export:plugin -- /new/staging/path` (DSH)
and `npm run export:obsidian -- /new/staging/path` (`yishan/typefeel-obsidian`)
build, test and record the source revision without changing any existing
distribution repository.
