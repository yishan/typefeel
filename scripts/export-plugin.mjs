import { execFileSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const destination = process.argv[2] && resolve(process.argv[2]);
if (!destination || destination === root || destination.startsWith(root + '/')) throw new Error('Provide a new staging directory outside this repository.');
let files;
try { files = await readdir(destination); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (files?.length) throw new Error('Destination is not empty; existing work will not be overwritten.');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) throw new Error('Commit source changes before exporting a release.');
execFileSync(process.execPath, [resolve(root, 'scripts/build.mjs')], { cwd: root, stdio: 'inherit' });
execFileSync('npm', ['test'], { cwd: root, stdio: 'inherit' });
const source = resolve(root, 'dist/dsh-plugin');
const manifest = JSON.parse(await readFile(resolve(source, 'package.json'), 'utf8'));
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
await writeFile(resolve(destination, 'SOURCE.json'), JSON.stringify({
  repository: 'https://github.com/yishan/typefeel', revision, package: manifest.name, version: manifest.version,
}, null, 2) + '\n');
console.log(`Exported ${manifest.name}@${manifest.version} from ${revision} to ${destination}`);
console.log('Review before updating the plugin distribution repository or publishing npm.');
