import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectCardHTML } from '../site/js/render.js';

const project = {
  id: 'x', tags: [], repo: 'https://github.com/a/b',
  es: { category: 'C', title: 'T', desc: 'D' }, en: { category: 'C', title: 'T', desc: 'D' },
  media: { type: 'video', src: '/assets/video/x.mp4', poster: '/assets/img/x.webp', width: 960, height: 540,
    es: 'Tráiler "x"', en: 'Trailer' },
};

test('video media renders a muted looping inline video with poster and label', () => {
  const html = projectCardHTML(project, 'es', 0, 'repo');
  const video = html.match(/<video[^>]*>/)?.[0] ?? '';
  for (const attr of ['autoplay', 'muted', 'loop', 'playsinline']) assert.match(video, new RegExp(` ${attr}[ >]`));
  assert.match(video, /src="\/assets\/video\/x.mp4"/);
  assert.match(video, /poster="\/assets\/img\/x.webp"/);
  assert.match(video, /aria-label="Tráiler &quot;x&quot;"/);
  assert.match(video, /class="proj__media"/);
});

test('video in english uses the english label', () => {
  assert.match(projectCardHTML(project, 'en', 0, 'repo'), /aria-label="Trailer"/);
});
