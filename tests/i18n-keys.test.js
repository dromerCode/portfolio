import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../site/${p}`, import.meta.url), 'utf8');
const html = read('index.html');
const es = JSON.parse(read('i18n/es.json'));
const en = JSON.parse(read('i18n/en.json'));
const EXTRA = ['meta.title', 'meta.desc'];

const htmlKeys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]);

test('index.html uses at least one i18n key', () => {
  assert.ok(htmlKeys.length > 10);
});

for (const [name, dict] of [['es', es], ['en', en]]) {
  test(`${name}.json has every key used in index.html plus meta keys`, () => {
    const missing = [...htmlKeys, ...EXTRA].filter((k) => typeof dict[k] !== 'string' || dict[k] === '');
    assert.deepEqual(missing, []);
  });
}

test('es.json and en.json have the same keys', () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
});
