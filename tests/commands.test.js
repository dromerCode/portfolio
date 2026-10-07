import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCommand, complete } from '../site/js/commands.js';

test('view commands navigate, in both languages', () => {
  assert.deepEqual(runCommand('proyectos', 'es').action, { type: 'go', path: '/proyectos' });
  assert.deepEqual(runCommand('projects', 'en').action, { type: 'go', path: '/proyectos' });
  assert.deepEqual(runCommand('  HOME ', 'en').action, { type: 'go', path: '/' });
  assert.deepEqual(runCommand('contact', 'es').action, { type: 'go', path: '/contacto' });
});

test('help lists commands in the current language', () => {
  const es = runCommand('help', 'es');
  assert.ok(es.out.length > 5);
  assert.ok(es.out.some((l) => /proyectos/.test(l)));
  assert.equal(runCommand('ayuda', 'es').out.length, es.out.length);
  assert.ok(runCommand('help', 'en').out.some((l) => /projects/.test(l)));
});

test('unknown commands explain how to get help', () => {
  const r = runCommand('rm -rf /', 'es');
  assert.equal(r.action, null);
  assert.equal(r.error, true);
  assert.match(r.out[0], /rm/);
  assert.match(r.out[0], /help/);
});

test('empty input does nothing', () => {
  assert.deepEqual(runCommand('   ', 'es'), { out: [], action: null, error: false });
});

test('lang, sound, photo, cv, links, clear and exit', () => {
  assert.deepEqual(runCommand('lang en', 'es').action, { type: 'lang', lang: 'en' });
  assert.equal(runCommand('lang fr', 'es').error, true);
  assert.deepEqual(runCommand('sonido on', 'es').action, { type: 'sound', on: true });
  assert.deepEqual(runCommand('sound off', 'en').action, { type: 'sound', on: false });
  assert.deepEqual(runCommand('sound', 'en', { sound: true }).action, { type: 'sound', on: false });
  assert.deepEqual(runCommand('foto', 'es').action, { type: 'photo' });
  assert.deepEqual(runCommand('cv', 'es').action, { type: 'cv' });
  assert.equal(runCommand('github', 'es').action.type, 'open');
  assert.match(runCommand('github', 'es').action.url, /^https:\/\/github\.com\/dromerCode$/);
  assert.match(runCommand('mail', 'es').action.url, /^mailto:/);
  assert.deepEqual(runCommand('clear', 'es').action, { type: 'clear' });
  assert.deepEqual(runCommand('salir', 'es').action, { type: 'close' });
});

test('sudo is politely refused', () => {
  const r = runCommand('sudo rm -rf /', 'es');
  assert.equal(r.action, null);
  assert.ok(r.out.length >= 1);
});

test('complete returns the unique match or the common candidates', () => {
  assert.deepEqual(complete('proy'), ['proyectos']);
  assert.ok(complete('s').includes('stack') && complete('s').includes('sonido'));
  assert.deepEqual(complete('zzz'), []);
  assert.deepEqual(complete(''), []);
});

test('neofetch prints a logo next to system info, narrow enough for mobile', () => {
  for (const lang of ['es', 'en']) {
    const r = runCommand('neofetch', lang);
    assert.equal(r.error, false);
    assert.ok(r.out.length >= 8);
    assert.ok(r.out.some((l) => /dromer@pichahouse/.test(l)));
    assert.ok(r.out.some((l) => /niri/.test(l)));
    for (const l of r.out) assert.ok(l.length <= 44, `too wide: "${l}"`);
  }
});

test('easter-egg hints at the Konami code, in both languages and with aliases', () => {
  const es = runCommand('easter-egg', 'es');
  assert.equal(es.error, false);
  assert.ok(es.out.some((l) => /Konami/.test(l)));
  assert.ok(es.out.some((l) => /↑ ↑ ↓ ↓ ← → ← → B A/.test(l)));
  assert.deepEqual(runCommand('secreto', 'es').out, es.out);
  assert.ok(runCommand('secret', 'en').out.some((l) => /try the Konami code/i.test(l)));
});

test('help mentions the new commands', () => {
  for (const lang of ['es', 'en']) {
    const help = runCommand('help', lang).out.join('\n');
    assert.match(help, /neofetch/);
    assert.match(help, /easter-egg/);
  }
  assert.deepEqual(complete('neo'), ['neofetch']);
  assert.deepEqual(complete('east'), ['easter-egg']);
});
