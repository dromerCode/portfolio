import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED, pickLang, readStoredLang, saveLang, applyTranslations } from '../site/js/i18n.js';

test('SUPPORTED is es and en', () => {
  assert.deepEqual(SUPPORTED, ['es', 'en']);
});

test('pickLang prefers a valid stored language', () => {
  assert.equal(pickLang('en', 'es-ES'), 'en');
  assert.equal(pickLang('es', 'en-US'), 'es');
});

test('pickLang ignores invalid stored values and uses navigator', () => {
  assert.equal(pickLang('fr', 'es-ES'), 'es');
  assert.equal(pickLang('', 'es'), 'es');
  assert.equal(pickLang(null, 'ES-mx'), 'es');
});

test('pickLang falls back to en', () => {
  assert.equal(pickLang(null, 'de-DE'), 'en');
  assert.equal(pickLang(null, undefined), 'en');
});

test('readStoredLang returns null when storage throws or is missing', () => {
  const broken = { getItem() { throw new Error('SecurityError'); } };
  assert.equal(readStoredLang(broken), null);
  assert.equal(readStoredLang(undefined), null);
});

test('saveLang + readStoredLang round-trip', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  saveLang(storage, 'en');
  assert.equal(readStoredLang(storage), 'en');
});

test('saveLang does not throw when storage throws', () => {
  const broken = { setItem() { throw new Error('QuotaExceeded'); } };
  assert.doesNotThrow(() => saveLang(broken, 'en'));
  assert.doesNotThrow(() => saveLang(undefined, 'en'));
});

function fakeRoot(elements) {
  return {
    querySelectorAll(sel) {
      if (sel === '[data-i18n]') return elements.filter((e) => e.dataset.i18n);
      if (sel === '[data-i18n-aria]') return elements.filter((e) => e.dataset.i18nAria);
      return [];
    },
  };
}
function el(dataset, text = '') {
  const attrs = {};
  return { dataset, textContent: text, attrs, setAttribute(k, v) { attrs[k] = v; } };
}

test('applyTranslations sets text and aria-label', () => {
  const a = el({ i18n: 'nav.about' }, 'SOBRE MÍ');
  const b = el({ i18nAria: 'photo.alt' });
  applyTranslations(fakeRoot([a, b]), { 'nav.about': 'ABOUT', 'photo.alt': 'Photo of pichaDev' });
  assert.equal(a.textContent, 'ABOUT');
  assert.equal(b.attrs['aria-label'], 'Photo of pichaDev');
});

test('applyTranslations keeps existing text when key is missing', () => {
  const a = el({ i18n: 'missing.key' }, 'ORIGINAL');
  applyTranslations(fakeRoot([a]), {});
  assert.equal(a.textContent, 'ORIGINAL');
});
