import { registerCorpusRoutes } from './corpus-routes.js';

// Use the Host's authenticated, owner-only Fetch channel and current-profile
// session service. A click selects recent prose; unavailable history falls back
// to built-in practice in the Client.
export function apply(ctx) {
  ctx.inject(['connection'], connectionCtx => registerCorpusRoutes(connectionCtx));
}
