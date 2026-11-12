import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prepareRelease, root } from './release.mjs';

const { destination, revision } = await prepareRelease(process.argv[2]);
const source = resolve(root, 'dist/dsh-plugin');
const manifest = JSON.parse(await readFile(resolve(source, 'package.json'), 'utf8'));
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
await writeFile(resolve(destination, 'SOURCE.json'), JSON.stringify({
  repository: 'https://github.com/yishan/typefeel', revision, package: manifest.name, version: manifest.version,
}, null, 2) + '\n');
console.log(`Exported ${manifest.name}@${manifest.version} from ${revision} to ${destination}`);
console.log('Review before updating the plugin distribution repository or publishing npm.');
