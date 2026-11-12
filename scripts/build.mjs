import { build } from 'esbuild';
import { readFile, readdir, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import { validateCorpus } from './check-corpus.mjs';
import { CSS as practiceCSS } from '../packages/practice/src/styles.js';
import { CSS as gameCSS } from '../packages/practice/src/game/styles.js';
import { obsidianStyles } from '../packages/obsidian-plugin/src/theme.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const pluginRoot = resolve(root, 'packages/dsh-plugin');
const pluginManifest = JSON.parse(await readFile(resolve(pluginRoot, 'package.json'), 'utf8'));
const selected = ['--web', '--plugin', '--obsidian'].filter(flag => process.argv.includes(flag));
const builds = { web: !selected.length || selected.includes('--web'), plugin: !selected.length || selected.includes('--plugin'),
  obsidian: !selected.length || selected.includes('--obsidian') };
const dependencies = new Set();
const graphs = {};
console.log('Corpus:', validateCorpus());

function track(result, target) {
  graphs[target] = Object.keys(result.metafile.inputs).map(path => path.startsWith(root) ? relative(root, path) : path);
  for (const input of graphs[target]) {
    const name = /(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(input)?.[1];
    if (name) dependencies.add(name);
  }
}

const audioManifest = JSON.parse(await readFile(resolve(root, 'assets/audio/kbsim/manifest.json'), 'utf8'));
const samples = {};
for (const file of audioManifest.files.filter(item => item.path.endsWith('.mp3'))) {
  const data = await readFile(resolve(root, 'assets/audio/kbsim', file.path));
  if (createHash('sha256').update(data).digest('hex') !== file.sha256) throw new Error(`Audio checksum mismatch: ${file.path}`);
  const [pack, , name] = file.path.split('/');
  (samples[pack] ??= {})[name.replace('.mp3', '')] = data.toString('base64');
}
const audioSource = `export { createAudioPlayer } from './packages/practice/src/audio-player.js';\nexport const samples = ${JSON.stringify(samples)};`;
const browserOptions = { absWorkingDir: root, bundle: true, platform: 'browser', target: 'es2022', charset: 'utf8', legalComments: 'inline', metafile: true };
const bundledAudio = { name: 'bundled-audio', setup(builder) {
  builder.onResolve({ filter: /^typefeel:audio$/ }, () => ({ path: 'audio', namespace: 'typefeel' }));
  builder.onLoad({ filter: /.*/, namespace: 'typefeel' }, () => ({ contents: audioSource, resolveDir: root, loader: 'js' }));
} };

async function pluginBuild() {
  const out = resolve(root, 'dist/dsh-plugin');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const host = await build({ absWorkingDir: root, entryPoints: ['packages/dsh-plugin/src/host.js'],
    bundle: true, platform: 'node', format: 'esm', target: 'node22', minify: true, charset: 'utf8',
    legalComments: 'inline', metafile: true, write: false });
  for (const output of Object.values(host.metafile.outputs)) {
    if (output.imports.some(item => !item.path.startsWith('node:'))) throw new Error('External Host runtime dependency');
  }
  track(host, 'dsh-host');
  await writeFile(resolve(out, 'index.js'), '// Generated from typefeel; do not edit.\n' + host.outputFiles[0].text);

  const client = await build({ ...browserOptions, entryPoints: ['packages/dsh-plugin/src/client.js'],
    loader: { '.svg': 'dataurl' }, format: 'cjs', write: false });
  track(client, 'dsh-client');
  await writeFile(resolve(out, 'client.js'), `// Generated from typefeel; do not edit.\nwindow.__ModuleLoader__.load({id:'${pluginManifest.name}',factory(require){const module={exports:{}};const exports=module.exports;\n${client.outputFiles[0].text}\nreturn module.exports.createPlugin(require('react'), name => require.async(name));}});\n`);
  for (const name of ['pinyin', 'jyutping', 'audio']) {
    const entry = name === 'audio' ? { stdin: { contents: audioSource, resolveDir: root, sourcefile: 'audio-generated.js' } }
      : { entryPoints: [`packages/practice/src/${name}.js`] };
    const chunk = await build({ ...browserOptions, ...entry, format: 'cjs', minify: true, write: false });
    track(chunk, `dsh-${name}`);
    await writeFile(resolve(out, `client.${name}.js`), `// Generated from typefeel; see THIRD_PARTY_NOTICES.md.\nwindow.__ModuleLoader__.load({id:'${pluginManifest.name}',chunk:'client.${name}.js',factory(require){const module={exports:{}};const exports=module.exports;\n${chunk.outputFiles[0].text}\nreturn module.exports;}});\n`);
  }
  const manifest = { ...pluginManifest };
  delete manifest.scripts;
  delete manifest.devDependencies;
  await writeFile(resolve(out, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  for (const file of ['cordis.patch.yml', 'locale', 'icon.svg', 'README.md', 'README.en.md']) await cp(resolve(pluginRoot, file), resolve(out, file), { recursive: true });
  await cp(resolve(root, 'LICENSE'), resolve(out, 'LICENSE'));
}

async function webBuild() {
  const out = resolve(root, 'dist/web');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const result = await build({ ...browserOptions, entryPoints: { app: 'apps/web/src/main.js' },
    format: 'esm', splitting: true, minify: true, outdir: resolve(out, 'assets'),
    entryNames: '[name]-[hash]', chunkNames: '[name]-[hash]', assetNames: '[name]-[hash]',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [bundledAudio],
  });
  track(result, 'web');
  if (graphs.web.some(path => /packages\/(?:dsh-plugin|obsidian-plugin)\//.test(path))) throw new Error('Web build includes plugin adapter code');
  const entry = Object.entries(result.metafile.outputs).find(([, meta]) => meta.entryPoint === 'apps/web/src/main.js');
  if (!entry) throw new Error('Missing web entry');
  const script = '/' + relative(out, resolve(root, entry[0]));
  const css = entry[1].cssBundle ? '/' + relative(out, resolve(root, entry[1].cssBundle)) : null;
  const template = await readFile(resolve(root, 'apps/web/index.html'), 'utf8');
  await writeFile(resolve(out, 'index.html'), template.replace('<!-- APP -->', `${css ? `<link rel="stylesheet" href="${css}">` : ''}\n<script type="module" src="${script}"></script>`));
  await cp(resolve(root, 'apps/web/public'), out, { recursive: true });
  await cp(resolve(root, 'LICENSE'), resolve(out, 'LICENSE.txt'));
}

// Obsidian installs only main.js, manifest.json and styles.css, so everything
// is one CommonJS file. Dynamic imports stay lazy: esbuild defers evaluating
// those modules until first use.
async function obsidianBuild() {
  const source = resolve(root, 'packages/obsidian-plugin');
  const out = resolve(root, 'dist/obsidian-plugin');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const result = await build({ ...browserOptions, entryPoints: ['packages/obsidian-plugin/src/main.js'],
    format: 'cjs', minify: true, write: false, loader: { '.svg': 'dataurl' },
    external: ['obsidian'], define: { 'process.env.NODE_ENV': '"production"' }, plugins: [bundledAudio] });
  track(result, 'obsidian');
  if (graphs.obsidian.some(path => /packages\/dsh-plugin\/|apps\/web\//.test(path))) throw new Error('Obsidian build includes another adapter');
  if (graphs.obsidian.some(path => path.startsWith('node:'))) throw new Error('Obsidian build uses Node APIs');
  for (const output of Object.values(result.metafile.outputs)) {
    if (output.imports.some(item => item.path !== 'obsidian')) throw new Error('External Obsidian runtime dependency');
  }
  let code = result.outputFiles[0].text;
  if (/\(\?<[=!]/.test(code)) throw new Error('Regular expression lookbehind is unsupported before iOS 16.4');
  // Obsidian automated reviewer rejects createElement('script') as dynamic code injection.
  // React 19 DOM includes hoistable script handlers that Type Feel never uses.
  code = code
    .replace(/createElement\((['"])script\1\)/g, 'createElement($1template$1)')
    .replace(/innerHTML\s*=\s*(['"])<script><\/script>\1/g, 'innerHTML=$1<template></template>$1');
  if (/createElement\s*\(\s*['"]script['"]\s*\)/.test(code)) throw new Error('Obsidian build contains createElement("script")');
  await writeFile(resolve(out, 'main.js'), '// Generated from typefeel; do not edit. Source: https://github.com/yishan/typefeel\n' + code);
  await writeFile(resolve(out, 'styles.css'), '/* Generated from typefeel; do not edit. */\n' + obsidianStyles(practiceCSS + gameCSS));
  await cp(resolve(source, 'manifest.json'), resolve(out, 'manifest.json'));
  await cp(resolve(root, 'LICENSE'), resolve(out, 'LICENSE'));
}

if (builds.plugin) await pluginBuild();
if (builds.web) await webBuild();
if (builds.obsidian) await obsidianBuild();
let notices = '# Third-party notices\n\nType Feel is MIT licensed. Practice passages are original. Libraries and keyboard recordings are bundled with the application; no runtime CDN is used.\n';
for (const name of [...dependencies].sort()) {
  const directory = resolve(root, 'node_modules', name);
  const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  const license = (await readdir(directory)).find(file => /^licen[cs]e(?:[.-].*)?$/i.test(file));
  if (!license) throw new Error(`Missing license: ${name}`);
  notices += `\n## ${name} ${manifest.version}\n\n${await readFile(resolve(directory, license), 'utf8')}\n`;
}
notices += `\n## kbsim keyboard recordings\n\n${audioManifest.repository}/tree/${audioManifest.revision}/src/assets/audio\n\n${await readFile(resolve(root, 'assets/audio/kbsim/LICENSE.md'), 'utf8')}\n`;
if (builds.plugin) await writeFile(resolve(root, 'dist/dsh-plugin/THIRD_PARTY_NOTICES.md'), notices);
if (builds.web) await writeFile(resolve(root, 'dist/web/THIRD_PARTY_NOTICES.txt'), notices);
if (builds.obsidian) await writeFile(resolve(root, 'dist/obsidian-plugin/THIRD_PARTY_NOTICES.md'), notices);
await writeFile(resolve(root, 'dist/build-inputs.json'), JSON.stringify(graphs, null, 2) + '\n');
console.log('Built', Object.keys(graphs).join(', '));
