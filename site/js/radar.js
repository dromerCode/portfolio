import { escapeHTML } from './render.js';

const RADIUS = 80;
const LABEL_RADIUS = 94;
const RINGS = [0.25, 0.5, 0.75, 1];
const LEVELS = { main: 90, secondary: 65, learning: 40 };
const LEVEL_LABELS = {
  es: { main: 'principal', secondary: 'secundario', learning: 'aprendiendo' },
  en: { main: 'main', secondary: 'secondary', learning: 'learning' },
};

export function levelValue(level) {
  return LEVELS[level] ?? 0;
}

const skillValue = (s) => (s.level ? levelValue(s.level) : s.value);

export function clamp(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

const round = (n) => Math.round(n * 100) / 100 + 0; // + 0 evita -0

function axisPoint(i, n, r) {
  const angle = ((-90 + (360 / n) * i) * Math.PI) / 180;
  return [round(r * Math.cos(angle)), round(r * Math.sin(angle))];
}

export function radarPoints(values, radius = RADIUS) {
  return values.map((v, i) => axisPoint(i, values.length, (radius * clamp(v)) / 100));
}

const polygon = (pts) => pts.map(([x, y]) => `${x},${y}`).join(' ');

export function radarSVG(skills, lang) {
  const n = skills.length;
  const rings = RINGS.map(
    (f) => `<polygon class="radar__grid" points="${polygon(skills.map((_, i) => axisPoint(i, n, RADIUS * f)))}"/>`
  ).join('');
  const axes = skills.map((_, i) => {
    const [x, y] = axisPoint(i, n, RADIUS);
    return `M0 0L${x} ${y}`;
  }).join('');
  const pts = radarPoints(skills.map(skillValue));
  const area = `<polygon class="radar__area" points="${polygon(pts)}"/>`;
  const dots = pts.map(([x, y], i) => `<circle class="radar__dot" cx="${x}" cy="${y}" r="2.6" style="--i:${i}"/>`).join('');
  // Barrido: cuña de 40° que gira desde el centro
  const [ex, ey] = axisPoint(-1, 9, RADIUS);
  const sweep = `<g class="radar__sweep"><path d="M0 0L0 ${-RADIUS}A${RADIUS} ${RADIUS} 0 0 0 ${ex} ${ey}Z"/><line x1="0" y1="0" x2="0" y2="${-RADIUS}"/></g>`;
  const labels = skills.map((s, i) => {
    const [x, y] = axisPoint(i, n, LABEL_RADIUS);
    return `<text class="radar__label" x="${x}" y="${y}">${escapeHTML(s[lang] ?? s.es)}</text>`;
  }).join('');
  return `<svg viewBox="-110 -100 220 200" role="presentation">${rings}<path class="radar__grid" d="${axes}"/>${sweep}${area}${dots}${labels}</svg>`;
}

export function radarListHTML(skills, lang) {
  const labels = LEVEL_LABELS[lang] ?? LEVEL_LABELS.es;
  return skills.map((s) => `<li>${escapeHTML(s[lang] ?? s.es)}: ${escapeHTML(labels[s.level] ?? '')}</li>`).join('');
}
