import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('site/index.html');

const contactLinks = [...html.matchAll(/<a class="ico-link[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];

test('tabmon is the second project and links to its repo', () => {
  const projects = JSON.parse(read('site/data/projects.json'));
  assert.equal(projects[1].id, 'tabmon');
  assert.equal(projects[1].repo, 'https://github.com/pichaDev/tabmon');
  assert.ok(projects[1].es.desc && projects[1].en.desc);
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
