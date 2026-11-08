# Type Feel / 字感

The authoritative practice source is `packages/practice/src`. Both the web app
and DSH plugin build from it. Do not copy shared behavior into either adapter.

- `apps/web`: static browser shell, branding, appearance and interface language.
- `packages/dsh-plugin`: DSH module, slots, theme, shortcuts and local conversations.
- `data/passages.json`: original corpus, 96 passages per language.
- `dist`: generated output; never edit or commit it.

Preserve the immersive layout and native IME behavior. Web shortcuts are Escape
only; DSH keeps its existing Cmd/Ctrl shortcuts. Never read DSH conversations
from the standalone website. Keep the DSH storage keys and module identity
stable so installed users retain preferences and records.

Before delivery run `npm run build` and `npm test`. Browser-check the affected
input flows and responsive views. Unit tests do not prove native IME candidate
placement. Do not publish npm or update the distribution repo without a release
request. `npm run export:plugin -- /new/staging/path` builds, tests and records
the source revision without changing the existing distribution repository.
