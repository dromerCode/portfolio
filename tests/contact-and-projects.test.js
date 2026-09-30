import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('site/index.html');

const contactLinks = [...html.matchAll(/<a class="ico-link[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];

test('projects are in the agreed order and subtrack/tabmon link to their repos', () => {
  const projects = JSON.parse(read('site/data/projects.json'));
  assert.deepEqual(projects.map((p) => p.id), ['subtrack', 'tabmon', 'cicd', 'juegonaves', 'cursophp']);
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  assert.equal(byId.subtrack.repo, 'https://github.com/pichaDev/subtrack');
  assert.equal(byId.tabmon.repo, 'https://github.com/pichaDev/tabmon');
  for (const p of projects) assert.ok(p.es.desc && p.en.desc, p.id);
});

test('timeline: degree in progress first, then internship, then Erasmus+', () => {
  const timeline = JSON.parse(read('site/data/timeline.json'));
  assert.deepEqual(timeline.slice(0, 3).map((e) => e.es.type), ['EN CURSO', 'PRÁCTICAS', 'ERASMUS+']);
});

test('"working on" box lists subtrack and tabmon with repo links and descriptions', () => {
  const box = html.match(/<div class="box side-box side-box--now">([\s\S]*?)<\/div>\s*<\/aside>/)?.[1] ?? '';
  assert.match(box, /href="https:\/\/github.com\/pichaDev\/subtrack"/);
  assert.match(box, /href="https:\/\/github.com\/pichaDev\/tabmon"/);
  assert.match(box, /data-i18n="side\.now\.subtrack"/);
  assert.match(box, /data-i18n="side\.now\.tabmon"/);
  const es = JSON.parse(read('site/i18n/es.json'));
  assert.equal(es['side.now.k'], 'TRABAJANDO EN');
  assert.ok(!('side.now.v' in es), 'old DWEC text removed');
});

test('CV side box shows the CV icon', () => {
  const box = html.match(/<a class="box side-box side-box--cv"[\s\S]*?<\/a>/)?.[0] ?? '';
  assert.match(box, /<use href="#i-cv"/);
});

test('photo links and footer each have github, linkedin, mail and cv', () => {
  for (const kind of ['data-link="github"', 'data-link="linkedin"', 'data-link="email"', 'data-cv']) {
    const count = contactLinks.filter((m) => m[0].includes(kind)).length;
    assert.equal(count, 2, `${kind} appears twice`);
  }
});

test('every contact link has a decorative icon and visible text', () => {
  for (const [whole, inner] of contactLinks) {
    assert.match(inner, /<svg [^>]*aria-hidden="true"[^>]*>\s*<use href="#i-[a-z]+"/, whole);
    const text = inner.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim();
    assert.ok(text.length > 0, `link has text: ${whole}`);
  }
});

test('every referenced icon exists as a symbol', () => {
  const used = new Set([...html.matchAll(/<use href="#(i-[a-z]+)"/g)].map((m) => m[1]));
  for (const id of used) assert.match(html, new RegExp(`<symbol id="${id}"`), id);
});

test('translated elements never contain icons (textContent would erase them)', () => {
  const translated = [...html.matchAll(/<(\w+)[^>]*data-i18n="[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)];
  for (const [whole, , inner] of translated) assert.doesNotMatch(inner, /<svg/, whole);
});

test('icons carry their own size so they stay small even without the CSS', () => {
  const icons = [...html.matchAll(/<svg class="ico[^"]*"[^>]*>/g)].map((m) => m[0]);
  assert.ok(icons.length >= 8);
  for (const tag of icons) assert.match(tag, /width="16" height="16"/, tag);
  assert.match(html, /<svg class="sprite"[^>]*width="0" height="0"/);
});

test('nginx makes browsers revalidate css, js and json on every visit', () => {
  const conf = read('nginx.conf');
  const block = conf.match(/location ~\* \\\.\(css\|js\|json\)\$ \{([^}]*)\}/)?.[1] ?? '';
  assert.match(block, /Cache-Control "no-cache"/);
  assert.doesNotMatch(block, /expires 1h/);
});

test('links under the photo show only a purple icon, label kept for screen readers', () => {
  const block = html.match(/<div class="links">([\s\S]*?)<\/div>/)[1];
  const labels = [...block.matchAll(/<\/svg><span([^>]*)>/g)].map((m) => m[1]);
  assert.equal(labels.length, 4);
  for (const attrs of labels) assert.match(attrs, /class="sr-only"/);
  for (const a of block.match(/<a [^>]*>/g)) assert.match(a, /title="[^"]+"/, a);

  const css = read('site/css/style.css');
  const hex = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
  const lum = (h) => h.match(/\w\w/g).map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
  const purple = hex('purple');
  assert.ok(purple, '--purple is defined');
  assert.ok((lum(purple) + 0.05) / (lum(hex('bg')) + 0.05) >= 3, 'icon contrast >= 3:1');
  assert.match(css, /\.links \.ico-link \{[^}]*color: var\(--purple\)/);
});
