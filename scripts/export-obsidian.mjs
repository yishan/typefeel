import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prepareRelease, root } from './release.mjs';

// Stages the yishan/typefeel-obsidian repository layout: the installable files,
// README, licenses, versions.json, SOURCE.json, plus the full source tree,
// build.mjs and package.json for open-source verification. Nothing is pushed.
const { destination, revision } = await prepareRelease(process.argv[2]);
const source = resolve(root, 'dist/obsidian-plugin');
const pluginRoot = resolve(root, 'packages/obsidian-plugin');
const manifest = JSON.parse(await readFile(resolve(source, 'manifest.json'), 'utf8'));
const versions = JSON.parse(await readFile(resolve(pluginRoot, 'versions.json'), 'utf8'));
if (versions[manifest.version] !== manifest.minAppVersion) throw new Error(`versions.json must map ${manifest.version} to ${manifest.minAppVersion}`);

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
for (const file of ['README.md', 'README.zh-CN.md', 'versions.json']) await cp(resolve(pluginRoot, file), resolve(destination, file));

// Include source files required to build main.js and styles.css
await mkdir(resolve(destination, 'packages/obsidian-plugin/src'), { recursive: true });
await cp(resolve(pluginRoot, 'src'), resolve(destination, 'packages/obsidian-plugin/src'), { recursive: true });
await cp(resolve(pluginRoot, 'icon.svg'), resolve(destination, 'packages/obsidian-plugin/icon.svg'));
await mkdir(resolve(destination, 'packages/practice/src'), { recursive: true });
await cp(resolve(root, 'packages/practice/src'), resolve(destination, 'packages/practice/src'), { recursive: true });
await mkdir(resolve(destination, 'data'), { recursive: true });
await cp(resolve(root, 'data/passages.json'), resolve(destination, 'data/passages.json'));
await cp(resolve(root, 'data/game-words.json'), resolve(destination, 'data/game-words.json'));
await mkdir(resolve(destination, 'assets/audio/kbsim'), { recursive: true });
await cp(resolve(root, 'assets/audio/kbsim'), resolve(destination, 'assets/audio/kbsim'), { recursive: true });

// .gitignore
await writeFile(resolve(destination, '.gitignore'), 'node_modules/\n.DS_Store\n');

// Standalone build.mjs
const buildScript = `import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { obsidianStyles } from './packages/obsidian-plugin/src/theme.js';
import { CSS as practiceCSS } from './packages/practice/src/styles.js';
import { CSS as gameCSS } from './packages/practice/src/game/styles.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const audioManifest = JSON.parse(await readFile(resolve(root, 'assets/audio/kbsim/manifest.json'), 'utf8'));
const samples = {};
for (const file of audioManifest.files.filter(item => item.path.endsWith('.mp3'))) {
  const data = await readFile(resolve(root, 'assets/audio/kbsim', file.path));
  if (createHash('sha256').update(data).digest('hex') !== file.sha256) throw new Error('Audio checksum mismatch: ' + file.path);
  const [pack, , name] = file.path.split('/');
  (samples[pack] ??= {})[name.replace('.mp3', '')] = data.toString('base64');
}
const audioSource = 'export { createAudioPlayer } from "./packages/practice/src/audio-player.js";\\nexport const samples = ' + JSON.stringify(samples) + ';\\n';

const bundledAudio = {
  name: 'bundled-audio',
  setup(b) {
    b.onResolve({ filter: /^typefeel:audio$/ }, args => ({ path: args.path, namespace: 'typefeel-audio' }));
    b.onLoad({ filter: /.*/, namespace: 'typefeel-audio' }, () => ({
      contents: audioSource, resolveDir: root, loader: 'js'
    }));
  }
};

const result = await build({
  entryPoints: ['packages/obsidian-plugin/src/main.js'],
  bundle: true,
  platform: 'browser',
  target: ['es2022'],
  format: 'cjs',
  minify: true,
  write: false,
  loader: { '.svg': 'dataurl' },
  external: ['obsidian'],
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [bundledAudio]
});

let code = result.outputFiles[0].text;
if (/\\(\\?<[=!]/.test(code)) throw new Error('Regular expression lookbehind is unsupported before iOS 16.4');
code = code
  .replace(/createElement\\((['"])script\\1\\)/g, 'createElement($1template$1)')
  .replace(/innerHTML\\s*=\\s*(['"])<script><\\/script>\\1/g, 'innerHTML=$1<template></template>$1');

await writeFile(resolve(root, 'main.js'), '// Generated from typefeel; do not edit. Source: https://github.com/yishan/typefeel\\n' + code);
await writeFile(resolve(root, 'styles.css'), '/* Generated from typefeel; do not edit. */\\n' + obsidianStyles(practiceCSS + gameCSS));
console.log('Built main.js and styles.css');
`;
await writeFile(resolve(destination, 'build.mjs'), buildScript);

// package.json for distribution repository
const pkg = {
  name: 'typefeel',
  version: manifest.version,
  description: manifest.description,
  type: 'module',
  main: 'main.js',
  scripts: {
    build: 'node build.mjs'
  },
  keywords: [
    'obsidian',
    'typing',
    'practice',
    'ime',
    'chinese',
    'cantonese'
  ],
  author: manifest.author,
  license: 'MIT',
  dependencies: {
    react: '19.3.1',
    'react-dom': '19.3.1'
  },
  devDependencies: {
    esbuild: '0.28.2',
    'mdast-util-from-markdown': '2.0.2',
    'pinyin-pro': '3.29.5',
    'to-jyutping': '3.1.1'
  }
};
await writeFile(resolve(destination, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

await writeFile(resolve(destination, 'SOURCE.json'), JSON.stringify({
  repository: 'https://github.com/yishan/typefeel', revision, plugin: manifest.id, version: manifest.version,
}, null, 2) + '\n');
console.log(`Exported Obsidian plugin ${manifest.id}@${manifest.version} from ${revision} to ${destination}`);
console.log('Review before updating yishan/typefeel-obsidian or creating a GitHub release.');
