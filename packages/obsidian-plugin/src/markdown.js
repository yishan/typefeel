// Turns Obsidian-flavoured Markdown into the CommonMark the shared prose
// parser understands. Keep what a reader sees as prose (link labels,
// highlights, callout bodies); turn embeds into media so their paragraph is a
// boundary, and drop markup a reader never types (frontmatter, comments, tags,
// block ids, footnote markers). Pure string work: no Obsidian API.

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;

function linkLabel(inner) {
  const [target, alias] = inner.split('|');
  if (alias?.trim()) return alias.trim();
  // [[folder/Note#Heading]] reads as its note name.
  const note = target.split('#')[0].split('/').pop().trim();
  return note || target.replace(/^#+/, '').trim();
}

export function cleanObsidianMarkdown(markdown) {
  return String(markdown)
    .replace(FRONTMATTER, '')
    .replace(/%%[\s\S]*?%%/g, ' ')
    .replace(/^\s*\$\$[\s\S]*?\$\$\s*$/gm, '\n')
    .replace(/!\[\[[^\]\n]*\]\]/g, '![](embed)')
    .replace(/\[\[([^\]\n]+)\]\]/g, (_, inner) => linkLabel(inner))
    .replace(/==([^=\n]+)==/g, '$1')
    .replace(/^(\s*(?:>\s*)+)\[![^\]\n]+\][+-]?.*$/gm, '$1')
    .replace(/^\[\^[^\]\n]+\]:.*$/gm, '')
    .replace(/\[\^[^\]\n]+\]/g, '')
    .replace(/[ \t]+\^[A-Za-z0-9-]+[ \t]*$/gm, '')
    .replace(/(^|[\s(（])#(?=[\p{L}\p{N}_/-]*[\p{L}_/-])[\p{L}\p{N}_/-]+/gmu, '$1');
}
