// Layout for hosts that embed Type Feel in a resizable pane (DSH panel,
// Obsidian tab). Sizes follow the pane width, not the window.
export function containedLayout(id) {
  return `.tp-root[data-platform="${id}"] { container: typefeel / inline-size; min-height: 0; }
.tp-root[data-platform="${id}"] .tp-header { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; }
.tp-root[data-platform="${id}"] .tp-brand { min-width: 0; }
.tp-root[data-platform="${id}"] .tf-mode-switch { justify-self: center; align-self: center; flex: none; margin: 0; }
.tp-root[data-platform="${id}"] .tf-mode-switch .tp-seg-btn { min-height: 34px; padding-inline: 13px; }
.tp-root[data-platform="${id}"] .tf-mode-switch .tp-seg-btn:disabled { cursor: default; opacity: .55; }
.tp-root[data-platform="${id}"] .tp-header-actions { justify-self: end; justify-content: flex-end; min-width: 0; max-width: 100%; }
@container typefeel (max-width: 800px) {
  .tp-root[data-platform="${id}"] .tp-header { position: relative; display: flex; flex-wrap: wrap; padding-top: 52px; }
  .tp-root[data-platform="${id}"] .tf-mode-switch { position: absolute; top: 0; left: 50%; transform: translateX(-50%); }
}
@container typefeel (max-width: 600px) {
  .tp-root[data-platform="${id}"] .tf-game-page { padding-inline: 20px; gap: 16px; }
  .tp-root.tf-game-root[data-platform="${id}"] .tp-brandtext { display: none; }
  .tp-root[data-platform="${id}"] .tf-game-progress { gap: 16px; }
}
`;
}
