import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute, legacyHashRoute, pathFor, VIEWS } from '../site/js/router.js';

test('known paths resolve to their view', () => {
  assert.equal(resolveRoute('/'), 'inicio');
  assert.equal(resolveRoute('/proyectos'), 'proyectos');
  assert.equal(resolveRoute('/stack'), 'stack');
  assert.equal(resolveRoute('/homelab'), 'homelab');
  assert.equal(resolveRoute('/contacto'), 'contacto');
});

test('trailing slash and index.html are accepted', () => {
  assert.equal(resolveRoute('/proyectos/'), 'proyectos');
  assert.equal(resolveRoute('/index.html'), 'inicio');
  assert.equal(resolveRoute(''), 'inicio');
});

test('unknown paths resolve to notfound', () => {
  assert.equal(resolveRoute('/nada'), 'notfound');
  assert.equal(resolveRoute('/proyectos/subtrack'), 'notfound');
  assert.equal(resolveRoute('/PROYECTOS'), 'notfound');
});

test('old hash anchors map to the new paths', () => {
  assert.equal(legacyHashRoute('#about'), '/');
  assert.equal(legacyHashRoute('#projects'), '/proyectos');
  assert.equal(legacyHashRoute('#stack'), '/stack');
  assert.equal(legacyHashRoute('#timeline'), '/stack');
  assert.equal(legacyHashRoute('#homelab'), '/homelab');
  assert.equal(legacyHashRoute('#pichaflix'), '/homelab');
  assert.equal(legacyHashRoute('#contact'), '/contacto');
  assert.equal(legacyHashRoute('#otra'), null);
  assert.equal(legacyHashRoute(''), null);
});

test('pathFor is the inverse of resolveRoute for every view', () => {
  for (const view of VIEWS) assert.equal(resolveRoute(pathFor(view)), view);
});
