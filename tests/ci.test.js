import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('CI runs the tests on every push to main and on pull requests', () => {
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /^name: CI$/m);
  assert.match(ci, /push:\s*\n\s*branches: \[main\]/);
  assert.match(ci, /pull_request:/);
  assert.match(ci, /run: npm test/);
});

test('README shows the CI badge', () => {
  assert.match(read('README.md'), /\[!\[CI\]\(https:\/\/github\.com\/dromerCode\/portfolio\/actions\/workflows\/ci\.yml\/badge\.svg\)\]\(https:\/\/github\.com\/dromerCode\/portfolio\/actions\/workflows\/ci\.yml\)/);
});
