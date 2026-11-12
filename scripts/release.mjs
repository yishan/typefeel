import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url));

// Shared release guard: a new empty staging directory outside the repository,
// committed sources, then a fresh build and the full test suite. Returns the
// staging path and the source revision to record in SOURCE.json.
export async function prepareRelease(argument) {
  const destination = argument && resolve(argument);
  if (!destination || destination === root || destination.startsWith(root + '/')) throw new Error('Provide a new staging directory outside this repository.');
  let files;
  try { files = await readdir(destination); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (files?.length) throw new Error('Destination is not empty; existing work will not be overwritten.');
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) throw new Error('Commit source changes before exporting a release.');
  execFileSync(process.execPath, [resolve(root, 'scripts/build.mjs')], { cwd: root, stdio: 'inherit' });
  execFileSync('npm', ['test'], { cwd: root, stdio: 'inherit' });
  return { destination, revision };
}
