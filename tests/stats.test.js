import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yearsSince } from '../site/js/render.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('site/index.html');

test('yearsSince counts full years from a start month', () => {
  assert.equal(yearsSince(2020, 7, new Date(2026, 9, 1)), 6);  // oct 2026
  assert.equal(yearsSince(2020, 7, new Date(2026, 5, 1)), 5);  // jun 2026, aún no hace 6
  assert.equal(yearsSince(2020, 7, new Date(2027, 6, 1)), 7);  // jul 2027
});

test('signature box is replaced by four quick stats', () => {
  assert.doesNotMatch(html, /side-box--sign|side\.signature/);
  const box = html.match(/<div class="box side-box side-box--stats">([\s\S]*?)<\/dl>/)?.[1] ?? '';
  const stats = [...box.matchAll(/<div class="stat">\s*<dt class="stat__value"[^>]*>([^<]+)<\/dt>\s*<dd class="stat__label" data-i18n="(stats\.[a-z]+)">/g)];
  assert.equal(stats.length, 4);
  assert.match(box, /data-years-since="2020-07"/);
  for (const lang of ['es', 'en']) {
    const d = JSON.parse(read(`site/i18n/${lang}.json`));
    for (const [, , key] of stats) assert.ok(d[key], `${lang}:${key}`);
    assert.ok(!('side.signature' in d));
  }
});

test('stats box is not hidden on small screens', () => {
  assert.doesNotMatch(read('site/css/style.css'), /side-box--stats \{[^}]*display: none/);
});
