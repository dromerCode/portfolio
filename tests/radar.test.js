import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, radarPoints, radarSVG, radarListHTML } from '../site/js/radar.js';

const skills = [
  { value: 100, es: 'FRONTEND', en: 'FRONTEND' },
  { value: 50, es: 'LINUX', en: 'LINUX' },
  { value: 0, es: 'DEVOPS', en: 'DEVOPS' },
  { value: 50, es: 'BBDD', en: 'DATABASES' },
  { value: 50, es: 'BACKEND', en: 'BACKEND' },
  { value: 50, es: 'JAVA', en: 'JAVA' },
];

test('clamp keeps 0..100 and turns junk into 0', () => {
  assert.equal(clamp(50), 50);
  assert.equal(clamp(150), 100);
  assert.equal(clamp(-5), 0);
  assert.equal(clamp('80'), 0);
  assert.equal(clamp(null), 0);
  assert.equal(clamp(NaN), 0);
});

test('radarPoints: first axis points straight up, second at 30° below horizontal', () => {
  const pts = radarPoints([100, 100, 100, 100, 100, 100], 80);
  assert.deepEqual(pts[0], [0, -80]);
  assert.deepEqual(pts[1], [69.28, -40]);
  assert.deepEqual(pts[3], [0, 80]);
});

test('radarPoints scales by value and clamps', () => {
  const pts = radarPoints([50, 0, 150, -10, 'x', null], 80);
  assert.deepEqual(pts[0], [0, -40]);
  assert.deepEqual(pts[1], [0, 0]);
  assert.deepEqual(pts[2], [69.28, 40]);
  for (const [x, y] of pts) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
  }
});

test('radarSVG has 4 grid rings, one area and localized labels, no NaN', () => {
  const svg = radarSVG(skills, 'en');
  assert.match(svg, /^<svg viewBox="-110 -100 220 200"/);
  assert.equal((svg.match(/class="radar__grid"/g) ?? []).length, 4 + 1);
  assert.equal((svg.match(/class="radar__area"/g) ?? []).length, 1);
  assert.match(svg, />DATABASES</);
  assert.doesNotMatch(svg, /NaN/);
});

test('radarSVG escapes labels', () => {
  const svg = radarSVG([{ value: 10, es: '<x>', en: '<x>' }, ...skills.slice(1)], 'es');
  assert.doesNotMatch(svg, /<x>/);
});

test('radarListHTML lists every skill with its value', () => {
  const html = radarListHTML(skills, 'es');
  assert.match(html, /<li>FRONTEND: 100\/100<\/li>/);
  assert.match(html, /<li>BBDD: 50\/100<\/li>/);
  assert.equal((html.match(/<li>/g) ?? []).length, 6);
});
