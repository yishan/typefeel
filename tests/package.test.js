import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { entries } from '../packages/practice/src/practice-text.js';

test('the package, Cordis entry and every Client chunk share the published module name', async () => {
  const root = fileURLToPath(new URL('../dist/dsh-plugin', import.meta.url));
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8');
  assert.equal(/^\s+name:\s*(.+)$/m.exec(patch)?.[1], manifest.name);
  for (const file of ['client.js', 'client.pinyin.js', 'client.jyutping.js', 'client.audio.js']) {
    let registration;
    vm.runInNewContext(await readFile(join(root, file), 'utf8'), {
      window: { __ModuleLoader__: { load(value) { registration = value; } } },
    });
    assert.equal(registration.id, manifest.name, file);
    if (file === 'client.js') {
      const plugin = registration.factory(() => ({}));
      assert.deepEqual(Array.from(plugin.inject), manifest.dsh.client.inject);
      assert.ok(plugin.inject.includes('locale'), 'translated pages must wait for the host locale service');
    }
  }
});

test('the shipped Host activates and parses local Markdown without node_modules or source files', async t => {
  const root = fileURLToPath(new URL('../dist/dsh-plugin', import.meta.url));
  const directory = await mkdtemp(join(tmpdir(), 'typing-practice-package-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const file of ['index.js', 'package.json']) await copyFile(join(root, file), join(directory, file));
  const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
  assert.deepEqual(manifest.dependencies || {}, {});
  const text = entries.find(entry => entry.id === 'zh-travel-01').text;
  const script = `
    import assert from 'node:assert/strict';
    import { existsSync } from 'node:fs';
    const { apply } = await import(process.argv[1]);
    const text = process.argv[2];
    assert.equal(existsSync('node_modules'), false);
    assert.equal(existsSync('src'), false);
    let route;
    const eventTime = Date.now();
    const engine = {
      async listSessions() { return [{ header: { id: 'package-fixture' } }]; },
      async observeSession() {
        return { header: { id: 'package-fixture' }, events: [{
          type: 'user/message', seq: 1, time: eventTime,
          data: { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '**' + text + '**' }] },
        }], [Symbol.dispose]() {} };
      },
    };
    const ctx = {
      inject(names, callback) { assert.deepEqual(names, ['connection']); callback(this); },
      get(name) { return name === 'sessionQuery' ? engine : { fetch: { register(value) { route = value; } } }; },
    };
    apply(ctx);
    assert.equal(route.path, '/api/typing-practice/recent');
    const response = await route.fetch(new Request('http://localhost' + route.path + '?language=zh&mode=passage&length=short'));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.candidate.text, text);
    assert.equal(result.candidate.source.fingerprint.length, 64);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script,
    pathToFileURL(join(directory, 'index.js')).href, text], {
    cwd: directory, encoding: 'utf8', env: { ...process.env, NODE_PATH: '' }, timeout: 15000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});
