// Atajos de teclado y código Konami. Parte pura arriba, enganche al DOM abajo.
const SHORTCUTS = { 1: '/', 2: '/proyectos', 3: '/stack', 4: '/homelab', 5: '/contacto' };
const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

export const shortcutPath = (key) => SHORTCUTS[key] ?? null;

// Devuelve una función que recibe teclas y da true al completar la secuencia
export function konamiMatcher() {
  let buffer = [];
  return (key) => {
    buffer = [...buffer, String(key).toLowerCase()].slice(-KONAMI.length);
    const hit = buffer.length === KONAMI.length && buffer.every((k, i) => k === KONAMI[i]);
    if (hit) buffer = [];
    return hit;
  };
}

export function isTypingTarget(el) {
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || !!el.isContentEditable;
}

export function startKeys({ navigate, openTerminal, toggleHints, konami }) {
  const matchKonami = konamiMatcher();
  document.addEventListener('keydown', (e) => {
    if (matchKonami(e.key)) konami();
    if (isTypingTarget(e.target) || document.querySelector('dialog[open]')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openTerminal(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); openTerminal(); return; }
    if (e.key === '?') { toggleHints(); return; }
    const path = shortcutPath(e.key);
    if (path) navigate(path);
  });
}
