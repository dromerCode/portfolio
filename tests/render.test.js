import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHTML, localized, safeUrl, projectCardHTML, timelineRowHTML } from '../site/js/render.js';

const project = {
  id: 'pichaflix',
  tags: ['DOCKER', 'LINUX'],
  repo: 'https://github.com/pichaDev/x',
  es: { category: 'HOMELAB', title: 'PICHAFLIX', desc: 'Servidor multimedia' },
  en: { category: 'HOMELAB', title: 'PICHAFLIX', desc: 'Media server' },
};

test('escapeHTML escapes special characters', () => {
  assert.equal(escapeHTML(`<b>"a" & 'b'</b>`), '&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;');
  assert.equal(escapeHTML(null), '');
  assert.equal(escapeHTML(undefined), '');
  assert.equal(escapeHTML(42), '42');
});

test('localized picks language, falls back to es, then {}', () => {
  assert.equal(localized({ es: { t: 'hola' }, en: { t: 'hi' } }, 'en').t, 'hi');
  assert.equal(localized({ es: { t: 'hola' } }, 'en').t, 'hola');
  assert.deepEqual(localized({}, 'en'), {});
});

test('safeUrl only allows https', () => {
  assert.equal(safeUrl('https://github.com/a'), 'https://github.com/a');
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('http://x.com'), null);
  assert.equal(safeUrl(''), null);
  assert.equal(safeUrl(null), null);
});

test('projectCardHTML renders number, category, title, desc, tags and repo link', () => {
  const html = projectCardHTML(project, 'en', 0, 'VIEW REPO →');
  assert.match(html, /#01 · HOMELAB/);
  assert.match(html, /<h3 class="proj__title">PICHAFLIX<\/h3>/);
  assert.match(html, /Media server/);
  assert.match(html, /<li class="tag">DOCKER<\/li>/);
  assert.match(html, /href="https:\/\/github.com\/pichaDev\/x"/);
  assert.match(html, /VIEW REPO →/);
});

test('projectCardHTML escapes content from JSON', () => {
  const evil = { ...project, tags: ['<img>'], en: { category: 'A&B', title: '<script>x</script>', desc: '"q"' } };
  const html = projectCardHTML(evil, 'en', 1, 'REPO');
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img>/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.match(html, /A&amp;B/);
});

test('projectCardHTML omits link when repo is missing or unsafe', () => {
  assert.doesNotMatch(projectCardHTML({ ...project, repo: null }, 'es', 0, 'REPO'), /<a /);
  assert.doesNotMatch(projectCardHTML({ ...project, repo: 'javascript:alert(1)' }, 'es', 0, 'REPO'), /<a /);
});

test('projectCardHTML tolerates missing tags', () => {
  const { tags, ...noTags } = project;
  assert.doesNotThrow(() => projectCardHTML(noTags, 'es', 0, 'REPO'));
});

test('timelineRowHTML renders period, text and type with led state', () => {
  const on = timelineRowHTML({ period: '2026', led: true, es: { text: 'FCT', type: 'PENDIENTE' }, en: { text: 'Internship', type: 'PENDING' } }, 'en');
  assert.match(on, /<td class="timeline__period">2026<\/td>/);
  assert.match(on, /Internship/);
  assert.match(on, /class="led"/);
  assert.match(on, /PENDING/);
  const off = timelineRowHTML({ period: '2025', led: false, es: { text: 'DAW', type: 'FORMACIÓN' } }, 'en');
  assert.doesNotMatch(off, /class="led/);
  assert.match(off, /FORMACIÓN/);
});
