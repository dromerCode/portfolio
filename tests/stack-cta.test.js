import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stackGroupHTML } from '../site/js/render.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('site/index.html');
const json = (p) => JSON.parse(read(p));

test('stackGroupHTML renders the localized group name and escaped items', () => {
  const out = stackGroupHTML({ es: 'SISTEMAS', en: 'SYSTEMS', items: ['Linux', '<x>'] }, 'en');
  assert.match(out, /SYSTEMS/);
  assert.match(out, /<li class="tag">Linux<\/li>/);
  assert.match(out, /&lt;x&gt;/);
});

test('stack data covers the main areas from the CV', () => {
  const groups = json('site/data/stack.json');
  assert.deepEqual(groups.map((g) => g.en), ['FRONTEND', 'BACKEND', 'DATABASES', 'SYSTEMS & DEVOPS', 'TOOLS']);
  const all = groups.flatMap((g) => g.items);
  for (const t of ['React', 'TypeScript', 'Java', 'Spring Boot', 'Node.js', 'Docker', 'Linux', 'Git']) assert.ok(all.includes(t), t);
});

test('stack view comes after projects and holds the stack grid', () => {
  const [a, p, s] = ['id="about"', 'id="projects"', 'id="stack"'].map((x) => html.indexOf(x));
  assert.ok(a < p && p < s && a > 0);
  assert.match(html, /<div id="stack-grid"/);
});

test('header and role say Junior Web Developer', () => {
  assert.match(html, /class="dossier__role"[^>]*>JUNIOR WEB DEVELOPER</);
  for (const lang of ['es', 'en']) {
    const d = json(`site/i18n/${lang}.json`);
    assert.equal(d['spec.role.v'], 'JUNIOR WEB DEVELOPER');
    assert.match(d.bio, /^(Soy )?Junior Web Developer/);
    assert.match(d['meta.title'], /Junior Web Developer/);
  }
});

test('contact CTA before the footer with mail, CV and LinkedIn actions', () => {
  const cta = html.match(/<section id="contact" class="cta[^"]*">([\s\S]*?)<\/section>/)?.[1] ?? '';
  assert.match(cta, /href="mailto:dromerCode@gmail\.com"/);
  assert.match(cta, /data-cv/);
  assert.match(cta, /linkedin\.com\/in\/dromerocoz/);
  assert.match(cta, /data-i18n="cta\.title"/);
  assert.ok(html.indexOf('id="contact"') < html.indexOf('<footer'));
});
