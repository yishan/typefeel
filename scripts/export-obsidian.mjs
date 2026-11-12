import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prepareRelease, root } from './release.mjs';

// Stages the yishan/typefeel-obsidian repository layout: the three installable
// files plus README, licenses, versions.json and SOURCE.json. Nothing is pushed.
const { destination, revision } = await prepareRelease(process.argv[2]);
const source = resolve(root, 'dist/obsidian-plugin');
const pluginRoot = resolve(root, 'packages/obsidian-plugin');
const manifest = JSON.parse(await readFile(resolve(source, 'manifest.json'), 'utf8'));
const versions = JSON.parse(await readFile(resolve(pluginRoot, 'versions.json'), 'utf8'));
if (versions[manifest.version] !== manifest.minAppVersion) throw new Error(`versions.json must map ${manifest.version} to ${manifest.minAppVersion}`);
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
for (const file of ['README.md', 'README.zh-CN.md', 'versions.json']) await cp(resolve(pluginRoot, file), resolve(destination, file));
await writeFile(resolve(destination, 'SOURCE.json'), JSON.stringify({
  repository: 'https://github.com/yishan/typefeel', revision, plugin: manifest.id, version: manifest.version,
}, null, 2) + '\n');
console.log(`Exported Obsidian plugin ${manifest.id}@${manifest.version} from ${revision} to ${destination}`);
console.log('Review before updating yishan/typefeel-obsidian or creating a GitHub release.');
