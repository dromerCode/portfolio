import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { serviceCardHTML, stepHTML, timelineRowHTML } from '../site/js/render.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('site/index.html');
const json = (p) => JSON.parse(read(p));

const service = { id: 'x', es: { name: 'JELLYFIN', role: 'STREAMING', desc: 'Pelis & series' }, en: { name: 'JELLYFIN', role: 'STREAMING', desc: 'Movies & shows' } };

test('serviceCardHTML renders name, role and escaped description', () => {
  const out = serviceCardHTML(service, 'en');
  assert.match(out, /JELLYFIN/);
  assert.match(out, /STREAMING/);
  assert.match(out, /Movies &amp; shows/);
  assert.doesNotMatch(serviceCardHTML({ ...service, en: { name: '<b>', role: '', desc: '' } }, 'en'), /<b>/);
});

test('stepHTML numbers the step and never renders links', () => {
  const out = stepHTML({ es: { title: 'Petición', text: 'Seerr <a href="x">' } }, 'es', 0);
  assert.match(out, /01/);
  assert.match(out, /Petición/);
  assert.doesNotMatch(out, /<a /);
});

test('timelineRowHTML shows the detail line when present', () => {
  const entry = { period: '2026', led: false, es: { text: 'Granadev', type: 'PRÁCTICAS', detail: 'React y TypeScript' } };
  assert.match(timelineRowHTML(entry, 'es'), /class="timeline__detail">React y TypeScript</);
  assert.doesNotMatch(timelineRowHTML({ ...entry, es: { text: 'x', type: 'y' } }, 'es'), /timeline__detail/);
});

test('homelab lists the requested services', () => {
  const ids = json('site/data/homelab.json').services.map((s) => s.id);
  assert.deepEqual(ids, ['npm', 'jellyfin', 'qbittorrent', 'arr', 'rensaio', 'kavita', 'adguard', 'filebrowser', 'subtrack']);
});

test('pichaflix has pipeline steps and storage, and is no longer a project', () => {
  const p = json('site/data/pichaflix.json');
  assert.ok(p.steps.length >= 5);
  assert.ok(p.storage.length >= 4);
  assert.ok(!json('site/data/projects.json').some((x) => x.id === 'pichaflix'));
});

test('each view holds its sections, and every view has a nav link', () => {
  const views = { inicio: ['about'], proyectos: ['projects'], stack: ['stack', 'timeline'], homelab: ['homelab', 'pichaflix'], contacto: ['contact'] };
  for (const [view, ids] of Object.entries(views)) {
    const start = html.indexOf(`data-view="${view}"`);
    const end = html.indexOf('<div class="view"', start + 1);
    const block = html.slice(start, end);
    assert.ok(start > 0, view);
    for (const id of ids) assert.match(block, new RegExp(`<section id="${id}"`), `${id} in ${view}`);
    assert.match(html, new RegExp(`<a href="${view === 'inicio' ? '/' : `/${view}`}" data-route`), view);
  }
  assert.match(html, /data-view="notfound" hidden/);
  const pf = html.slice(html.indexOf('id="pichaflix"'), html.indexOf('</section>', html.indexOf('id="pichaflix"')));
  assert.doesNotMatch(pf, /<a /, 'pichaflix section has no links');
});

test('header shows full name instead of the ID', () => {
  assert.match(html, /<h1[^>]*>DANIEL ROMERO CÓZAR<\/h1>/);
  assert.doesNotMatch(html, /DAW-2027/);
});

test('availability badge with briefcase icon over the photo', () => {
  assert.match(html, /<span class="badge-available"[^>]*>\s*<svg[^>]*><use href="#i-briefcase"/);
  assert.match(html, /<symbol id="i-briefcase"/);
});

test('downloaded CV is named "CV-Daniel Romero.pdf"', () => {
  const tags = html.match(/<a [^>]*data-cv[^>]*>/g);
  assert.equal(tags.length, 4);
  for (const t of tags) assert.match(t, /download="CV-Daniel Romero\.pdf"/);
});

test('timeline section is called Experience and education', () => {
  assert.equal(json('site/i18n/es.json')['sec.timeline'], 'EXPERIENCIA Y FORMACIÓN');
  assert.equal(json('site/i18n/en.json')['sec.timeline'], 'EXPERIENCE & EDUCATION');
  for (const e of json('site/data/timeline.json')) assert.ok(e.es.detail && e.en.detail, e.period);
});

test('timeline period can be translated per language', () => {
  const entry = { period: '2020', led: true, es: { text: 'a', type: 'b', period: '2020 – HOY' }, en: { text: 'a', type: 'b', period: '2020 – NOW' } };
  assert.match(timelineRowHTML(entry, 'en'), /2020 – NOW/);
  assert.match(timelineRowHTML(entry, 'es'), /2020 – HOY/);
});

test('storageRowHTML escapes name and localized description', async () => {
  const { storageRowHTML } = await import('../site/js/render.js');
  const out = storageRowHTML({ name: 'HDD <6TB>', es: 'Biblioteca', en: 'Library' }, 'en');
  assert.match(out, /HDD &lt;6TB&gt;/);
  assert.match(out, /Library/);
});
