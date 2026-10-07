import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortcutPath, konamiMatcher, isTypingTarget } from '../site/js/keys.js';
import { readSound, saveSound } from '../site/js/sound.js';

test('number keys map to views', () => {
  assert.equal(shortcutPath('1'), '/');
  assert.equal(shortcutPath('2'), '/proyectos');
  assert.equal(shortcutPath('5'), '/contacto');
  assert.equal(shortcutPath('6'), null);
  assert.equal(shortcutPath('a'), null);
});

test('konami code fires once on the full sequence, tolerating restarts', () => {
  const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const m = konamiMatcher();
  assert.deepEqual(seq.map(m).filter(Boolean).length, 1);
  assert.equal(seq.map(m).at(-1), true, 'works a second time');
  const m2 = konamiMatcher();
  for (const k of ['ArrowUp', ...seq.slice(0, -1)]) m2(k); // un ArrowUp de más al principio
  assert.equal(m2('a'), true);
  const m3 = konamiMatcher();
  assert.equal(['ArrowUp', 'x', ...seq.slice(1)].map(m3).some(Boolean), false);
  assert.equal(konamiMatcher()('B'), false);
});

test('typing targets are ignored for shortcuts', () => {
  assert.equal(isTypingTarget({ tagName: 'INPUT' }), true);
  assert.equal(isTypingTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isTypingTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: 'A' }), false);
  assert.equal(isTypingTarget(null), false);
});

test('sound is off by default and persists', () => {
  const data = {};
  const s = { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
  assert.equal(readSound(s), false);
  saveSound(s, true);
  assert.equal(readSound(s), true);
  const broken = { getItem() { throw new Error(); }, setItem() { throw new Error(); } };
  assert.equal(readSound(broken), false);
  assert.doesNotThrow(() => saveSound(broken, true));
});
