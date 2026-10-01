import { pickLang, readStoredLang, saveLang, applyTranslations } from './i18n.js';
import { yearsSince, projectCardHTML, timelineRowHTML, pickCv, serviceCardHTML, stepHTML, storageRowHTML, stackGroupHTML, escapeHTML } from './render.js';
import { radarSVG, radarListHTML } from './radar.js';

const $ = (sel) => document.querySelector(sel);
const storage = (() => {
  try { return window.localStorage; } catch { return undefined; }
})();

const state = { lang: 'es', dicts: {}, data: null, seq: 0 };

async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function loadDict(lang) {
  state.dicts[lang] ??= await getJSON(`i18n/${lang}.json`);
  return state.dicts[lang];
}

async function loadData() {
  const [profile, projects, timeline, homelab, pichaflix, stack] = await Promise.all([
    getJSON('data/profile.json'),
    getJSON('data/projects.json'),
    getJSON('data/timeline.json'),
    getJSON('data/homelab.json'),
    getJSON('data/pichaflix.json'),
    getJSON('data/stack.json'),
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

  const cv = pickCv(profile.cv, lang);
  for (const a of document.querySelectorAll('[data-cv]')) {
    a.hidden = !cv;
    if (cv) a.href = cv;
  }
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
  if (state.data) renderData(lang, dict);
  state.lang = lang;
}

function fillYears() {
  for (const el of document.querySelectorAll('[data-years-since]')) {
    const [year, month] = el.dataset.yearsSince.split('-').map(Number);
    el.textContent = `${yearsSince(year, month)}+`;
  }
}

async function init() {
  fillYears();
  $('#lang-toggle').addEventListener('click', () => {
    const next = state.lang === 'es' ? 'en' : 'es';
    saveLang(storage, next);
    setLang(next);
  });

  try {
    state.data = await loadData();
  } catch (err) {
    console.error('No se pudieron cargar los datos', err);
    $('#projects-grid').innerHTML = '<p class="noscript">—</p>';
  }

  await setLang(pickLang(readStoredLang(storage), navigator.language));
}

init();
