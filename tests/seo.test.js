import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../site/${p}`, import.meta.url), 'utf8');

// Sin estos ficheros, el fallback de nginx sirve index.html en su lugar
test('robots.txt exists and points to the sitemap', () => {
  const robots = read('robots.txt');
  assert.match(robots, /^User-agent: \*/m);
  assert.match(robots, /^Sitemap: https:\/\/portfolio\.pichahouse\.es\/sitemap\.xml$/m);
});

test('sitemap lists every view', () => {
  const xml = read('sitemap.xml');
  for (const path of ['/', '/proyectos', '/stack', '/homelab', '/contacto']) {
    assert.match(xml, new RegExp(`<loc>https://portfolio\\.pichahouse\\.es${path.replace(/\//g, '\\/')}</loc>`), path);
  }
});

test('profile photo has a small srcset variant and loads with high priority', () => {
  const html = read('index.html');
  const img = html.match(/<img class="photo__img photo__img--real"[^>]*>/)[0];
  assert.match(img, /fetchpriority="high"/);
  assert.match(img, /srcset="\/assets\/img\/foto-400\.webp 400w, \/assets\/img\/foto\.webp 800w"/);
  assert.match(img, /sizes="/);
  assert.ok(existsSync(new URL('../site/assets/img/foto-400.webp', import.meta.url)));
});

test('favicon shows an R', () => {
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  assert.match(html, /<link rel="icon"[^>]*%3ER%3C\/text%3E/);
});

test('language toggle accessible name starts with its visible text', () => {
  const html = read('index.html');
  assert.match(html, /id="lang-toggle"[^>]*aria-label="ES \/ EN · [^"]+"/);
});

test('llms.txt summarises the site with its views and contact', () => {
  const llms = read('llms.txt');
  assert.match(llms, /^# Daniel Romero/m);
  assert.match(llms, /^> /m);
  for (const v of ['/proyectos', '/stack', '/homelab', '/contacto', 'github.com/dromerCode', 'dromerCode@gmail.com']) assert.ok(llms.includes(v), v);
});
