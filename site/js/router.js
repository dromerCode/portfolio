// Router de vistas con History API. La parte pura (rutas) se testea aparte.
const PATHS = { inicio: '/', proyectos: '/proyectos', stack: '/stack', homelab: '/homelab', contacto: '/contacto' };
export const VIEWS = Object.keys(PATHS);
const BY_PATH = Object.fromEntries(Object.entries(PATHS).map(([v, p]) => [p, v]));
const LEGACY = { about: '/', projects: '/proyectos', stack: '/stack', timeline: '/stack', homelab: '/homelab', pichaflix: '/homelab', contact: '/contacto' };

export const pathFor = (view) => PATHS[view] ?? '/';

export function resolveRoute(path) {
  let p = path || '/';
  if (p === '/index.html') p = '/';
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return BY_PATH[p] ?? 'notfound';
}

export function legacyHashRoute(hash) {
  return LEGACY[(hash ?? '').replace(/^#/, '')] ?? null;
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// onEnter(view, section) se llama cada vez que una vista se muestra.
export function startRouter({ onEnter, titleFor }) {
  const sections = [...document.querySelectorAll('.view[data-view]')];
  let current = null;

  function show(view, { animate }) {
    const swap = () => {
      for (const s of sections) s.hidden = s.dataset.view !== view;
      for (const a of document.querySelectorAll('a[data-route]')) {
        if (resolveRoute(new URL(a.href).pathname) === view) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
      document.documentElement.dataset.view = view;
      window.scrollTo(0, 0);
      const section = sections.find((s) => s.dataset.view === view);
      document.title = titleFor(view);
      onEnter(view, section);
      if (animate) section?.querySelector('[data-view-focus]')?.focus({ preventScroll: true });
    };
    current = view;
    if (animate && !reduced() && document.startViewTransition) document.startViewTransition(swap);
    else swap();
  }

  function go(path, push) {
    const view = resolveRoute(path);
    if (push) history.pushState(null, '', path);
    if (view !== current) show(view, { animate: push !== undefined });
  }

  const legacy = legacyHashRoute(location.hash);
  if (legacy) history.replaceState(null, '', legacy);
  go(location.pathname);

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-route]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const path = new URL(a.href).pathname;
    if (path !== location.pathname) go(path, true);
  });
  window.addEventListener('popstate', () => go(location.pathname, false));

  return { navigate: (path) => { if (path !== location.pathname) go(path, true); } };
}
