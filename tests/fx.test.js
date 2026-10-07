import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrambleFrame, countFrame } from '../site/js/fx.js';

const rand = () => 0; // siempre el primer carácter del juego

test('scramble at progress 1 is the real text', () => {
  assert.equal(scrambleFrame('DANIEL ROMERO', 1, rand), 'DANIEL ROMERO');
  assert.equal(scrambleFrame('DANIEL', 2, rand), 'DANIEL');
});

test('scramble keeps length and spaces, and reveals from the left', () => {
  const out = scrambleFrame('AB CD', 0.4, rand);
  assert.equal(out.length, 5);
  assert.equal(out[2], ' ');
  assert.equal(out.slice(0, 2), 'AB');
  assert.notEqual(out.slice(3), 'CD');
});

test('scramble at progress 0 hides every letter', () => {
  const out = scrambleFrame('XYZ', 0, rand);
  assert.equal(out.length, 3);
  assert.notEqual(out, 'XYZ');
});

test('countFrame counts numbers and keeps the suffix', () => {
  assert.equal(countFrame('6+', 0), '0+');
  assert.equal(countFrame('6+', 1), '6+');
  assert.equal(countFrame('5', 1), '5');
  const mid = Number(countFrame('10', 0.5));
  assert.ok(mid > 0 && mid < 10);
});

test('countFrame leaves non-numeric values alone', () => {
  assert.equal(countFrame('B2', 0), 'B2');
  assert.equal(countFrame('', 0.5), '');
});
