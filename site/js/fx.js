// Efectos de texto: descifrado tipo terminal y contador. La parte pura (frames) se testea aparte.
const GLYPHS = '#%&@$*+=<>/\\|01ABCDEFXZ';
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function scrambleFrame(text, progress, rand = Math.random) {
  if (progress >= 1) return text;
  const shown = Math.floor(text.length * Math.max(0, progress));
  return [...text].map((ch, i) => {
    if (i < shown || ch === ' ') return ch;
    let g = GLYPHS[Math.floor(rand() * GLYPHS.length)];
    if (g === ch) g = GLYPHS[(GLYPHS.indexOf(g) + 1) % GLYPHS.length];
    return g;
  }).join('');
}

export function countFrame(value, progress) {
  const m = /^(\d+)(.*)$/.exec(value);
  if (!m) return value;
  const eased = 1 - (1 - Math.min(1, Math.max(0, progress))) ** 3;
  return `${Math.round(Number(m[1]) * eased)}${m[2]}`;
}

// Anima frames con requestAnimationFrame; devuelve una función para cancelar.
function animate(duration, onFrame) {
  let raf = 0;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    onFrame(p);
    if (p < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

const running = new WeakMap();

function run(el, duration, frame) {
  running.get(el)?.();
  if (reduced()) { frame(1); return; }
  running.set(el, animate(duration, frame));
}

export function scramble(el, text, duration = 700) {
  // Altura fija mientras dura: los glifos aleatorios pueden partir la línea y empujar el resto (CLS)
  el.style.height = '';
  el.textContent = text;
  el.style.height = `${el.offsetHeight}px`;
  run(el, duration, (p) => {
    el.textContent = scrambleFrame(text, p);
    if (p >= 1) el.style.height = '';
  });
}

export function countUp(el, duration = 900) {
  const value = el.dataset.value ?? el.textContent;
  el.dataset.value = value;
  run(el, duration, (p) => { el.textContent = countFrame(value, p); });
}

// Escribe texto carácter a carácter. El cursor va en el propio texto: como elemento aparte,
// cada salto de línea lo movería y contaría como layout shift.
export function typeText(el, text, speed = 28, cursor = '▌') {
  run(el, Math.max(1, text.length * speed), (p) => { el.textContent = text.slice(0, Math.round(text.length * p)) + cursor; });
}
