import { CURSOR_GLOW } from '../cursor-style.js';

export const CSS = `
.tf-game-root { min-height: 0; --tp-cursor-color: var(--tf-brand-primary); }
.tf-game-root .tp-scroll { overflow-y: auto; scrollbar-gutter: auto; }
.tf-game-root .tf-game-page { height: 100%; min-height: 0; gap: 20px; padding-bottom: 16px; }
.tf-game-root .tp-header { align-items: center; flex-wrap: nowrap; gap: 12px; }
.tf-game-root .tp-brand { flex: 1 1 auto; min-width: 42px; }
.tf-game-root .tp-logo { flex: 0 0 42px; aspect-ratio: 1; }
.tf-game-root .tp-logo img { width: 100%; height: 100%; object-fit: contain; }
.tf-game-root .tp-header-actions { flex-wrap: nowrap; gap: 8px; }
.tf-game-stats { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 12px; padding: 4px 0 8px; font-variant-numeric: tabular-nums; }
.tf-game-progress { display: flex; gap: 32px; min-width: 0; }
.tf-game-health { align-items: center; }
.tf-game-score { text-align: right; }
.tf-game-stat { display: flex; flex-direction: column; gap: 2px; }
.tf-game-stat-label { color: var(--tf-label-secondary); font-size: 12px; }
.tf-game-stat-value { font-family: var(--tp-font-mono); font-size: 26px; line-height: 1.2; font-weight: 500; }
.tf-game-score .tf-game-stat-value { color: var(--tf-brand-primary); }
.tf-game-lives { display: flex; align-items: center; gap: 6px; height: 31px; }
.tf-game-life { display: block; width: 4px; height: 20px; border-radius: 2px; background: var(--tf-brand-primary); transition: background 160ms ease; }
.tf-game-life[data-lost="true"] { background: var(--tf-border-l1); }
.tf-game-lives[data-low="true"] .tf-game-life:not([data-lost="true"]) { background: var(--tf-state-error-primary); }
.tf-game-stage { position: relative; isolation: isolate; flex: 1; min-height: 180px; overflow: hidden; border-bottom: 1px solid var(--tf-border-l2); cursor: text; }
.tf-game-stage[data-miss="true"] { border-bottom-color: var(--tf-state-error-primary); }
.tf-game-target { position: absolute; top: 0; left: 0; white-space: nowrap; font-size: clamp(24px, 3vw, 30px); line-height: 1.25; letter-spacing: .08em; font-weight: 450; will-change: transform; }
.tf-game-target[data-danger="true"] { color: var(--tf-state-error-primary); }
.tf-game-target[data-hit="true"] { color: var(--tf-brand-primary); animation: tf-game-hit 160ms ease-out both; }
.tf-game-shot, .tf-game-emitter { pointer-events: none; width: 3px; border-radius: 2px; background: var(--tp-cursor-color); ${CURSOR_GLOW} }
.tf-game-shot { position: absolute; top: 0; left: 0; height: 18px; transform-origin: center; will-change: transform; }
.tf-game-emitter { height: 22px; margin: 0 auto 8px; }
.tf-game-dock { position: relative; flex: none; text-align: center; }
.tf-game-input { display: block; resize: none; width: min(100%, 340px); height: 45px; margin: 0 auto; border: 0; border-bottom: 1px solid transparent; border-radius: 0; outline: none; background: transparent; padding: 8px 12px; text-align: center; font: inherit; font-size: 20px; line-height: 28px; color: var(--tf-label-primary); caret-color: var(--tf-brand-primary); overflow: hidden; white-space: pre; }
.tf-game-input::placeholder { color: var(--tf-label-secondary); font-size: 15px; }
.tf-game-input:focus { border-bottom-color: var(--tf-border-l1); }
.tf-game-input[aria-invalid="true"] { color: var(--tf-state-error-primary); border-bottom-color: var(--tf-state-error-primary); }
.tf-game-hint { min-height: 18px; margin: 5px 0 0; font-size: 12px; color: var(--tf-label-secondary); }
.tf-game-hint[data-error="true"] { color: var(--tf-state-error-primary); }
.tf-game-footer { display: flex; flex: none; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; font-size: 12px; color: var(--tf-label-secondary); font-variant-numeric: tabular-nums; }
.tf-game-summary { margin-inline-start: auto; white-space: nowrap; }
.tf-game-overlay { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 18px; padding: 16px; text-align: center; background: var(--tf-bg-base); }
.tf-game-overlay h2 { margin: 0; font-size: 30px; font-weight: 550; letter-spacing: -.035em; }
.tf-game-overlay p { margin: 0; max-width: 340px; font-size: 14px; color: var(--tf-label-secondary); line-height: 1.8; }
.tf-game-overlay .tf-game-countdown { font-size: 64px; font-weight: 400; color: var(--tf-brand-primary); font-family: var(--tp-font-mono); }
.tf-game-primary { justify-content: center; background: var(--tf-brand-primary); color: var(--tf-on-brand, #fff); border-color: transparent; min-width: 120px; }
.tf-game-primary:hover { filter: brightness(1.08); background: var(--tf-brand-primary); }
.tf-game-result-score { font-size: 50px; line-height: 1; font-weight: 450; color: var(--tf-brand-primary); font-family: var(--tp-font-mono); }
.tf-game-result-stats { display: flex; justify-content: center; gap: 28px; }
.tf-game-result-stats .tf-game-stat-value { font-size: 21px; }
.tf-game-settings { max-width: 480px; width: calc(100% - 40px); max-height: 85svh; overflow-y: auto; border: 1px solid var(--tf-border-l1); border-radius: 12px; color: var(--tf-label-primary); background: var(--tf-bg-base); padding: 24px; }
.tf-game-rules p { margin: 0 0 10px; color: var(--tf-label-secondary); font-size: 13px; line-height: 1.7; }
.tf-game-settings::backdrop { background: #0005; }
.tf-game-settings-header { position: sticky; top: -24px; z-index: 1; display: flex; align-items: center; justify-content: space-between; margin: -24px -24px 4px; padding: 12px 16px 8px 24px; background: var(--tf-bg-base); }
.tf-game-settings-header h2 { margin: 0; font-size: 16px; font-weight: 650; }
.tf-game-settings-header button { display: grid; place-items: center; width: 36px; height: 36px; padding: 0; }
.tf-game-audio-section { display: grid; gap: 10px; padding-bottom: 12px; }
.tf-game-audio-heading { display: flex; align-items: center; gap: 8px; }
.tf-game-audio-heading h3 { flex: 1; margin: 0; }
.tf-game-audio-heading .tp-btn { min-height: 32px; padding: 4px 8px; }
.tf-game-audio-status { margin: 0; min-height: 18px; color: var(--tf-label-secondary); font-size: 12px; }
.tf-game-audio-status + .tp-settings-section { border-top: 1px solid var(--tf-border-l1); padding-top: 12px; }
.tf-game-rules { margin-top: 12px; }
@keyframes tf-game-hit { to { opacity: 0; filter: blur(3px); } }
@media (max-width: 600px) {
  .tf-game-root .tf-game-page { padding-inline: 20px; gap: 16px; }
  .tf-game-root .tp-brandtext { display: none; }
  .tf-game-root .tp-brand { flex: 0 0 auto; min-width: 32px; }
  .tf-game-root .tp-logo { width: 32px; height: 32px; flex-basis: 32px; border-radius: 9px; }
  .tf-game-root .tf-mode-switch { margin-inline: auto; }
  .tf-game-root .tf-mode-switch .tp-seg-btn { min-width: 0; padding-inline: 8px; font-size: 12px; }
  .tf-game-progress { gap: 16px; }
  .tf-game-root .tp-header-actions .tp-btn { padding-inline: 8px; }
  .tf-game-stat-value { font-size: 23px; }
  .tf-game-target { font-size: 25px; }
}
@media (max-width: 360px) { .tf-game-root .tp-header { flex-wrap: wrap; gap: 8px; } .tf-game-root .tp-header-actions { margin-inline-start: auto; } }
.tf-game-root[data-compact="true"] .tf-game-page { padding-top: 12px !important; padding-bottom: 8px !important; gap: 8px !important; }
.tf-game-root[data-compact="true"] .tp-subtitle { display: none; }
.tf-game-root[data-compact="true"] .tf-game-stage { min-height: 70px; }
.tf-game-root[data-compact="true"] .tf-game-stats { padding: 0; }
.tf-game-root[data-compact="true"] .tf-game-emitter { height: 14px; margin-bottom: 2px; }
.tf-game-root[data-compact="true"] .tf-game-overlay { gap: 8px; padding: 4px; }
.tf-game-root[data-compact="true"] .tf-game-overlay h2 { font-size: 22px; }
.tf-game-root[data-compact="true"] .tf-game-overlay p { font-size: 12px; }
.tf-game-root[data-compact="true"] .tf-game-result-score { font-size: 30px; }
.tf-game-root[data-compact="true"] .tf-game-result-stats { gap: 18px; }
@media (prefers-reduced-motion: reduce) {
  .tf-game-target[data-hit="true"] { animation: none; opacity: .5; }
  .tf-game-shot { opacity: .35; }
  .tf-game-life { transition: none; }
}
`;
