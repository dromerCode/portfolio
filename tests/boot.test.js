import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldBoot, markBooted, bootLines } from '../site/js/boot.js';

const mem = (init = {}) => {
  const data = { ...init };
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); }, data };
};
const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };

test('boots on first visit only', () => {
  const s = mem();
  assert.equal(shouldBoot(s, false), true);
  markBooted(s);
  assert.equal(shouldBoot(s, false), false);
});

test('never boots with reduced motion', () => {
  assert.equal(shouldBoot(mem(), true), false);
});

test('broken storage still boots and does not throw', () => {
  assert.equal(shouldBoot(broken, false), true);
  assert.doesNotThrow(() => markBooted(broken));
  assert.equal(shouldBoot(undefined, false), true);
});

test('boot lines exist in both languages and fall back to english', () => {
  assert.ok(bootLines('es').length >= 4);
  assert.equal(bootLines('en').length, bootLines('es').length);
  assert.deepEqual(bootLines('fr'), bootLines('en'));
});
