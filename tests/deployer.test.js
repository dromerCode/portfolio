import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = new URL('../deployer.sh', import.meta.url).pathname;
const SHA = 'a'.repeat(40);
const OLD = 'b'.repeat(40);

// Entorno de prueba: un wget falso que devuelve la respuesta de la API o el tarball del commit
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'deployer-'));
  const bin = join(dir, 'bin');
  const site = join(dir, 'site');
  const state = join(dir, 'state');
  for (const d of [bin, site, state]) mkdirSync(d);

  const api = JSON.stringify({ total_count: 2, workflow_runs: [{ id: 2, head_sha: SHA }, { id: 1, head_sha: OLD }] }, null, 2);
  writeFileSync(join(dir, 'api.json'), api);

  // Tarball con la misma estructura que codeload: portfolio-<sha>/site/...
  const src = join(dir, 'src', `portfolio-${SHA}`);
  mkdirSync(join(src, 'site', 'css'), { recursive: true });
  writeFileSync(join(src, 'site', 'index.html'), 'nuevo');
  writeFileSync(join(src, 'site', 'css', 'style.css'), 'css nuevo');
  writeFileSync(join(src, 'README.md'), 'fuera de site');
  execFileSync('tar', ['-czf', join(dir, 'repo.tar.gz'), '-C', join(dir, 'src'), `portfolio-${SHA}`]);

  writeFileSync(join(bin, 'wget'), `#!/bin/sh
url="$2"
case "$url" in
  *api.github.com*) cat "${dir}/api.json" ;;
  *codeload*${SHA}) cat "${dir}/repo.tar.gz" ;;
  *) exit 1 ;;
esac
`);
  chmodSync(join(bin, 'wget'), 0o755);
  return { dir, site, state, bin };
}

function run(box, body) {
  return execFileSync('sh', ['-c', `. "${SCRIPT}"; ${body}`], {
    env: { ...process.env, PATH: `${box.bin}:${process.env.PATH}`, DEPLOYER_LIB: '1', SITE: box.site, STATE: box.state },
    encoding: 'utf8',
  });
}

test('latest_green returns the newest successful run of main', () => {
  const box = sandbox();
  assert.equal(run(box, 'latest_green').trim(), SHA);
  rmSync(box.dir, { recursive: true });
});

test('deploy syncs only site/, removes stale files and remembers the sha', () => {
  const box = sandbox();
  writeFileSync(join(box.site, 'index.html'), 'viejo');
  mkdirSync(join(box.site, 'old'));
  writeFileSync(join(box.site, 'old', 'gone.js'), 'x');

  run(box, `deploy ${SHA}`);

  assert.equal(readFileSync(join(box.site, 'index.html'), 'utf8'), 'nuevo');
  assert.equal(readFileSync(join(box.site, 'css', 'style.css'), 'utf8'), 'css nuevo');
  assert.equal(existsSync(join(box.site, 'README.md')), false);
  assert.equal(existsSync(join(box.site, 'old')), false);
  assert.equal(readFileSync(join(box.state, 'sha'), 'utf8').trim(), SHA);
  assert.equal(existsSync(join(box.state, 'new')), false);
  rmSync(box.dir, { recursive: true });
});

test('a failed download leaves the live site untouched', () => {
  const box = sandbox();
  writeFileSync(join(box.site, 'index.html'), 'viejo');

  assert.throws(() => run(box, `deploy ${OLD} || exit 1`));

  assert.equal(readFileSync(join(box.site, 'index.html'), 'utf8'), 'viejo');
  assert.equal(existsSync(join(box.state, 'sha')), false);
  rmSync(box.dir, { recursive: true });
});

test('compose runs the deployer as the owner of site/ with the state dir mounted', () => {
  const compose = readFileSync(new URL('../compose.yaml', import.meta.url), 'utf8');
  assert.match(compose, /deployer:/);
  assert.match(compose, /user: "999:1000"/);
  assert.match(compose, /- \.\/deployer\.sh:\/deployer\.sh:ro/);
  assert.match(compose, /- \.\/\.deployer:\/state/);
  assert.match(readFileSync(new URL('../deploy.sh', import.meta.url), 'utf8'), /deployer\.sh/);
});
