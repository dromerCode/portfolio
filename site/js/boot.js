// Secuencia de arranque: solo en la primera visita y nunca con movimiento reducido.
const KEY = 'boot';

const LINES = {
  es: ['> INIT DOSSIER v2.0', '> CARGANDO PERFIL ........ OK', '> MONTANDO HOMELAB ....... OK', '> SINCRONIZANDO PROYECTOS  OK', '> ACCESO CONCEDIDO'],
  en: ['> INIT DOSSIER v2.0', '> LOADING PROFILE ........ OK', '> MOUNTING HOMELAB ....... OK', '> SYNCING PROJECTS ....... OK', '> ACCESS GRANTED'],
};

export const bootLines = (lang) => LINES[lang] ?? LINES.en;

export function shouldBoot(storage, reducedMotion) {
  if (reducedMotion) return false;
  try {
    return storage?.getItem(KEY) !== 'done';
  } catch {
    return true;
  }
}

export function markBooted(storage) {
  try {
    storage?.setItem(KEY, 'done');
  } catch {
    // Sin almacenamiento: el boot se verá también la próxima vez.
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Pinta el overlay y resuelve cuando termina o se salta.
export function runBoot(lang) {
  const skipLabel = lang === 'es' ? 'SALTAR' : 'SKIP';
  const overlay = document.createElement('div');
  overlay.className = 'boot';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `<pre class="boot__log"></pre><button class="boot__skip" type="button">[ ${skipLabel} ]</button>`;
  document.body.append(overlay);
  const log = overlay.querySelector('.boot__log');

  let skipped = false;
  let finish;
  const done = new Promise((r) => { finish = r; });
  const skip = () => { skipped = true; finish(); };
  overlay.addEventListener('click', skip);
  window.addEventListener('keydown', skip, { once: true });

  // El cursor va dentro del texto: como pseudo-elemento, al bajar de línea cuenta como layout shift
  let written = '';
  const show = (current) => { log.textContent = `${written}${current}▌`; };
  (async () => {
    for (const line of bootLines(lang)) {
      for (let i = 1; i <= line.length && !skipped; i += 2) {
        show(line.slice(0, i));
        await wait(12);
      }
      if (skipped) return;
      written += `${line}\n`;
      show('');
      await wait(120);
    }
    await wait(200);
    finish();
  })();

  return done.then(async () => {
    window.removeEventListener('keydown', skip);
    overlay.classList.add('boot--out');
    await wait(450);
    overlay.remove();
  });
}
