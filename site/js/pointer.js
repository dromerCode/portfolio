// Efectos de puntero: halo que sigue al ratón, foco de luz en cajas e inclinación 3D en proyectos.
// Solo con ratón (no táctil) y sin movimiento reducido.
const TILT = 5; // grados máximos

export function startPointerFx() {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || reduced.matches) return;

  const root = document.documentElement;
  let frame = 0;
  let last = null;

  document.addEventListener('pointermove', (e) => {
    last = e;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      root.style.setProperty('--cx', `${last.clientX}px`);
      root.style.setProperty('--cy', `${last.clientY}px`);
      const box = last.target.closest?.('.box');
      if (!box) return;
      const r = box.getBoundingClientRect();
      const x = last.clientX - r.left;
      const y = last.clientY - r.top;
      box.style.setProperty('--mx', `${x}px`);
      box.style.setProperty('--my', `${y}px`);
      if (box.classList.contains('proj')) {
        box.style.setProperty('--ry', `${((x / r.width) - 0.5) * TILT * 2}deg`);
        box.style.setProperty('--rx', `${(0.5 - (y / r.height)) * TILT * 2}deg`);
      }
    });
  }, { passive: true });

  document.addEventListener('pointerout', (e) => {
    const box = e.target.closest?.('.proj');
    if (box && !box.contains(e.relatedTarget)) {
      box.style.removeProperty('--rx');
      box.style.removeProperty('--ry');
    }
  });
}
