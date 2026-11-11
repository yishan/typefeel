import { containedLayout } from '../../practice/src/host-layout.js';
import { scopeCSS } from './scope-css.js';
import { HOST_CLASS } from './platform.js';

// Follow the user's Obsidian theme, light or dark, including community themes.
export const obsidianTheme = `.tp-root[data-platform="obsidian"] {
  --tf-bg-base: var(--background-primary);
  --tf-bg-layer-1: var(--background-secondary);
  --tf-bg-layer-2: var(--interactive-normal);
  --tf-bg-layer-3: var(--background-modifier-hover);
  --tf-border-l1: var(--background-modifier-border);
  --tf-border-l2: var(--background-modifier-border-hover);
  --tf-brand-primary: var(--interactive-accent);
  --tf-on-brand: var(--text-on-accent);
  --tf-brand-primary-new-colorprimary-new-color: var(--interactive-accent);
  --tf-label-primary: var(--text-normal);
  --tf-label-secondary: var(--text-muted);
  --tf-state-error-primary: var(--text-error);
  --tf-state-success-primary: var(--text-success);
}
/* Obsidian outlines focused fields and shades buttons with box-shadow; the
   shared pages never use box-shadow on controls, so remove it everywhere. */
.tp-root[data-platform="obsidian"] :is(button, input, select, textarea),
.tp-root[data-platform="obsidian"] :is(button, input, select, textarea):is(:focus, :active, :hover) { box-shadow: none; }
/* Obsidian draws a checkmark on checkboxes and paints its slider track as the
   input background, which fills the shared 44px touch target. Use the native
   controls the website shows. */
.tp-root[data-platform="obsidian"] input::after { content: none; display: none; }
.tp-root[data-platform="obsidian"] input[type="range"] { appearance: auto; background: transparent; border-radius: 0; }
.tp-root[data-platform="obsidian"] input[type="range"]::-webkit-slider-runnable-track { appearance: auto; height: auto; }
.tp-root[data-platform="obsidian"] input[type="range"]::-webkit-slider-thumb { appearance: auto; }
${containedLayout('obsidian')}`;

// styles.css: the shared page styles and this theme, scoped to the view host.
export function obsidianStyles(sharedCSS) {
  return `.workspace-leaf-content[data-type="typefeel"] > .view-content { padding: 0; overflow: hidden; }
.${HOST_CLASS} { height: 100%; }
${scopeCSS(sharedCSS + obsidianTheme, '.' + HOST_CLASS)}`;
}
