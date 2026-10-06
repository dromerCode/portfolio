import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { projectCardHTML } from '../site/js/render.js';
import { radarSVG, radarListHTML, levelValue } from '../site/js/radar.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('site/index.html');
const json = (p) => JSON.parse(read(p));
const base = { id: 'x', tags: [], repo: null, es: { category: 'C', title: 'T', desc: 'D', learned: 'Aprendí <x>' }, en: { category: 'C', title: 'T', desc: 'D' } };

// 1 · nombre como título
test('full name is the main heading and dromerCode is the alias', () => {
  assert.match(html, /<h1 class="title glow[^"]*">DANIEL ROMERO CÓZAR<\/h1>/);
  assert.match(html, /class="dossier__alias">@dromerCode</);
});

// 3 · Pichaflix contado de forma neutra
test('Pichaflix and homelab texts avoid torrent/indexer wording', () => {
  // El nombre "qBittorrent" se mantiene a petición del dueño; se revisan los textos descriptivos
  const pf = json('site/data/pichaflix.json');
  const texts = [...pf.steps, ...json('site/data/homelab.json').services]
    .flatMap((x) => ['es', 'en'].flatMap((l) => [x[l].title, x[l].text, x[l].role, x[l].desc]));
  const text = texts.filter(Boolean).join(' ') + JSON.stringify(pf.storage);
  assert.doesNotMatch(text, /torrent|indexador|indexer|Prowlarr/i);
});

// 4 · capturas o fragmentos + qué aprendí
test('project cards render an image with alt, lazy loading and size', () => {
  const out = projectCardHTML({ ...base, media: { type: 'img', src: 'assets/img/a.png', es: 'Panel', en: 'Dashboard', width: 1200, height: 750 } }, 'en', 0, 'R');
  assert.match(out, /<img class="proj__media" src="assets\/img\/a\.png" alt="Dashboard" loading="lazy" width="1200" height="750">/);
});

test('project cards render code snippets escaped', () => {
  const out = projectCardHTML({ ...base, media: { type: 'code', text: '$ tabmon <on>' } }, 'es', 0, 'R');
  assert.match(out, /<pre class="proj__media proj__code"><code>\$ tabmon &lt;on&gt;<\/code><\/pre>/);
});

test('project cards show what was learned, escaped, only when present', () => {
  assert.match(projectCardHTML(base, 'es', 0, 'R'), /<p class="proj__learned">Aprendí &lt;x&gt;<\/p>/);
  assert.doesNotMatch(projectCardHTML(base, 'en', 0, 'R'), /proj__learned/);
});

test('every project has media and a learned line in both languages', () => {
  for (const p of json('site/data/projects.json')) {
    assert.ok(['img', 'code'].includes(p.media?.type), p.id);
    if (p.media.type === 'img') assert.ok(existsSync(new URL(`../site/${p.media.src}`, import.meta.url)), p.media.src);
    assert.ok(p.es.learned && p.en.learned, p.id);
  }
});

// 6 · radar sin porcentajes
test('radar uses focus levels, not percentages', () => {
  assert.ok(levelValue('main') > levelValue('secondary') && levelValue('secondary') > levelValue('learning'));
  assert.equal(levelValue('nonsense'), 0);
  const skills = json('site/data/profile.json').skills;
  for (const s of skills) assert.ok(['main', 'secondary', 'learning'].includes(s.level), s.es);
  const list = radarListHTML(skills, 'es');
  assert.doesNotMatch(list, /\/100/);
  assert.match(list, /FRONTEND: principal/);
  assert.doesNotMatch(radarSVG(skills, 'en'), /NaN/);
  assert.match(html, /data-i18n="radar\.caption"/);
});

// 7 · bio legible
test('bio is not forced to uppercase', () => {
  const rule = read('site/css/style.css').match(/\.bio \{[^}]*\}/)[0];
  assert.doesNotMatch(rule, /uppercase/);
});

// 8 · vista previa al compartir
test('share preview has og:image (1200x630 PNG), twitter card and locale', () => {
  assert.match(html, /<meta property="og:image" content="https:\/\/portfolio\.pichahouse\.es\/assets\/img\/og\.png">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<meta property="og:locale" content="es_ES">/);
  const png = readFileSync(new URL('../site/assets/img/og.png', import.meta.url));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

// 9 · README del repo
test('repo README describes the project with a screenshot', () => {
  const readme = read('README.md');
  assert.match(readme, /portfolio\.pichahouse\.es/);
  assert.match(readme, /!\[[^\]]*\]\(docs\/screenshot\.png\)/);
  assert.ok(existsSync(new URL('../docs/screenshot.png', import.meta.url)));
  assert.match(readme, /deploy\.sh/);
});

// 10 · proyectos de clase en formación
test('class projects move to education: projects are subtrack, tabmon and cicd', () => {
  assert.deepEqual(json('site/data/projects.json').map((p) => p.id), ['subtrack', 'tabmon', 'cicd']);
  const daw = json('site/data/timeline.json')[0];
  for (const lang of ['es', 'en']) {
    assert.match(daw[lang].detail, /juegoNaves/);
    assert.match(daw[lang].detail, /PHP/);
  }
});
