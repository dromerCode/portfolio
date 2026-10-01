import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { PHOTOS, readPhoto, savePhoto, nextPhoto } from '../site/js/photo.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('site/index.html');

test('real photo is the default and the two options alternate', () => {
  assert.deepEqual(PHOTOS, ['real', 'anime']);
  assert.equal(nextPhoto('real'), 'anime');
  assert.equal(nextPhoto('anime'), 'real');
  assert.equal(nextPhoto('garbage'), 'anime');
});

test('readPhoto falls back to real for missing, invalid or blocked storage', () => {
  assert.equal(readPhoto(undefined), 'real');
  assert.equal(readPhoto({ getItem: () => 'nope' }), 'real');
  assert.equal(readPhoto({ getItem: () => { throw new Error('blocked'); } }), 'real');
  assert.equal(readPhoto({ getItem: () => 'anime' }), 'anime');
});

test('savePhoto stores the choice and never throws', () => {
  const mem = new Map();
  savePhoto({ setItem: (k, v) => mem.set(k, v) }, 'anime');
  assert.equal(mem.get('photo'), 'anime');
  assert.doesNotThrow(() => savePhoto({ setItem() { throw new Error('quota'); } }, 'real'));
  assert.doesNotThrow(() => savePhoto(undefined, 'real'));
});

test('photo box holds both images, real first and visible by default', () => {
  assert.match(html, /<div class="photo" data-photo="real"/);
  const real = html.indexOf('photo__img--real'), anime = html.indexOf('photo__img--anime');
  assert.ok(real > 0 && anime > real);
  assert.ok(existsSync(new URL('../site/assets/img/foto.webp', import.meta.url)));
});

test('toggle button sits on the photo with an icon and translated labels', () => {
  assert.match(html, /<button id="photo-toggle" class="photo-toggle" type="button" aria-pressed="false"[^>]*>\s*<svg[^>]*><use href="#i-swap"/);
  assert.match(html, /<symbol id="i-swap"/);
  for (const lang of ['es', 'en']) {
    const d = JSON.parse(read(`site/i18n/${lang}.json`));
    assert.ok(d['photo.show.anime'] && d['photo.show.real'], lang);
  }
});

test('share preview template uses the real photo', () => {
  assert.match(read('tools/og.html'), /foto\.webp/);
});

test('real photo is high resolution (800px) and declares its size', () => {
  assert.match(html, /<img class="photo__img photo__img--real" src="assets\/img\/foto\.webp" alt="" width="800" height="800">/);
});

test('the hidden photo ignores the pointer so right-click hits the visible one', () => {
  const css = read('site/css/style.css');
  const rule = css.match(/\.photo\[data-photo="real"\] \.photo__img--anime, \.photo\[data-photo="anime"\] \.photo__img--real \{([^}]*)\}/)?.[1] ?? '';
  assert.match(rule, /opacity: 0/);
  assert.match(rule, /pointer-events: none/);
});
