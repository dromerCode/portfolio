import { readPhoto, savePhoto, nextPhoto } from './photo.js';
import { pickLang, readStoredLang, saveLang, applyTranslations } from './i18n.js';
import { yearsSince, projectCardHTML, timelineRowHTML, pickCv, serviceCardHTML, stepHTML, storageRowHTML, stackGroupHTML, escapeHTML } from './render.js';
import { radarSVG, radarListHTML } from './radar.js';
import { startRouter } from './router.js';
import { shouldBoot, markBooted, runBoot } from './boot.js';
import { scramble, countUp, typeText } from './fx.js';

const $ = (sel) => document.querySelector(sel);
const storage = (() => {
  try { return window.localStorage; } catch { return undefined; }
})();

const state = { lang: 'es', dicts: {}, data: null, seq: 0, photo: 'real', view: null };
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function loadDict(lang) {
  state.dicts[lang] ??= await getJSON(`/i18n/${lang}.json`);
  return state.dicts[lang];
}

async function loadData() {
  const [profile, projects, timeline, homelab, pichaflix, stack] = await Promise.all([
    getJSON('/data/profile.json'),
    getJSON('/data/projects.json'),
    getJSON('/data/timeline.json'),
    getJSON('/data/homelab.json'),
    getJSON('/data/pichaflix.json'),
    getJSON('/data/stack.json'),
  ]);
  return { profile, projects, timeline, homelab, pichaflix, stack };
}

function renderData(lang, dict) {
  const { profile, projects, timeline, homelab, pichaflix, stack } = state.data;
  $('#stack-grid').innerHTML = stack.map((g) => stackGroupHTML(g, lang)).join('');
  $('#radar').innerHTML = radarSVG(profile.skills, lang);
  $('#radar-list').innerHTML = radarListHTML(profile.skills, lang);
  const repoLabel = dict['project.repo'] ?? 'REPO →';
  $('#projects-grid').innerHTML = projects.map((p, i) => projectCardHTML(p, lang, i, repoLabel)).join('');
  $('#timeline-body').innerHTML = timeline.map((e) => timelineRowHTML(e, lang)).join('');
  $('#homelab-specs').innerHTML = pichaflix.specs.map((s) => `<li class="tag">${escapeHTML(s)}</li>`).join('');
  $('#homelab-grid').innerHTML = homelab.services.map((s) => serviceCardHTML(s, lang)).join('');
  $('#pichaflix-steps').innerHTML = pichaflix.steps.map((s, i) => stepHTML(s, lang, i)).join('');
  $('#pichaflix-storage').innerHTML = pichaflix.storage.map((d) => storageRowHTML(d, lang)).join('');

  for (const list of document.querySelectorAll('#stack-grid, #projects-grid, #homelab-grid, #pichaflix-steps, #timeline-body')) stagger(list);
  for (const list of document.querySelectorAll('#stack-grid .proj__tags')) stagger(list, '--j');

  const cv = pickCv(profile.cv, lang);
  for (const a of document.querySelectorAll('[data-cv]')) {
    a.hidden = !cv;
    if (cv) a.href = cv;
  }
}

function applyPhoto(photo) {
  const box = $('.photo');
  const btn = $('#photo-toggle');
  const anime = photo === 'anime';
  box.dataset.photo = photo;
  btn.setAttribute('aria-pressed', String(anime));
  const dict = state.dicts[state.lang] ?? {};
  btn.title = dict[anime ? 'photo.show.real' : 'photo.show.anime'] ?? btn.title;
  btn.setAttribute('aria-label', dict['photo.toggle'] ?? btn.getAttribute('aria-label'));
  box.setAttribute('aria-label', dict[anime ? 'photo.alt.anime' : 'photo.alt'] ?? box.getAttribute('aria-label'));
  state.photo = photo;
}

async function setLang(lang) {
  const seq = ++state.seq;
  let dict;
  try {
    dict = await loadDict(lang);
  } catch (err) {
    console.error('No se pudo cargar el idioma', err);
    return;
  }
  if (seq !== state.seq) return; // llegó otro cambio de idioma mientras cargaba

  applyTranslations(document, dict);
  document.documentElement.lang = lang;
  document.title = dict['meta.title'] ?? document.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc && dict['meta.desc']) desc.content = dict['meta.desc'];
  $('#lang-toggle').dataset.lang = lang;
  state.lang = lang;
  applyPhoto(state.photo);
  if (state.data) renderData(lang, dict);
  if (state.view) {
    updateChrome(state.view);
    playTitles(document.querySelector(`.view[data-view="${state.view}"]`));
  }
}

// Retraso escalonado de entrada para los hijos de una lista
function stagger(list, prop = '--i') {
  [...list.children].forEach((el, i) => el.style.setProperty(prop, i));
}

const dictNow = () => state.dicts[state.lang] ?? {};

function titleFor(view) {
  const dict = dictNow();
  if (view === 'inicio') return dict['meta.title'] ?? document.title;
  return `${dict[`view.${view}`] ?? view} · Daniel Romero`;
}

function updateChrome(view) {
  $('#route-name').textContent = dictNow()[`view.${view}`] ?? view.toUpperCase();
  document.title = titleFor(view);
}

// Texto real de un título: traducido si tiene clave, si no el original
function realText(el) {
  const key = el.dataset.i18n;
  if (key && dictNow()[key]) return dictNow()[key];
  el.dataset.text ??= el.textContent;
  return el.dataset.text;
}

function playTitles(section) {
  for (const el of section?.querySelectorAll('h1.title, .sec .title, .cta__title, .nf__title') ?? []) {
    const text = realText(el);
    el.setAttribute('aria-label', text);
    scramble(el, text);
  }
}

function playTerminal() {
  const dict = dictNow();
  const text = `> ping dromerCode@gmail.com\n${dict['term.reply'] ?? ''}\n> status\n${dict['term.status'] ?? ''}`;
  typeText($('#term'), text);
}

function onEnter(view, section) {
  state.view = view;
  updateChrome(view);
  playTitles(section);
  if (view === 'inicio') for (const el of section.querySelectorAll('.stat__value')) countUp(el);
  if (view === 'contacto') playTerminal();
}

function fillYears() {
  for (const el of document.querySelectorAll('[data-years-since]')) {
    const [year, month] = el.dataset.yearsSince.split('-').map(Number);
    el.textContent = `${yearsSince(year, month)}+`;
  }
}

async function init() {
  fillYears();
  applyPhoto(readPhoto(storage));
  $('#photo-toggle').addEventListener('click', () => {
    const next = nextPhoto(state.photo);
    savePhoto(storage, next);
    applyPhoto(next);
  });
  $('#lang-toggle').addEventListener('click', () => {
    const next = state.lang === 'es' ? 'en' : 'es';
    saveLang(storage, next);
    setLang(next);
  });

  const lang = pickLang(readStoredLang(storage), navigator.language);
  const booting = shouldBoot(storage, reducedMotion()) ? runBoot(lang).then(() => markBooted(storage)) : null;
  const data = loadData().catch((err) => {
    console.error('No se pudieron cargar los datos', err);
    $('#projects-grid').innerHTML = '<p class="noscript">—</p>';
    return null;
  });

  await setLang(lang);
  await booting;
  startRouter({ onEnter, titleFor });

  state.data = await data;
  if (state.data) renderData(state.lang, dictNow());
}

init();
