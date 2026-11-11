// Obsidian styles bare elements (`button:not(.clickable-icon)`, inputs,
// selects) with more specificity than the shared single-class rules. Prefixing
// every shared selector with the view's host class adds one class to all of
// them alike, so their order among themselves is unchanged and they win over
// Obsidian's element rules. Used at build time on our own CSS only.

function matchingBrace(css, open) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return i;
  }
  throw new Error('Unbalanced CSS braces');
}

function splitSelectors(selector) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    if (selector[i] === '(') depth++;
    else if (selector[i] === ')') depth--;
    else if (selector[i] === ',' && depth === 0) { parts.push(selector.slice(start, i)); start = i + 1; }
  }
  parts.push(selector.slice(start));
  return parts.map(part => part.trim()).filter(Boolean);
}

export function scopeCSS(css, scope) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '';
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) {
      if (css.slice(i).trim()) throw new Error('Unexpected CSS outside a rule');
      break;
    }
    const prelude = css.slice(i, open).trim();
    const close = matchingBrace(css, open);
    const body = css.slice(open + 1, close);
    if (prelude.startsWith('@keyframes')) out += `${prelude} {${body}}\n`;
    else if (prelude.startsWith('@media') || prelude.startsWith('@container') || prelude.startsWith('@supports')) {
      out += `${prelude} {\n${scopeCSS(body, scope)}}\n`;
    } else if (prelude.startsWith('@')) throw new Error(`Unsupported at-rule: ${prelude}`);
    else out += `${splitSelectors(prelude).map(selector => `${scope} ${selector}`).join(', ')} {${body}}\n`;
    i = close + 1;
  }
  return out;
}
