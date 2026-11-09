export const hostTheme = `.tp-root {
  --tf-bg-base: var(--dsw-alias-bg-base);
  --tf-bg-layer-1: var(--dsw-alias-bg-layer-1);
  --tf-bg-layer-2: var(--dsw-alias-bg-layer-2);
  --tf-bg-layer-3: var(--dsw-alias-bg-layer-3);
  --tf-border-l1: var(--dsw-alias-border-l1);
  --tf-border-l2: var(--dsw-alias-border-l2);
  --tf-brand-primary: var(--dsw-alias-brand-primary);
  --tf-on-brand: var(--dsw-alias-label-primary-foreground, #fff);
  --tf-brand-primary-new-colorprimary-new-color: var(--dsw-alias-brand-primary-new-colorprimary-new-color);
  --tf-label-primary: var(--dsw-alias-label-primary);
  --tf-label-secondary: var(--dsw-alias-label-secondary);
  --tf-state-error-primary: var(--dsw-alias-state-error-primary);
  --tf-state-success-primary: var(--dsw-alias-state-success-primary);
}
.tp-settings-website { border-top: 0; padding-top: 0; }
.tp-settings-website a { color: var(--tf-label-primary); text-decoration: underline; text-underline-offset: 3px; }
.tp-root[data-platform="dsh"] { container: typefeel / inline-size; min-height: 0; }
.tp-root[data-platform="dsh"] .tp-header { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; }
.tp-root[data-platform="dsh"] .tp-brand { min-width: 0; }
.tp-root[data-platform="dsh"] .tf-mode-switch { justify-self: center; align-self: center; flex: none; margin: 0; }
.tp-root[data-platform="dsh"] .tf-mode-switch .tp-seg-btn { min-height: 34px; padding-inline: 13px; }
.tp-root[data-platform="dsh"] .tf-mode-switch .tp-seg-btn:disabled { cursor: default; opacity: .55; }
.tp-root[data-platform="dsh"] .tp-header-actions { justify-self: end; justify-content: flex-end; min-width: 0; max-width: 100%; }
@container typefeel (max-width: 800px) {
  .tp-root[data-platform="dsh"] .tp-header { position: relative; display: flex; flex-wrap: wrap; padding-top: 52px; }
  .tp-root[data-platform="dsh"] .tf-mode-switch { position: absolute; top: 0; left: 50%; transform: translateX(-50%); }
}
@container typefeel (max-width: 600px) {
  .tp-root[data-platform="dsh"] .tf-game-page { padding-inline: 20px; gap: 16px; }
  .tp-root.tf-game-root[data-platform="dsh"] .tp-brandtext { display: none; }
  .tp-root[data-platform="dsh"] .tf-game-progress { gap: 16px; }
}
`;
