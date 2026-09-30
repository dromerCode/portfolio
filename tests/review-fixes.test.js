import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickCv } from '../site/js/render.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// Contraste WCAG entre dos colores hex
function luminance(hex) {
  const [r, g, b] = hex.match(/\w\w/g).map((h) => parseInt(h, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('--dim-text reaches 4.5:1 against the background', () => {
  const css = read('site/css/style.css');
  const bg = css.match(/--bg:\s*(#[0-9a-f]{6})/i)[1];
  const dimText = css.match(/--dim-text:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(dimText, '--dim-text is defined');
  assert.ok(contrast(dimText, bg) >= 4.5, `contrast ${contrast(dimText, bg).toFixed(2)}`);
});

test('text never uses the low-contrast --dim colour', () => {
  const css = read('site/css/style.css');
  assert.doesNotMatch(css, /(?<![-\w])color:\s*var\(--dim\)/);
});

test('pickCv uses the language, then any available CV, then null', () => {
  assert.equal(pickCv({ es: 'a.pdf', en: 'b.pdf' }, 'en'), 'b.pdf');
  assert.equal(pickCv({ es: 'a.pdf', en: null }, 'en'), 'a.pdf');
  assert.equal(pickCv({ es: null, en: 'b.pdf' }, 'es'), 'b.pdf');
  assert.equal(pickCv({ es: null, en: null }, 'es'), null);
  assert.equal(pickCv(undefined, 'es'), null);
});

test('CV links start hidden in the HTML', () => {
  const html = read('site/index.html');
  const cvTags = html.match(/<a [^>]*data-cv[^>]*>/g) ?? [];
  assert.equal(cvTags.length, 2);
  for (const tag of cvTags) assert.match(tag, /\shidden(\s|>)/);
});

test('deploy.sh syncs nginx.conf in place so the bind mount sees changes', () => {
  const sh = read('deploy.sh');
  assert.match(sh, /rsync[^\n]*--inplace[^\n]*nginx\.conf/);
});
