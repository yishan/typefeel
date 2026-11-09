import { CURSOR_GLOW } from './cursor-style.js';

export const CSS = `
.tp-root {
  position: relative;
  isolation: isolate;
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--tf-bg-base);
  color: var(--tf-label-primary);
  font-size: 13px;
  line-height: 1.5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.tp-root, .tp-root * { box-sizing: border-box; }
.tp-panel-spark { stroke: var(--tf-brand-primary); }
.tp-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; scrollbar-gutter: stable both-edges; }
.tp-page {
  width: 100%;
  max-width: 880px;
  min-height: 100%;
  margin: 0 auto;
  padding: 26px 30px max(32px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tp-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.tp-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tp-brand { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1 1 340px; }
.tp-logo { width: 42px; height: 42px; border-radius: 12px; flex: none; display: grid; place-items: center; background: var(--tf-bg-layer-2); border: 1px solid var(--tf-border-l1); color: var(--tf-brand-primary); pointer-events: none; user-select: none; }
.tp-brandtext { min-width: 0; }
.tp-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: -0.015em;
}
.tp-subtitle {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--tf-label-secondary);
}
.tp-best {
  flex: none;
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--tf-border-l1);
  border-radius: 999px;
  background: var(--tf-bg-layer-1);
  color: var(--tf-label-secondary);
  font-size: 12px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.tp-toolbar {
  margin-top: auto;
  padding-top: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.tp-practice-options { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; min-width: 0; }
.tp-seg.tp-practice-controls { display: flex; align-items: stretch; max-width: 100%; gap: 8px; }
.tp-language { display: grid; grid-template-columns: repeat(3, minmax(44px, max-content)); gap: 2px; }
.tp-exercise { display: flex; gap: 10px; padding-left: 9px; border-left: 1px solid var(--tf-border-l1); }
.tp-option-group { position: relative; }
.tp-preset-group { display: grid; grid-template-columns: repeat(3, minmax(44px, max-content)); gap: 2px; }
.tp-preset-group + .tp-preset-group::before { content: ''; position: absolute; left: -6px; top: 10px; bottom: 10px; border-left: 1px solid var(--tf-border-l1); }
.tp-exercise .tp-seg-btn { position: relative; padding-inline: 12px; white-space: nowrap; }
.tp-seg {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--tf-bg-layer-1);
  border: 1px solid var(--tf-border-l1);
  border-radius: 10px;
}
.tp-seg-btn {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--tf-label-secondary);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  min-height: 44px;
  min-width: 44px;
  padding: 0 14px;
  border-radius: 7px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.tp-seg-btn.active {
  background: var(--tf-bg-layer-2);
  color: var(--tf-label-primary);
}
.tp-select { position: relative; display: inline-flex; }
.tp-records-filter select, .tp-sound-field select {
  appearance: none;
  -webkit-appearance: none;
  min-height: 44px;
  max-width: 100%;
  padding: 0 36px 0 12px;
  border: 1px solid var(--tf-border-l1);
  border-radius: 8px;
  background: var(--tf-bg-layer-1);
  color: var(--tf-label-primary);
  font: inherit;
  cursor: pointer;
}
.tp-select-chevron { position: absolute; right: 12px; top: 50%; width: 12px; height: 12px; transform: translateY(-50%); pointer-events: none; }
.tp-records-filter select:focus-visible, .tp-sound-field select:focus-visible { outline: 2px solid var(--tf-label-primary); outline-offset: 3px; }
.tp-annotation-status { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; color: var(--tf-label-secondary); }
.tp-corpus-controls { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; max-width: 100%; }
.tp-corpus-status { display: grid; min-width: 0; min-height: 36px; align-items: center; text-align: center; font-size: 11.5px; line-height: 18px; color: var(--tf-label-secondary); }
.tp-corpus-status > *, .tp-instructions > * { grid-area: 1 / 1; margin: 0; overflow-wrap: anywhere; }
.tp-status-size { visibility: hidden; pointer-events: none; user-select: none; }
.tp-corpus-name { font-variant-numeric: tabular-nums; }
.tp-corpus-controls .tp-seg-btn { padding: 0 10px; }
.tp-btn.tp-corpus-next { display: grid; justify-items: center; }
.tp-corpus-next > * { grid-area: 1 / 1; }
.tp-corpus-note { margin: 0; font-size: 12px; color: var(--tf-label-secondary); overflow-wrap: anywhere; }
.tp-corpus-note:empty { pointer-events: none; }
.tp-stats {
  width: 100%;
  margin: 16px 0 -2px;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.tp-stat {
  min-width: 0;
  padding: 11px 0 12px;
  text-align: center;
}
.tp-stat-label {
  font-size: 11.5px;
  color: var(--tf-label-secondary);
}
.tp-stat-value {
  margin-top: 2px;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 650;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.tp-stat.accent .tp-stat-value { color: var(--tf-brand-primary); }
.tp-stat-unit {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--tf-label-secondary);
}
.tp-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  background: transparent;
  border: 0;
}
.tp-timebar {
  height: 2px;
  border-radius: 999px;
  background: transparent;
  overflow: hidden;
}
.tp-timebar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--tf-brand-primary);
  transition: width 120ms linear;
}
.tp-board-wrap { position: relative; cursor: text; }
.tp-card:focus-within .tp-focus-hint { color: var(--tf-label-primary); text-decoration: underline; text-underline-offset: 3px; }
.tp-seg-btn:focus-visible, .tp-btn:focus-visible {
  outline: 2px solid var(--tf-label-primary);
  outline-offset: 3px;
}
.tp-viewport {
  --tp-row: 1.85em;
  --tp-viewport-mask: linear-gradient(to bottom, transparent, rgba(0,0,0,.45) calc(.5 * var(--tp-row)),
    #000 var(--tp-row), #000 calc(4 * var(--tp-row)), rgba(0,0,0,.42) calc(5 * var(--tp-row)), transparent calc(6 * var(--tp-row)));
  /* One faded history row, current + two clear rows, then two fading rows. */
  margin-inline: -16px;
  padding-inline: 16px;
  height: calc(6 * var(--tp-row));
  overflow: hidden;
  overflow-anchor: none;
  scroll-behavior: auto;
  -webkit-mask-image: var(--tp-viewport-mask);
  mask-image: var(--tp-viewport-mask);
  font-size: 21px;
  line-height: 1.85;
}
.tp-board {
  /* Lead/trailing room keeps the current row pinned at the start AND end. */
  padding: var(--tp-row) 2px calc(4 * var(--tp-row));
  white-space: pre-wrap;
  overflow-wrap: break-word;
  font-family: var(--tp-font-mono);
  font-size: inherit;
  line-height: inherit;
  letter-spacing: 0.3px;
  user-select: none;
}
.tp-char { color: var(--tf-label-secondary); }
.tp-char.tp-latin { font-family: var(--tp-font-mono); letter-spacing: 0.3px; }
.tp-char.correct { color: var(--tf-label-primary); }
.tp-char.wrong {
  color: var(--tf-state-error-primary);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
.tp-root {
  --tp-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --tp-cursor-color: var(--tf-brand-primary-new-colorprimary-new-color, #4176e6);
}
.tp-char.caret { position: relative; }
.tp-char.caret::before {
  content: '';
  position: absolute;
  pointer-events: none;
  box-sizing: border-box;
  left: -1px;
  top: 0;
  width: 3px;
  height: 100%;
  min-height: 1em;
  border-radius: 2px;
  background: var(--tp-cursor-color);
}
.tp-root[data-cursor-shape="underline"] .tp-char.caret::before {
  left: 0; top: auto; bottom: -2px; width: 100%; min-width: .6em; height: 3px; min-height: 0;
}
.tp-root[data-cursor-shape="outline"] .tp-char.caret::before {
  left: -1px; width: calc(100% + 2px); min-width: .6em; background: transparent; border: 2px solid var(--tp-cursor-color); border-radius: 3px;
}
.tp-root[data-cursor-glow="true"] .tp-char.caret::before {
  ${CURSOR_GLOW}
}
@keyframes tp-cursor-blink { 0%, 45%, 100% { opacity: 1; } 65%, 85% { opacity: .2; } }
.tp-root[data-cursor-blink="true"] .tp-char.caret::before { animation: tp-cursor-blink 1.2s ease-in-out infinite; }
.tp-board-wrap:not(:focus-within) .tp-char.caret::before { opacity: .4; box-shadow: none; animation: none; }
.tp-board-wrap.tp-composing .tp-char.caret::before { animation: none; }
.tp-input {
  position: fixed;
  top: 0;
  left: 0;
  width: 2px;
  height: 24px;
  margin: 0;
  padding: 0;
  border: 0;
  resize: none;
  overflow: hidden;
  pointer-events: none;
  background: transparent;
  color: transparent;
  caret-color: transparent;
  cursor: text;
  font-size: 16px;
  line-height: 24px;
}
/* The blue caret and focus hint show focus; the IME anchor stays invisible. */
.tp-input:focus { outline: none; }
.tp-ime .tp-viewport { --tp-row: 2.7em; line-height: 2.7; }
.tp-ime .tp-board { font-family: inherit; letter-spacing: 0.1em; }
.tp-annotated .tp-board { letter-spacing: 0; }
.tp-ruby { ruby-align: center; margin-inline: 0.12em; line-height: 1; }
.tp-ruby .tp-char { display: inline-block; min-width: 1em; text-align: center; line-height: 1.2; }
.tp-ruby rt {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1;
  color: var(--tf-label-secondary);
  user-select: none;
}
.tp-ruby rt.tp-reading-hidden { visibility: hidden; }
.tp-ruby rt.tp-shuangpin { font-family: var(--tp-font-mono); }
.tp-composition {
  position: fixed;
  z-index: 2;
  max-width: min(360px, calc(100vw - 24px));
  padding: 1px 4px;
  border-bottom: 2px solid var(--tf-brand-primary);
  background: var(--tf-bg-layer-1);
  color: var(--tf-label-primary);
  font-size: 14px;
  line-height: 20px;
  overflow-wrap: anywhere;
  pointer-events: none;
}
.tp-save-error { color: var(--tf-state-error-primary); }
.tp-focus-hint {
  color: var(--tf-label-secondary);
  font-size: 11.5px;
}
.tp-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 0;
}
.tp-result-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}
.tp-record {
  padding: 1px 8px;
  border: 1px solid var(--tf-state-success-primary);
  border-radius: 999px;
  color: var(--tf-state-success-primary);
  font-size: 11px;
  font-weight: 600;
}
.tp-result-grid {
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
}
.tp-comparison { flex-basis: 100%; margin: 0; font-size: 12px; color: var(--tf-label-secondary); }
.tp-result-item { min-width: 60px; }
.tp-result-label {
  font-size: 11px;
  color: var(--tf-label-secondary);
}
.tp-result-value {
  font-size: 20px;
  line-height: 1.2;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.tp-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: center; gap: 16px; }
.tp-run-actions { display: flex; align-items: center; justify-self: end; gap: 8px; }
.tp-action { position: relative; display: inline-flex; }
.tp-shortcut-tip { position: absolute; left: 50%; bottom: calc(100% + 8px); z-index: 10; padding: 5px 9px; border: 1px solid var(--tf-border-l1); border-radius: 6px; background: var(--tf-bg-layer-2); color: var(--tf-label-primary); font-size: 11.5px; white-space: nowrap; visibility: hidden; opacity: 0; transform: translate(-50%, 4px); pointer-events: none; transition: opacity 120ms ease-out, transform 120ms ease-out, visibility 120ms; }
.tp-action .tp-btn:focus-visible + .tp-shortcut-tip { visibility: visible; opacity: 1; transform: translate(-50%, 0); transition: none; }
.tp-option-group:has(.tp-seg-btn:focus-visible) > .tp-shortcut-tip { visibility: visible; opacity: 1; transform: translate(-50%, 0); transition: none; }
.tp-instructions { display: grid; min-width: 0; flex: 1; font-size: 11.5px; line-height: 18px; }
.tp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;
  padding: 0 14px;
  border: 1px solid var(--tf-border-l1);
  border-radius: 8px;
  background: var(--tf-bg-layer-1);
  color: var(--tf-label-primary);
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;
}
.tp-seg-btn, .tp-btn, .tp-input { touch-action: manipulation; }
@media (hover: hover) and (pointer: fine) {
  .tp-seg-btn:hover { color: var(--tf-label-primary); background: var(--tf-bg-layer-2); }
  .tp-btn:hover {
    background: var(--tf-bg-layer-2);
    border-color: var(--tf-border-l2);
  }
}
.tp-btn.primary {
  border-color: var(--tf-brand-primary);
  color: var(--tf-brand-primary);
  font-weight: 600;
}
.tp-btn:disabled { opacity: .45; cursor: not-allowed; }
.tp-btn.tp-quiet { background: transparent; border-color: transparent; }
@media (hover: hover) and (pointer: fine) {
  .tp-btn.tp-quiet:hover:not(:disabled) { background: var(--tf-bg-layer-1); border-color: var(--tf-border-l2); }
  .tp-action:hover .tp-shortcut-tip { visibility: visible; opacity: 1; transform: translate(-50%, 0); }
  .tp-option-group:hover > .tp-shortcut-tip { visibility: visible; opacity: 1; transform: translate(-50%, 0); }
}
.tp-btn.tp-quiet:active:not(:disabled) { background: var(--tf-bg-layer-2); }
.tp-toast-layer { position: absolute; inset: 12px 0 auto; height: 0; z-index: 20; display: flex; justify-content: center; pointer-events: none; }
.tp-toast { max-width: min(560px, calc(100% - 28px)); height: fit-content; margin: 0; padding: 10px 16px; border: 1px solid var(--tf-border-l1); border-radius: 10px; background: var(--tf-bg-layer-2); color: var(--tf-label-primary); box-shadow: 0 4px 18px rgb(0 0 0 / .12); font-size: 12.5px; animation: tp-toast-in 220ms cubic-bezier(.32,.72,0,1), tp-toast-out 160ms 2840ms ease-out forwards; }
@keyframes tp-toast-in { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tp-toast-out { to { opacity: 0; transform: translateY(-6px); } }
.tp-records-dialog { width: min(760px, calc(100vw - 32px)); height: min(680px, calc(100vh - 32px)); max-height: calc(100vh - 32px); padding: 0; margin: auto; border: 1px solid var(--tf-border-l1); border-radius: 14px; color: var(--tf-label-primary); background: var(--tf-bg-base); font: inherit; }
.tp-records-dialog[open] { display: flex; flex-direction: column; }
.tp-records-dialog::backdrop { background: rgb(0 0 0 / .35); }
.tp-records-header, .tp-records-toolbar, .tp-records-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 12px 20px; flex: none; }
.tp-records-header h2 { margin: 0; font-size: 18px; }
.tp-btn.tp-dialog-close { width: 44px; height: 44px; padding: 0; flex: none; justify-content: center; border-radius: 10px; }
.tp-dialog-close svg { display: block; width: 24px; height: 24px; pointer-events: none; }
.tp-records-toolbar { padding-top: 0; border-bottom: 1px solid var(--tf-border-l1); }
.tp-records-body { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 0 20px; }
.tp-records-footer { border-top: 1px solid var(--tf-border-l1); }
.tp-records-footer p { margin: 0; flex: 1 1 240px; color: var(--tf-label-secondary); font-size: 12px; }
.tp-record-list { padding: 0; margin: 0; list-style: none; }
.tp-record-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--tf-border-l1); font-variant-numeric: tabular-nums; }
.tp-record-row:last-child { border-bottom: 0; }
.tp-record-title { margin: 0; font-weight: 500; }
.tp-record-meta, .tp-record-detail { margin: 5px 0 0; color: var(--tf-label-secondary); font-size: 12px; overflow-wrap: anywhere; }
.tp-record-score { text-align: right; }
.tp-record-speed { font-size: 21px; font-weight: 600; }
.tp-record-unit { margin-left: 4px; font-size: 11.5px; color: var(--tf-label-secondary); }
.tp-record-link { min-height: 44px; padding: 0; margin: 0; background: transparent; border: 0; color: var(--tf-label-primary); font: inherit; font-size: 12px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.tp-record-link:focus-visible { outline: 2px solid var(--tf-label-primary); outline-offset: 3px; }
.tp-record-link:disabled { opacity: .45; cursor: not-allowed; }
.tp-records-context { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 10px; }
.tp-records-empty { padding: 48px 16px; text-align: center; color: var(--tf-label-secondary); }
.tp-records-legacy { margin: 22px 0 0; font-size: 13px; font-weight: 500; color: var(--tf-label-secondary); }
.tp-clear-confirm { padding: 32px 0; max-width: 480px; }
.tp-clear-confirm h3 { margin-top: 0; }
.tp-clear-confirm p { color: var(--tf-label-secondary); }
.tp-clear-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 24px; }
.tp-settings-dialog { width: min(520px, calc(100vw - 32px)); height: fit-content; }
.tp-settings-content { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 4px 20px 24px; display: grid; gap: 12px; }
.tp-settings-section { min-width: 0; }
.tp-settings-section + .tp-settings-section, .tp-settings-note { border-top: 1px solid var(--tf-border-l1); padding-top: 12px; }
.tp-settings-section h3 { margin: 0 0 12px; font-size: 13px; font-weight: 650; }
.tp-settings-note { margin: 0; color: var(--tf-label-secondary); font-size: 12px; line-height: 1.7; }
.tp-sound-body { display: grid; gap: 12px; min-width: 0; }
.tp-sound-field { display: grid; grid-template-columns: 100px minmax(0, 1fr); align-items: center; gap: 16px; margin: 0; font-size: 13px; min-width: 0; }
.tp-sound-field .tp-select, .tp-sound-field select { width: 100%; min-width: 0; }
.tp-sound-picker { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; }
.tp-sound-volume { display: flex; align-items: center; gap: 16px; }
.tp-sound-volume input { flex: 1; min-width: 0; min-height: 44px; margin: 0; accent-color: var(--tf-label-primary); }
.tp-sound-volume output { width: 4ch; text-align: right; font-variant-numeric: tabular-nums; }
.tp-sound-status { display: grid; margin: 0; color: var(--tf-label-secondary); font-size: 12px; line-height: 18px; }
.tp-hint-status[data-empty="true"], .tp-cursor-status[data-empty="true"] { display: none; }
.tp-pinyin-formats { width: fit-content; max-width: 100%; }
.tp-pinyin-formats .tp-seg-btn { padding-inline: 10px; }
.tp-pinyin-controls .tp-sound-field { grid-template-columns: 64px minmax(0, 1fr); gap: 12px; }
.tp-pinyin-preview { display: flex; justify-content: center; align-items: center; gap: 6px; min-width: 0; font-size: 24px; }
.tp-pinyin-note { margin: 0; color: var(--tf-label-secondary); font-size: 12px; line-height: 1.7; }
.tp-sound-field:has(select:disabled) { opacity: .5; }
.tp-sound-status > span { grid-area: 1 / 1; }
.tp-sound-credit { font-size: 11px; color: var(--tf-label-secondary); text-underline-offset: 3px; }
.tp-cursor-layout, .tp-pinyin-layout { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 24px; align-items: stretch; }
.tp-cursor-controls, .tp-pinyin-controls { display: grid; gap: 12px; min-width: 0; }
.tp-cursor-controls .tp-sound-field { grid-template-columns: 48px minmax(0, 1fr); gap: 12px; }
.tp-cursor-preview { display: flex; justify-content: center; align-items: center; min-width: 0; margin: 0; border-radius: 8px; background: var(--tf-bg-layer-2); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 26px; line-height: 1.25; }
.tp-cursor-preview-text { white-space: pre; }
.tp-cursor-toggles { display: grid; gap: 12px; }
.tp-cursor-toggle { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 44px; font-size: 13px; cursor: pointer; }
.tp-cursor-toggle input { appearance: none; flex: none; position: relative; width: 36px; height: 22px; margin: 0; border: 1px solid var(--tf-border-l1); border-radius: 999px; background: var(--tf-bg-layer-3); cursor: pointer; }
.tp-cursor-toggle input::before { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--tf-label-primary); transition: transform 150ms ease-out; }
.tp-cursor-toggle input:checked { background: var(--tf-label-primary); }
.tp-cursor-toggle input:checked::before { background: var(--tf-bg-base); transform: translateX(14px); }
.tp-cursor-toggle input:focus-visible { outline: 2px solid var(--tf-label-primary); outline-offset: 3px; }
.tp-foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11.5px;
  color: var(--tf-label-secondary);
}
@media (max-width: 720px) {
  .tp-page { padding: 18px 14px max(32px, env(safe-area-inset-bottom)); }
  .tp-title { font-size: 18px; }
  .tp-stats { gap: 8px; }
  .tp-stat-value { font-size: 22px; }
  .tp-viewport { font-size: 18px; }
  .tp-records-header, .tp-records-toolbar, .tp-records-footer { padding-left: 14px; padding-right: 14px; }
  .tp-records-body { padding: 0 14px; }
}
@media (max-width: 680px) {
  .tp-practice-options { width: 100%; }
  .tp-seg.tp-practice-controls { flex-direction: column; width: 100%; gap: 3px; }
  .tp-language { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .tp-exercise { flex-direction: column; gap: 2px; padding: 3px 0 0; border-left: 0; border-top: 1px solid var(--tf-border-l1); }
  .tp-preset-group { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .tp-preset-group + .tp-preset-group::before { content: none; }
}
@media (max-width: 680px) {
  .tp-actions { grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; }
  .tp-instructions { grid-column: 1; grid-row: 1; }
  .tp-run-actions { grid-column: 2; grid-row: 1; }
  .tp-corpus-status { grid-column: 1 / -1; grid-row: 2; }
}
@media (max-width: 480px) {
  .tp-actions { grid-template-columns: minmax(0, 1fr); }
  .tp-instructions { grid-column: 1; grid-row: 1; }
  .tp-corpus-status { grid-column: 1; grid-row: 2; min-height: 18px; }
  .tp-run-actions { grid-column: 1; grid-row: 3; margin-top: 36px; }
  .tp-settings-content { padding-inline: 14px; }
  .tp-sound-field { grid-template-columns: minmax(0, 1fr); gap: 6px; }
  .tp-sound-picker { align-items: end; }
  .tp-cursor-layout, .tp-pinyin-layout { grid-template-columns: minmax(0, 1fr) minmax(96px, .7fr); gap: 16px; }
  .tp-cursor-controls .tp-sound-field, .tp-pinyin-controls .tp-sound-field { grid-template-columns: minmax(0, 1fr); gap: 6px; }
  .tp-pinyin-formats { flex-wrap: wrap; }
  .tp-cursor-preview { font-size: 22px; }
}
@media (prefers-reduced-motion: reduce) {
  .tp-seg-btn, .tp-timebar-fill { transition: none; }
  .tp-root[data-cursor-blink] .tp-char.caret::before { animation: none; }
  .tp-cursor-toggle input::before { transition: none; }
  .tp-shortcut-tip { transition: none; transform: translate(-50%, 0); }
  .tp-toast { animation: none; }
}
`;
