# Portfolio pichaDev Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir y publicar en https://portfolio.pichahouse.es un portfolio bilingüe (ES/EN) de una sola página con estética de "expediente de dev" violeta.

**Architecture:** Web estática sin frameworks ni build dentro de `site/`: HTML con los textos fijos en español y atributos `data-i18n`, un CSS y módulos ES (`i18n.js`, `render.js`, `radar.js`, `main.js`) que traducen y pintan proyectos, trayectoria y radar a partir de JSON. La lógica pura (sin DOM) se prueba con `node --test`; la página completa, con playwright-cli. Se sirve con `nginx:alpine` en ZimaOS, detrás de Nginx Proxy Manager y de un CNAME de Cloudflare.

**Tech Stack:** HTML5, CSS, JavaScript (ES modules), Node 24 (`node:test`, solo para los tests), nginx:alpine, Docker Compose, rsync, Nginx Proxy Manager API y Cloudflare DNS.

**Spec:** `docs/superpowers/specs/2026-09-30-portfolio-design.md`

## Global Constraints

- Sin frameworks, sin bundler y sin dependencias npm: `package.json` existe solo para `npm test`.
- Colores: fondo `#1a1a1f`, violeta `#b8b3ff`, apagado `#6d68a8`, texto de lectura `#dcd9ff`, LED `#7dffb0`.
- Fuentes: Orbitron (títulos) y Share Tech Mono (resto), alojadas en `site/assets/fonts/` (woff2) y nunca pedidas a Google Fonts.
- Idiomas: solo `es` y `en`. Orden de elección: `localStorage.lang`, después `navigator.language` (si empieza por `es` → `es`) y si no `en`.
- Responsive: por debajo de 760 px, una sola columna.
- `prefers-reduced-motion: reduce` desactiva todas las animaciones.
- Despliegue: `/DATA/AppData/portfolio/` en `zimaos`, puerto del host `8099` (comprobado libre el 2026-09-30), proxy a `192.168.1.130:8099`.
- DNS: CNAME `portfolio` → `pichaserver.myddns.me`, sin proxy de Cloudflare (nube gris).
- No tocar firewall, SSH ni hardening. No usar contenedores privilegiados.
- Las credenciales de NPM se pasan solo en la línea de comandos del paso que las usa. **Nunca** se escriben en ficheros, commits ni memoria.
- Commits sin atribución a Claude (ni `Co-Authored-By` ni "Generated with").

## Review Focus

1. **Contenido de JSON con caracteres HTML** (`<`, `&`, comillas en títulos o descripciones): tiene que mostrarse como texto, nunca como HTML. Lo cubre el test de `escapeHTML` y el de las tarjetas en Task 3.
2. **URL de repo que no sea `https://`** (por ejemplo `javascript:alert(1)` o vacía): la tarjeta se pinta sin enlace. Test en Task 3.
3. **`localStorage` bloqueado** (modo privado, cookies desactivadas): la página no rompe y usa el idioma del navegador. Test en Task 2.
4. **Clave de traducción que falta en un idioma**: el elemento conserva el texto que ya tenía y no muestra `undefined`. Tests en Task 2 (unidad) y test de paridad de claves ES/EN.
5. **Valores del radar fuera de rango o que no son números** (150, -5, `"80"`, `null`): se recortan a 0–100 y el SVG no sale con `NaN`. Test en Task 4.

---

## File Structure

```
portfolio/
├── package.json                 # solo "test": node --test
├── compose.yaml                 # nginx:alpine, 8099:80, monta ./site y ./nginx.conf
├── nginx.conf                   # server block: gzip + caché de estáticos
├── deploy.sh                    # rsync a zimaos + compose up + nginx reload
├── tests/
│   ├── i18n.test.js             # pickLang, readStoredLang/saveLang, applyTranslations
│   ├── i18n-keys.test.js        # claves data-i18n de index.html presentes en es y en
│   ├── render.test.js           # escapeHTML, localized, projectCardHTML, timelineRowHTML
│   └── radar.test.js            # radarPoints, radarSVG, radarListHTML
└── site/                        # todo lo público (es lo que se sube al servidor)
    ├── index.html
    ├── css/style.css
    ├── js/i18n.js               # idioma: elección, persistencia y traducción del DOM
    ├── js/render.js             # HTML de tarjetas de proyecto y filas de trayectoria
    ├── js/radar.js              # SVG del radar + lista accesible
    ├── js/main.js               # arranque: fetch de JSON, pinta, botón ES/EN
    ├── i18n/es.json
    ├── i18n/en.json
    ├── data/profile.json        # skills del radar + rutas del CV
    ├── data/projects.json
    ├── data/timeline.json
    └── assets/fonts/{orbitron-800.woff2, share-tech-mono-400.woff2}
```

Diferencias con el spec, a propósito:
- Lo público va en `site/` para que `rsync` y el volumen de Docker suban solo eso.
- Los enlaces de GitHub, LinkedIn y correo se escriben directamente en el HTML, porque no cambian con el idioma.
- El "QR" del mockup pasa a ser un botón de descarga del CV: un QR falso engañaría.
- Sin JS se ven los textos fijos en español; proyectos, trayectoria y radar necesitan JS y muestran un aviso con `<noscript>`.

---

### Task 1: Página estática con el estilo completo

**Files:**
- Create: `package.json`, `site/index.html`, `site/css/style.css`, `site/assets/fonts/orbitron-800.woff2`, `site/assets/fonts/share-tech-mono-400.woff2`

**Interfaces:**
- Produces (ids y atributos que usan las tareas siguientes):
  - `#lang-toggle` (button, `data-lang="es|en"`, hijos `span[data-l="es"]` y `span[data-l="en"]`)
  - `#radar` (div vacío para el SVG), `#radar-list` (ul `.sr-only`)
  - `#projects-grid` (div), `#timeline-body` (tbody)
  - `[data-cv]` (enlaces al CV), `[data-i18n="clave"]` (texto) y `[data-i18n-aria="clave"]` (aria-label)
  - Clases CSS para el HTML generado: `.box`, `.proj`, `.proj__cat`, `.proj__title`, `.proj__desc`, `.proj__tags`, `.tag`, `.proj__link`, `.led`, `.led--off`, `.timeline__period`, `.timeline__text`, `.timeline__type`, `.radar__grid`, `.radar__area`, `.radar__label`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "portfolio",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"tests/**/*.test.js\""
  }
}
```

- [ ] **Step 2: Descargar las fuentes**

```bash
mkdir -p site/assets/fonts
curl -sSfL -o site/assets/fonts/orbitron-800.woff2 https://cdn.jsdelivr.net/npm/@fontsource/orbitron@5/files/orbitron-latin-800-normal.woff2
curl -sSfL -o site/assets/fonts/share-tech-mono-400.woff2 https://cdn.jsdelivr.net/npm/@fontsource/share-tech-mono@5/files/share-tech-mono-latin-400-normal.woff2
file site/assets/fonts/*.woff2
```
Expected: los dos ficheros aparecen como `Web Open Font Format (Version 2)`.

- [ ] **Step 3: Escribir `site/index.html`**

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>pichaDev · Portfolio</title>
  <meta name="description" content="Portfolio de pichaDev, estudiante de DAW: desarrollo web, Linux y self-hosting.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://portfolio.pichahouse.es/">
  <meta property="og:title" content="pichaDev · Portfolio">
  <meta property="og:description" content="Estudiante de DAW: desarrollo web, Linux y self-hosting.">
  <meta name="theme-color" content="#1a1a1f">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%231a1a1f'/%3E%3Ctext x='16' y='23' font-family='monospace' font-size='18' font-weight='bold' fill='%23b8b3ff' text-anchor='middle'%3EP%3C/text%3E%3C/svg%3E">
  <link rel="preload" href="assets/fonts/orbitron-800.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/share-tech-mono-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="css/style.css">
  <script type="module" src="js/main.js"></script>
</head>
<body>
  <svg class="mesh" viewBox="0 0 400 600" preserveAspectRatio="none" aria-hidden="true">
    <g>
      <path d="M0 60 Q200 20 400 70"/><path d="M0 140 Q200 100 400 150"/><path d="M0 220 Q200 190 400 230"/>
      <path d="M0 300 Q200 280 400 310"/><path d="M0 380 Q200 370 400 390"/><path d="M0 460 Q200 460 400 470"/>
      <path d="M0 540 Q200 550 400 545"/>
      <path d="M40 0 Q20 300 60 600"/><path d="M120 0 Q100 300 130 600"/><path d="M200 0 Q190 300 200 600"/>
      <path d="M280 0 Q290 300 270 600"/><path d="M360 0 Q380 300 340 600"/>
    </g>
  </svg>

  <div class="page">
    <header class="topbar">
      <span class="topbar__label" data-i18n="profile.label">EXPEDIENTE DEV</span>
      <nav class="topbar__nav" data-i18n-aria="nav.label" aria-label="Principal">
        <a href="#about" data-i18n="nav.about">SOBRE MÍ</a>
        <a href="#projects" data-i18n="nav.projects">PROYECTOS</a>
        <a href="#contact" data-i18n="nav.contact">CONTACTO</a>
        <button id="lang-toggle" class="lang box" type="button" data-lang="es" aria-label="Cambiar idioma / Change language"><span data-l="es">ES</span> / <span data-l="en">EN</span></button>
      </nav>
    </header>

    <main>
      <section id="about" class="dossier">
        <div class="box dossier__main">
          <div class="dossier__head">
            <h1 class="title glow">PICHADEV</h1>
            <span class="dossier__id">ID: DAW-2027</span>
          </div>

          <div class="dossier__row">
            <div class="dossier__photo">
              <div class="photo" role="img" data-i18n-aria="photo.alt" aria-label="Foto de pichaDev"><span>PD</span></div>
              <div class="links">
                <a href="https://github.com/pichaDev" target="_blank" rel="noopener">GITHUB</a>
                <!-- PENDIENTE (Task 7): URL de LinkedIn -->
                <a href="#" data-link="linkedin" target="_blank" rel="noopener">LINKEDIN</a>
                <!-- PENDIENTE (Task 7): correo público -->
                <a href="#" data-link="email">MAIL</a>
              </div>
            </div>
            <div class="dossier__radar">
              <div id="radar" aria-hidden="true"></div>
              <ul id="radar-list" class="sr-only"></ul>
              <noscript><p class="noscript">Activa JavaScript para ver el radar de skills.</p></noscript>
            </div>
          </div>

          <div class="dossier__row">
            <table class="specs">
              <tbody>
                <tr><th scope="row" data-i18n="spec.role.k">ROL:</th><td data-i18n="spec.role.v">DESARROLLADOR WEB</td></tr>
                <tr><th scope="row" data-i18n="spec.edu.k">FORMACIÓN:</th><td data-i18n="spec.edu.v">2º DAW</td></tr>
                <tr><th scope="row" data-i18n="spec.loc.k">UBICACIÓN:</th><td data-i18n="spec.loc.v">ESPAÑA</td></tr>
                <tr><th scope="row" data-i18n="spec.langs.k">IDIOMAS:</th><td>ES · EN</td></tr>
                <tr><th scope="row" data-i18n="spec.status.k">ESTADO:</th><td><span class="led" aria-hidden="true"></span> <span data-i18n="spec.status.v">BUSCANDO PRÁCTICAS</span></td></tr>
              </tbody>
            </table>
            <p class="bio" data-i18n="bio">Estudiante de 2º de DAW. Me interesa todo lo que tenga que ver con ordenadores: desarrollo web, sistemas y lo que se me cruce. Aprendo montando cosas reales y rompiéndolas. Punto débil conocido: las bases de datos, y estoy trabajando en ello.</p>
          </div>
        </div>

        <aside class="dossier__side">
          <div class="box side-box side-box--sign">
            <svg viewBox="0 0 100 60" aria-hidden="true"><path d="M8 45 C 20 10, 30 10, 28 40 S 45 55, 52 25 S 70 5, 72 40 S 88 45, 94 20"/></svg>
            <span class="side-box__label" data-i18n="side.signature">FIRMA</span>
          </div>
          <a class="box side-box side-box--cv" href="assets/cv/cv-es.pdf" data-cv download>
            <span class="cv-icon" aria-hidden="true">↓</span>
            <span class="side-box__label" data-i18n="side.cv">DESCARGAR CV</span>
          </a>
          <div class="box side-box">
            <span class="side-box__label side-box__label--top" data-i18n="side.now.k">AHORA MISMO</span>
            <p class="side-box__text" data-i18n="side.now.v">Aprendiendo DWEC (JS en cliente) y montando este portfolio.</p>
          </div>
        </aside>
      </section>

      <section id="projects">
        <h2 class="sec"><span class="title glow" data-i18n="sec.projects">PROYECTOS</span><span class="sec__line"></span><span class="slashes" aria-hidden="true">/ / / /</span></h2>
        <div id="projects-grid" class="grid">
          <noscript><p class="noscript">Activa JavaScript para ver los proyectos, o mira <a href="https://github.com/pichaDev">github.com/pichaDev</a>.</p></noscript>
        </div>
      </section>

      <section id="timeline">
        <h2 class="sec"><span class="title glow" data-i18n="sec.timeline">TRAYECTORIA</span><span class="sec__line"></span></h2>
        <div class="box timeline">
          <table><tbody id="timeline-body"></tbody></table>
        </div>
      </section>
    </main>

    <footer id="contact" class="footer">
      <div class="footer__links">
        <span class="footer__label" data-i18n="footer.contact">CONTACTO</span>
        <a href="https://github.com/pichaDev" target="_blank" rel="noopener">GITHUB</a>
        <a href="#" data-link="linkedin" target="_blank" rel="noopener">LINKEDIN</a>
        <a href="#" data-link="email">MAIL</a>
        <a href="assets/cv/cv-es.pdf" data-cv download data-i18n="footer.cv">CV</a>
      </div>
      <div class="footer__bar">
        <span class="slashes" aria-hidden="true">/ / / / / /</span>
        <span class="footer__domain">PORTFOLIO.PICHAHOUSE.ES</span>
      </div>
    </footer>
  </div>
</body>
</html>
```

- [ ] **Step 4: Escribir `site/css/style.css`**

```css
@font-face { font-family: "Orbitron"; src: url("../assets/fonts/orbitron-800.woff2") format("woff2"); font-weight: 800; font-display: swap; }
@font-face { font-family: "Share Tech Mono"; src: url("../assets/fonts/share-tech-mono-400.woff2") format("woff2"); font-weight: 400; font-display: swap; }

:root {
  --bg: #1a1a1f;
  --c: #b8b3ff;
  --dim: #6d68a8;
  --txt: #dcd9ff;
  --led: #7dffb0;
  --fill: rgba(90, 80, 255, .55);
  --glow: 0 0 8px rgba(184, 179, 255, .25), inset 0 0 8px rgba(184, 179, 255, .08);
  --mono: "Share Tech Mono", ui-monospace, monospace;
  --display: "Orbitron", var(--mono);
  color-scheme: dark;
}

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--c); font-family: var(--mono); font-size: 15px; line-height: 1.5; }
a { color: var(--c); }
a:focus-visible, button:focus-visible { outline: 2px solid var(--led); outline-offset: 3px; }

.mesh { position: fixed; inset: 0; width: 100%; height: 100%; opacity: .1; pointer-events: none; z-index: 0; }
.mesh path { fill: none; stroke: var(--c); stroke-width: .6; }

.page { position: relative; z-index: 1; max-width: 1040px; margin: 0 auto; padding: 24px 20px 32px; }
.box { border: 1.5px solid var(--c); box-shadow: var(--glow); background: rgba(26, 26, 31, .85); }
.title { font-family: var(--display); font-weight: 800; letter-spacing: .04em; margin: 0; }
.glow { text-shadow: 0 0 10px rgba(184, 179, 255, .6); }
.slashes { letter-spacing: -2px; font-weight: 800; font-size: 18px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.noscript { color: var(--txt); font-size: 13px; }

/* LED */
.led { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--led); box-shadow: 0 0 6px var(--led); animation: blink 1.4s infinite; vertical-align: middle; }
.led--off { background: var(--dim); box-shadow: none; animation: none; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: .2; } }

/* Barra superior */
.topbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
.topbar__label { font-size: 13px; letter-spacing: .1em; }
.topbar__nav { display: flex; gap: 20px; align-items: center; font-size: 12px; }
.topbar__nav a { text-decoration: none; }
.topbar__nav a:hover { text-shadow: 0 0 8px var(--c); }
.lang { font: inherit; color: var(--dim); padding: 3px 8px; cursor: pointer; box-shadow: none; }
.lang [data-l] { color: var(--dim); }
.lang[data-lang="es"] [data-l="es"], .lang[data-lang="en"] [data-l="en"] { color: var(--c); }

/* Ficha */
.dossier { display: grid; grid-template-columns: 3fr 1fr; gap: 16px; margin-top: 14px; }
.dossier__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1.5px solid var(--c); }
.dossier__head .title { font-size: clamp(26px, 5vw, 38px); }
.dossier__id { font-size: 14px; }
.dossier__row { display: grid; grid-template-columns: 1fr 1.2fr; }
.dossier__row + .dossier__row { border-top: 1.5px solid var(--c); }
.dossier__row > :first-child { border-right: 1.5px solid var(--c); }
.dossier__photo { display: flex; flex-direction: column; }
.photo { flex: 1; min-height: 200px; display: grid; place-items: center; background: radial-gradient(circle, #2b2850, var(--bg)); font-family: var(--display); font-size: 42px; color: var(--dim); overflow: hidden; }
.photo img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(.3) contrast(1.05); }
.links { display: flex; justify-content: space-around; gap: 8px; padding: 8px; border-top: 1.5px solid var(--c); font-size: 12px; }
.links a { text-decoration: none; }
.links a:hover { text-shadow: 0 0 8px var(--c); }
.dossier__radar { display: grid; place-items: center; padding: 10px; }
#radar svg { width: 100%; max-width: 280px; display: block; }
.radar__grid { fill: none; stroke: var(--dim); stroke-width: .8; }
.radar__area { fill: var(--fill); stroke: var(--c); stroke-width: 1.5; }
.radar__label { fill: var(--c); font-family: var(--mono); font-size: 8px; text-anchor: middle; dominant-baseline: middle; }

.specs { border-collapse: collapse; font-size: 13px; margin: 12px 16px; width: calc(100% - 32px); align-self: start; }
.specs th, .specs td { border-bottom: 1px solid var(--dim); padding: 5px 2px; font-weight: 400; }
.specs th { text-align: left; color: var(--c); }
.specs td { text-align: right; color: #e6e4ff; }
.bio { margin: 0; padding: 14px 16px; font-size: 14px; line-height: 1.6; color: var(--txt); text-transform: uppercase; }

.dossier__side { display: flex; flex-direction: column; gap: 16px; }
.side-box { flex: 1; min-height: 120px; padding: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 8px; text-decoration: none; }
.side-box svg { width: 90%; }
.side-box svg path { fill: none; stroke: var(--c); stroke-width: 2; stroke-linecap: round; }
.side-box__label { font-size: 10px; letter-spacing: .12em; }
.side-box__label--top { align-self: flex-start; color: var(--dim); }
.side-box__text { margin: 0; font-size: 13px; color: var(--txt); align-self: flex-start; }
.side-box--cv { cursor: pointer; transition: background .15s; }
.side-box--cv:hover { background: rgba(90, 80, 255, .2); }
.cv-icon { font-family: var(--display); font-size: 40px; line-height: 1; text-shadow: 0 0 10px rgba(184, 179, 255, .6); }

/* Secciones */
.sec { display: flex; align-items: center; gap: 12px; margin: 36px 0 14px; font-size: inherit; font-weight: inherit; }
.sec .title { font-size: 20px; }
.sec__line { flex: 1; height: 1px; background: var(--dim); }

/* Proyectos */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
.proj { padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.proj__cat { font-size: 10px; letter-spacing: .15em; color: var(--dim); }
.proj__title { font-family: var(--display); font-weight: 800; font-size: 16px; margin: 0; }
.proj__desc { margin: 0; font-size: 13px; line-height: 1.5; color: var(--txt); flex: 1; }
.proj__tags { display: flex; gap: 5px; flex-wrap: wrap; list-style: none; margin: 0; padding: 0; }
.tag { border: 1px solid var(--dim); padding: 1px 7px; font-size: 10px; }
.proj__link { font-size: 11px; align-self: flex-start; }

/* Trayectoria */
.timeline { padding: 4px 16px; }
.timeline table { width: 100%; border-collapse: collapse; font-size: 13px; }
.timeline td { border-bottom: 1px solid var(--dim); padding: 7px 2px; }
.timeline tr:last-child td { border-bottom: 0; }
.timeline__period { color: var(--dim); width: 100px; white-space: nowrap; }
.timeline__text { color: var(--txt); }
.timeline__type { text-align: right; white-space: nowrap; }

/* Pie */
.footer { margin-top: 36px; }
.footer__links { display: flex; flex-wrap: wrap; gap: 18px; align-items: center; font-size: 13px; }
.footer__label { color: var(--dim); letter-spacing: .12em; }
.footer__bar { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; }
.footer__domain { font-size: 11px; letter-spacing: .2em; }

/* Móvil */
@media (max-width: 760px) {
  .dossier { grid-template-columns: 1fr; }
  .dossier__row { grid-template-columns: 1fr; }
  .dossier__row > :first-child { border-right: 0; border-bottom: 1.5px solid var(--c); }
  .dossier__side { flex-direction: row; flex-wrap: wrap; }
  .side-box { flex: 1 1 140px; }
  .topbar__nav { gap: 14px; }
  .timeline__period { width: auto; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  html { scroll-behavior: auto; }
}
```

- [ ] **Step 5: Ver la página en local**

Run: `python3 -m http.server 8000 -d site` (en segundo plano).
Carga la skill `playwright-cli` y úsala para abrir `http://localhost:8000/`, sacar capturas a 1280×900 y a 375×800 y revisarlas.
Expected: la ficha se parece al mockup aprobado (`.superpowers/brainstorm/*/content/ref3-dossier-v2.html`) y en 375 px no hay scroll horizontal. En consola solo sale el error 404 de `js/main.js`, que aún no existe.

- [ ] **Step 6: Commit**

```bash
git add package.json site/
git commit -m "feat: add static dossier page and styles"
```

---

### Task 2: Módulo de idioma (i18n) y textos ES/EN

**Files:**
- Create: `site/js/i18n.js`, `site/i18n/es.json`, `site/i18n/en.json`
- Test: `tests/i18n.test.js`, `tests/i18n-keys.test.js`

**Interfaces:**
- Consumes: `site/index.html` (atributos `data-i18n` y `data-i18n-aria`, Task 1).
- Produces (`site/js/i18n.js`):
  - `SUPPORTED: string[]` → `['es', 'en']`
  - `pickLang(stored: string|null, navLang: string|undefined): 'es'|'en'`
  - `readStoredLang(storage: Storage|undefined): string|null`: nunca lanza excepciones
  - `saveLang(storage: Storage|undefined, lang: string): void`: nunca lanza excepciones
  - `applyTranslations(root: {querySelectorAll}, dict: Record<string,string>): void`: pone `textContent` a partir de `data-i18n` y `aria-label` a partir de `data-i18n-aria`, y no toca los elementos cuya clave falta en el diccionario

- [ ] **Step 1: Escribir el test que falla, `tests/i18n.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED, pickLang, readStoredLang, saveLang, applyTranslations } from '../site/js/i18n.js';

test('SUPPORTED is es and en', () => {
  assert.deepEqual(SUPPORTED, ['es', 'en']);
});

test('pickLang prefers a valid stored language', () => {
  assert.equal(pickLang('en', 'es-ES'), 'en');
  assert.equal(pickLang('es', 'en-US'), 'es');
});

test('pickLang ignores invalid stored values and uses navigator', () => {
  assert.equal(pickLang('fr', 'es-ES'), 'es');
  assert.equal(pickLang('', 'es'), 'es');
  assert.equal(pickLang(null, 'ES-mx'), 'es');
});

test('pickLang falls back to en', () => {
  assert.equal(pickLang(null, 'de-DE'), 'en');
  assert.equal(pickLang(null, undefined), 'en');
});

test('readStoredLang returns null when storage throws or is missing', () => {
  const broken = { getItem() { throw new Error('SecurityError'); } };
  assert.equal(readStoredLang(broken), null);
  assert.equal(readStoredLang(undefined), null);
});

test('saveLang + readStoredLang round-trip', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  saveLang(storage, 'en');
  assert.equal(readStoredLang(storage), 'en');
});

test('saveLang does not throw when storage throws', () => {
  const broken = { setItem() { throw new Error('QuotaExceeded'); } };
  assert.doesNotThrow(() => saveLang(broken, 'en'));
  assert.doesNotThrow(() => saveLang(undefined, 'en'));
});

function fakeRoot(elements) {
  return {
    querySelectorAll(sel) {
      if (sel === '[data-i18n]') return elements.filter((e) => e.dataset.i18n);
      if (sel === '[data-i18n-aria]') return elements.filter((e) => e.dataset.i18nAria);
      return [];
    },
  };
}
function el(dataset, text = '') {
  const attrs = {};
  return { dataset, textContent: text, attrs, setAttribute(k, v) { attrs[k] = v; } };
}

test('applyTranslations sets text and aria-label', () => {
  const a = el({ i18n: 'nav.about' }, 'SOBRE MÍ');
  const b = el({ i18nAria: 'photo.alt' });
  applyTranslations(fakeRoot([a, b]), { 'nav.about': 'ABOUT', 'photo.alt': 'Photo of pichaDev' });
  assert.equal(a.textContent, 'ABOUT');
  assert.equal(b.attrs['aria-label'], 'Photo of pichaDev');
});

test('applyTranslations keeps existing text when key is missing', () => {
  const a = el({ i18n: 'missing.key' }, 'ORIGINAL');
  applyTranslations(fakeRoot([a]), {});
  assert.equal(a.textContent, 'ORIGINAL');
});
```

- [ ] **Step 2: Ejecutarlo y comprobar que falla**

Run: `npm test`
Expected: FAIL con `Cannot find module '.../site/js/i18n.js'`.

- [ ] **Step 3: Implementar `site/js/i18n.js`**

```js
export const SUPPORTED = ['es', 'en'];
const KEY = 'lang';

export function pickLang(stored, navLang) {
  if (SUPPORTED.includes(stored)) return stored;
  if (typeof navLang === 'string' && navLang.toLowerCase().startsWith('es')) return 'es';
  return 'en';
}

export function readStoredLang(storage) {
  try {
    return storage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}

export function saveLang(storage, lang) {
  try {
    storage?.setItem(KEY, lang);
  } catch {
    // Sin almacenamiento (modo privado, etc.): el idioma dura solo esta visita.
  }
}

export function applyTranslations(root, dict) {
  for (const node of root.querySelectorAll('[data-i18n]')) {
    const text = dict[node.dataset.i18n];
    if (typeof text === 'string') node.textContent = text;
  }
  for (const node of root.querySelectorAll('[data-i18n-aria]')) {
    const text = dict[node.dataset.i18nAria];
    if (typeof text === 'string') node.setAttribute('aria-label', text);
  }
}
```

- [ ] **Step 4: Ejecutarlo y comprobar que pasa**

Run: `npm test`
Expected: PASS, 9 tests.

- [ ] **Step 5: Escribir el test de claves, `tests/i18n-keys.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../site/${p}`, import.meta.url), 'utf8');
const html = read('index.html');
const es = JSON.parse(read('i18n/es.json'));
const en = JSON.parse(read('i18n/en.json'));
const EXTRA = ['meta.title', 'meta.desc'];

const htmlKeys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]);

test('index.html uses at least one i18n key', () => {
  assert.ok(htmlKeys.length > 10);
});

for (const [name, dict] of [['es', es], ['en', en]]) {
  test(`${name}.json has every key used in index.html plus meta keys`, () => {
    const missing = [...htmlKeys, ...EXTRA].filter((k) => typeof dict[k] !== 'string' || dict[k] === '');
    assert.deepEqual(missing, []);
  });
}

test('es.json and en.json have the same keys', () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
});
```

- [ ] **Step 6: Ejecutarlo y comprobar que falla**

Run: `npm test`
Expected: FAIL con `ENOENT ... i18n/es.json`.

- [ ] **Step 7: Crear `site/i18n/es.json`**

```json
{
  "meta.title": "pichaDev · Portfolio",
  "meta.desc": "Portfolio de pichaDev, estudiante de DAW: desarrollo web, Linux y self-hosting.",
  "profile.label": "EXPEDIENTE DEV",
  "nav.label": "Principal",
  "nav.about": "SOBRE MÍ",
  "nav.projects": "PROYECTOS",
  "nav.contact": "CONTACTO",
  "photo.alt": "Foto de pichaDev",
  "spec.role.k": "ROL:",
  "spec.role.v": "DESARROLLADOR WEB",
  "spec.edu.k": "FORMACIÓN:",
  "spec.edu.v": "2º DAW",
  "spec.loc.k": "UBICACIÓN:",
  "spec.loc.v": "ESPAÑA",
  "spec.langs.k": "IDIOMAS:",
  "spec.status.k": "ESTADO:",
  "spec.status.v": "BUSCANDO PRÁCTICAS",
  "bio": "Estudiante de 2º de DAW. Me interesa todo lo que tenga que ver con ordenadores: desarrollo web, sistemas y lo que se me cruce. Aprendo montando cosas reales y rompiéndolas. Punto débil conocido: las bases de datos, y estoy trabajando en ello.",
  "side.signature": "FIRMA",
  "side.cv": "DESCARGAR CV",
  "side.now.k": "AHORA MISMO",
  "side.now.v": "Aprendiendo DWEC (JS en cliente) y montando este portfolio.",
  "sec.projects": "PROYECTOS",
  "sec.timeline": "TRAYECTORIA",
  "footer.contact": "CONTACTO",
  "footer.cv": "CV",
  "project.repo": "VER REPO →"
}
```

- [ ] **Step 8: Crear `site/i18n/en.json`**

```json
{
  "meta.title": "pichaDev · Portfolio",
  "meta.desc": "Portfolio of pichaDev, web development student: web dev, Linux and self-hosting.",
  "profile.label": "DEV PROFILE",
  "nav.label": "Main",
  "nav.about": "ABOUT",
  "nav.projects": "PROJECTS",
  "nav.contact": "CONTACT",
  "photo.alt": "Photo of pichaDev",
  "spec.role.k": "ROLE:",
  "spec.role.v": "WEB DEVELOPER",
  "spec.edu.k": "EDUCATION:",
  "spec.edu.v": "WEB DEV DEGREE (2ND YR)",
  "spec.loc.k": "LOCATION:",
  "spec.loc.v": "SPAIN",
  "spec.langs.k": "LANGUAGES:",
  "spec.status.k": "STATUS:",
  "spec.status.v": "SEEKING INTERNSHIP",
  "bio": "Second-year web development student. I'm into anything computer-related: web development, systems and whatever catches my eye. I learn by building real things and breaking them. Known weak spot: databases, and I'm working on it.",
  "side.signature": "SIGNATURE",
  "side.cv": "DOWNLOAD CV",
  "side.now.k": "RIGHT NOW",
  "side.now.v": "Learning client-side JavaScript and building this portfolio.",
  "sec.projects": "PROJECTS",
  "sec.timeline": "TIMELINE",
  "footer.contact": "CONTACT",
  "footer.cv": "CV",
  "project.repo": "VIEW REPO →"
}
```

- [ ] **Step 9: Ejecutarlo y comprobar que pasa**

Run: `npm test`
Expected: PASS, 13 tests.

- [ ] **Step 10: Commit**

```bash
git add site/js/i18n.js site/i18n tests/i18n.test.js tests/i18n-keys.test.js
git commit -m "feat: add i18n module and es/en texts"
```

---

### Task 3: Proyectos y trayectoria (render + datos)

**Files:**
- Create: `site/js/render.js`, `site/data/projects.json`, `site/data/timeline.json`
- Test: `tests/render.test.js`

**Interfaces:**
- Consumes: clases CSS de Task 1 (`.box`, `.proj*`, `.tag`, `.led`, `.led--off`, `.timeline__*`).
- Produces (`site/js/render.js`):
  - `escapeHTML(value: unknown): string`: escapa `& < > " '`; `null` o `undefined` → `''`
  - `localized(obj: {es?, en?}, lang: 'es'|'en'): object`: `obj[lang]` o, si falta, `obj.es` o, si falta, `{}`
  - `safeUrl(url: unknown): string|null`: solo acepta cadenas que empiezan por `https://`
  - `projectCardHTML(project: Project, lang, index: number, repoLabel: string): string`
  - `timelineRowHTML(entry: TimelineEntry, lang): string`
  - Tipos de datos:
    - `Project = { id: string, tags: string[], repo: string|null, es: {category, title, desc}, en: {category, title, desc} }`
    - `TimelineEntry = { period: string, led: boolean, es: {text, type}, en: {text, type} }`

- [ ] **Step 1: Escribir el test que falla, `tests/render.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHTML, localized, safeUrl, projectCardHTML, timelineRowHTML } from '../site/js/render.js';

const project = {
  id: 'pichaflix',
  tags: ['DOCKER', 'LINUX'],
  repo: 'https://github.com/pichaDev/x',
  es: { category: 'HOMELAB', title: 'PICHAFLIX', desc: 'Servidor multimedia' },
  en: { category: 'HOMELAB', title: 'PICHAFLIX', desc: 'Media server' },
};

test('escapeHTML escapes special characters', () => {
  assert.equal(escapeHTML(`<b>"a" & 'b'</b>`), '&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;');
  assert.equal(escapeHTML(null), '');
  assert.equal(escapeHTML(undefined), '');
  assert.equal(escapeHTML(42), '42');
});

test('localized picks language, falls back to es, then {}', () => {
  assert.equal(localized({ es: { t: 'hola' }, en: { t: 'hi' } }, 'en').t, 'hi');
  assert.equal(localized({ es: { t: 'hola' } }, 'en').t, 'hola');
  assert.deepEqual(localized({}, 'en'), {});
});

test('safeUrl only allows https', () => {
  assert.equal(safeUrl('https://github.com/a'), 'https://github.com/a');
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('http://x.com'), null);
  assert.equal(safeUrl(''), null);
  assert.equal(safeUrl(null), null);
});

test('projectCardHTML renders number, category, title, desc, tags and repo link', () => {
  const html = projectCardHTML(project, 'en', 0, 'VIEW REPO →');
  assert.match(html, /#01 · HOMELAB/);
  assert.match(html, /<h3 class="proj__title">PICHAFLIX<\/h3>/);
  assert.match(html, /Media server/);
  assert.match(html, /<li class="tag">DOCKER<\/li>/);
  assert.match(html, /href="https:\/\/github.com\/pichaDev\/x"/);
  assert.match(html, /VIEW REPO →/);
});

test('projectCardHTML escapes content from JSON', () => {
  const evil = { ...project, tags: ['<img>'], en: { category: 'A&B', title: '<script>x</script>', desc: '"q"' } };
  const html = projectCardHTML(evil, 'en', 1, 'REPO');
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img>/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.match(html, /A&amp;B/);
});

test('projectCardHTML omits link when repo is missing or unsafe', () => {
  assert.doesNotMatch(projectCardHTML({ ...project, repo: null }, 'es', 0, 'REPO'), /<a /);
  assert.doesNotMatch(projectCardHTML({ ...project, repo: 'javascript:alert(1)' }, 'es', 0, 'REPO'), /<a /);
});

test('projectCardHTML tolerates missing tags', () => {
  const { tags, ...noTags } = project;
  assert.doesNotThrow(() => projectCardHTML(noTags, 'es', 0, 'REPO'));
});

test('timelineRowHTML renders period, text and type with led state', () => {
  const on = timelineRowHTML({ period: '2026', led: true, es: { text: 'FCT', type: 'PENDIENTE' }, en: { text: 'Internship', type: 'PENDING' } }, 'en');
  assert.match(on, /<td class="timeline__period">2026<\/td>/);
  assert.match(on, /Internship/);
  assert.match(on, /class="led"/);
  assert.match(on, /PENDING/);
  const off = timelineRowHTML({ period: '2025', led: false, es: { text: 'DAW', type: 'FORMACIÓN' } }, 'en');
  assert.doesNotMatch(off, /class="led/);
  assert.match(off, /FORMACIÓN/);
});
```

- [ ] **Step 2: Ejecutarlo y comprobar que falla**

Run: `npm test`
Expected: FAIL con `Cannot find module '.../site/js/render.js'`.

- [ ] **Step 3: Implementar `site/js/render.js`**

```js
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export function localized(obj, lang) {
  return obj?.[lang] ?? obj?.es ?? {};
}

export function safeUrl(url) {
  return typeof url === 'string' && url.startsWith('https://') ? url : null;
}

export function projectCardHTML(project, lang, index, repoLabel) {
  const t = localized(project, lang);
  const num = String(index + 1).padStart(2, '0');
  const tags = (project.tags ?? []).map((tag) => `<li class="tag">${escapeHTML(tag)}</li>`).join('');
  const url = safeUrl(project.repo);
  const link = url
    ? `<a class="proj__link" href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(repoLabel)}</a>`
    : '';
  return `<article class="box proj">
  <span class="proj__cat">#${num} · ${escapeHTML(t.category)}</span>
  <h3 class="proj__title">${escapeHTML(t.title)}</h3>
  <p class="proj__desc">${escapeHTML(t.desc)}</p>
  <ul class="proj__tags">${tags}</ul>
  ${link}
</article>`;
}

export function timelineRowHTML(entry, lang) {
  const t = localized(entry, lang);
  const led = entry.led ? '<span class="led" aria-hidden="true"></span> ' : '';
  return `<tr>
  <td class="timeline__period">${escapeHTML(entry.period)}</td>
  <td class="timeline__text">${escapeHTML(t.text)}</td>
  <td class="timeline__type">${led}${escapeHTML(t.type)}</td>
</tr>`;
}
```

- [ ] **Step 4: Ejecutarlo y comprobar que pasa**

Run: `npm test`
Expected: PASS (todos los tests de `render.test.js` y los anteriores).

- [ ] **Step 5: Crear `site/data/projects.json`**

```json
[
  {
    "id": "pichaflix",
    "tags": ["DOCKER", "LINUX", "JELLYFIN"],
    "repo": null,
    "es": { "category": "HOMELAB", "title": "PICHAFLIX", "desc": "Servidor multimedia con Jellyfin, stack ARR y unos 15TB, montado sobre ZimaOS y un NAS OMV en RAID5." },
    "en": { "category": "HOMELAB", "title": "PICHAFLIX", "desc": "Media server with Jellyfin, the ARR stack and around 15TB, running on ZimaOS and an OMV NAS in RAID5." }
  },
  {
    "id": "cicd",
    "tags": ["GITHUB ACTIONS", "DOCKER", "NODE"],
    "repo": "https://github.com/pichaDev/proyecto-cicd-daw",
    "es": { "category": "DEVOPS", "title": "CI/CD DAW", "desc": "Pipeline con GitHub Actions y Docker para probar y desplegar una app de Node.js." },
    "en": { "category": "DEVOPS", "title": "CI/CD DAW", "desc": "GitHub Actions and Docker pipeline to test and deploy a Node.js app." }
  },
  {
    "id": "juegonaves",
    "tags": ["JAVA", "EQUIPO"],
    "repo": "https://github.com/pichaDev/juegoNaves",
    "es": { "category": "JUEGO", "title": "JUEGONAVES", "desc": "Shooter espacial en Java, proyecto en grupo para clase." },
    "en": { "category": "GAME", "title": "JUEGONAVES", "desc": "Space shooter in Java, a group project for class." }
  },
  {
    "id": "cursophp",
    "tags": ["PHP"],
    "repo": "https://github.com/pichaDev/cursophp",
    "es": { "category": "APRENDIZAJE", "title": "CURSO PHP", "desc": "Curso de PHP desde cero, con ejercicios y apuntes." },
    "en": { "category": "LEARNING", "title": "PHP COURSE", "desc": "PHP course from scratch, with exercises and notes." }
  }
]
```

- [ ] **Step 6: Crear `site/data/timeline.json`**

```json
[
  {
    "period": "2025 – 27",
    "led": false,
    "es": { "text": "Grado Superior en Desarrollo de Aplicaciones Web", "type": "FORMACIÓN" },
    "en": { "text": "Higher Technical Degree in Web Application Development", "type": "EDUCATION" }
  },
  {
    "period": "2026",
    "led": true,
    "es": { "text": "FCT / prácticas en empresa", "type": "PENDIENTE" },
    "en": { "text": "Company internship (FCT)", "type": "PENDING" }
  }
]
```

- [ ] **Step 7: Comprobar que los JSON son válidos**

Run: `node -e "for (const f of ['projects','timeline']) JSON.parse(require('fs').readFileSync('site/data/'+f+'.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 8: Commit**

```bash
git add site/js/render.js site/data/projects.json site/data/timeline.json tests/render.test.js
git commit -m "feat: add project and timeline rendering"
```

---

### Task 4: Radar de skills

**Files:**
- Create: `site/js/radar.js`, `site/data/profile.json`
- Test: `tests/radar.test.js`

**Interfaces:**
- Consumes: `escapeHTML` de `site/js/render.js` (Task 3) y las clases `.radar__grid`, `.radar__area` y `.radar__label` (Task 1).
- Produces (`site/js/radar.js`):
  - `Skill = { value: number, es: string, en: string }`, con los ejes en orden desde arriba y en sentido horario
  - `clamp(value: unknown): number`: 0–100; lo que no es número finito cuenta como 0
  - `radarPoints(values: unknown[], radius = 80): [number, number][]`: el eje i va en el ángulo `-90° + i·(360/n)`, redondeado a 2 decimales
  - `radarSVG(skills: Skill[], lang): string`: `<svg viewBox="-110 -100 220 200">…</svg>`
  - `radarListHTML(skills: Skill[], lang): string`: `<li>FRONTEND: 78/100</li>…`
- Produces (`site/data/profile.json`): `{ skills: Skill[], cv: { es: string|null, en: string|null } }`

- [ ] **Step 1: Escribir el test que falla, `tests/radar.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, radarPoints, radarSVG, radarListHTML } from '../site/js/radar.js';

const skills = [
  { value: 100, es: 'FRONTEND', en: 'FRONTEND' },
  { value: 50, es: 'LINUX', en: 'LINUX' },
  { value: 0, es: 'DEVOPS', en: 'DEVOPS' },
  { value: 50, es: 'BBDD', en: 'DATABASES' },
  { value: 50, es: 'BACKEND', en: 'BACKEND' },
  { value: 50, es: 'JAVA', en: 'JAVA' },
];

test('clamp keeps 0..100 and turns junk into 0', () => {
  assert.equal(clamp(50), 50);
  assert.equal(clamp(150), 100);
  assert.equal(clamp(-5), 0);
  assert.equal(clamp('80'), 0);
  assert.equal(clamp(null), 0);
  assert.equal(clamp(NaN), 0);
});

test('radarPoints: first axis points straight up, second at 30° below horizontal', () => {
  const pts = radarPoints([100, 100, 100, 100, 100, 100], 80);
  assert.deepEqual(pts[0], [0, -80]);
  assert.deepEqual(pts[1], [69.28, -40]);
  assert.deepEqual(pts[3], [0, 80]);
});

test('radarPoints scales by value and clamps', () => {
  const pts = radarPoints([50, 0, 150, -10, 'x', null], 80);
  assert.deepEqual(pts[0], [0, -40]);
  assert.deepEqual(pts[1], [0, 0]);
  assert.deepEqual(pts[2], [69.28, 40]);
  for (const [x, y] of pts) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
  }
});

test('radarSVG has 4 grid rings, one area and localized labels, no NaN', () => {
  const svg = radarSVG(skills, 'en');
  assert.match(svg, /^<svg viewBox="-110 -100 220 200"/);
  assert.equal((svg.match(/class="radar__grid"/g) ?? []).length, 4 + 1);
  assert.equal((svg.match(/class="radar__area"/g) ?? []).length, 1);
  assert.match(svg, />DATABASES</);
  assert.doesNotMatch(svg, /NaN/);
});

test('radarSVG escapes labels', () => {
  const svg = radarSVG([{ value: 10, es: '<x>', en: '<x>' }, ...skills.slice(1)], 'es');
  assert.doesNotMatch(svg, /<x>/);
});

test('radarListHTML lists every skill with its value', () => {
  const html = radarListHTML(skills, 'es');
  assert.match(html, /<li>FRONTEND: 100\/100<\/li>/);
  assert.match(html, /<li>BBDD: 50\/100<\/li>/);
  assert.equal((html.match(/<li>/g) ?? []).length, 6);
});
```

Nota: `radarSVG` produce 4 anillos más un único `<path class="radar__grid">` con los ejes. Por eso en el test hay `4 + 1` apariciones.

- [ ] **Step 2: Ejecutarlo y comprobar que falla**

Run: `npm test`
Expected: FAIL con `Cannot find module '.../site/js/radar.js'`.

- [ ] **Step 3: Implementar `site/js/radar.js`**

```js
import { escapeHTML } from './render.js';

const RADIUS = 80;
const LABEL_RADIUS = 94;
const RINGS = [0.25, 0.5, 0.75, 1];

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
  const area = `<polygon class="radar__area" points="${polygon(radarPoints(skills.map((s) => s.value)))}"/>`;
  const labels = skills.map((s, i) => {
    const [x, y] = axisPoint(i, n, LABEL_RADIUS);
    return `<text class="radar__label" x="${x}" y="${y}">${escapeHTML(s[lang] ?? s.es)}</text>`;
  }).join('');
  return `<svg viewBox="-110 -100 220 200" role="presentation">${rings}<path class="radar__grid" d="${axes}"/>${area}${labels}</svg>`;
}

export function radarListHTML(skills, lang) {
  return skills.map((s) => `<li>${escapeHTML(s[lang] ?? s.es)}: ${clamp(s.value)}/100</li>`).join('');
}
```

- [ ] **Step 4: Ejecutarlo y comprobar que pasa**

Run: `npm test`
Expected: PASS (todos).

- [ ] **Step 5: Crear `site/data/profile.json`**

`cv` se queda en `null` hasta que Picha pase los PDF (Task 7). Con `null`, los enlaces al CV se ocultan.

```json
{
  "skills": [
    { "value": 78, "es": "FRONTEND", "en": "FRONTEND" },
    { "value": 80, "es": "LINUX", "en": "LINUX" },
    { "value": 72, "es": "DEVOPS", "en": "DEVOPS" },
    { "value": 45, "es": "BBDD", "en": "DATABASES" },
    { "value": 60, "es": "BACKEND", "en": "BACKEND" },
    { "value": 62, "es": "JAVA", "en": "JAVA" }
  ],
  "cv": { "es": null, "en": null }
}
```

- [ ] **Step 6: Commit**

```bash
git add site/js/radar.js site/data/profile.json tests/radar.test.js
git commit -m "feat: add skills radar"
```

---

### Task 5: Arranque (main.js) y prueba de la página completa

**Files:**
- Create: `site/js/main.js`

**Interfaces:**
- Consumes: `pickLang`, `readStoredLang`, `saveLang` y `applyTranslations` (Task 2); `projectCardHTML` y `timelineRowHTML` (Task 3); `radarSVG` y `radarListHTML` (Task 4); los ids de Task 1; `profile.json`, `projects.json` y `timeline.json`.
- Produces: la página funcionando. Nadie importa este módulo.

- [ ] **Step 1: Implementar `site/js/main.js`**

```js
import { pickLang, readStoredLang, saveLang, applyTranslations } from './i18n.js';
import { projectCardHTML, timelineRowHTML } from './render.js';
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
  const [profile, projects, timeline] = await Promise.all([
    getJSON('data/profile.json'),
    getJSON('data/projects.json'),
    getJSON('data/timeline.json'),
  ]);
  return { profile, projects, timeline };
}

function renderData(lang, dict) {
  const { profile, projects, timeline } = state.data;
  $('#radar').innerHTML = radarSVG(profile.skills, lang);
  $('#radar-list').innerHTML = radarListHTML(profile.skills, lang);
  const repoLabel = dict['project.repo'] ?? 'REPO →';
  $('#projects-grid').innerHTML = projects.map((p, i) => projectCardHTML(p, lang, i, repoLabel)).join('');
  $('#timeline-body').innerHTML = timeline.map((e) => timelineRowHTML(e, lang)).join('');

  const cv = profile.cv?.[lang] ?? profile.cv?.es ?? null;
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

async function init() {
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
```

- [ ] **Step 2: Pasar los tests unitarios**

Run: `npm test`
Expected: PASS (todos).

- [ ] **Step 3: Comprobar la página completa con playwright-cli**

Levanta `python3 -m http.server 8000 -d site` (en segundo plano) y carga la skill `playwright-cli`. Comprueba en `http://localhost:8000/`:
1. No hay errores en consola.
2. Con el navegador en `es-ES`: `[data-i18n="sec.projects"]` muestra "PROYECTOS", hay 4 `article.proj`, 2 filas en `#timeline-body` y `#radar svg` existe.
3. Tras pulsar `#lang-toggle`: el texto de `[data-i18n="nav.about"]` es "ABOUT", `document.documentElement.lang === 'en'` y el radar muestra "DATABASES".
4. Al recargar sigue en inglés (localStorage).
5. `[data-cv]` tiene `hidden`.
6. Capturas a 1280×900 y 375×800 sin scroll horizontal (`document.documentElement.scrollWidth <= window.innerWidth`).

Expected: se cumplen los 6 puntos. Si falla alguno, corrígelo antes del commit.

- [ ] **Step 4: Commit**

```bash
git add site/js/main.js
git commit -m "feat: wire up language switch and data rendering"
```

---

### Task 6: Docker, nginx y script de despliegue (probado en local)

**Files:**
- Create: `compose.yaml`, `nginx.conf`, `deploy.sh`

**Interfaces:**
- Consumes: `site/` completo (Tasks 1–5).
- Produces: el contenedor `portfolio` escuchando en `8099:80`, y `./deploy.sh`, que Task 7 ejecuta contra `zimaos`.

- [ ] **Step 1: Crear `nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location ~* \.(woff2|pdf|jpg|jpeg|png|webp|svg)$ {
        expires 30d;
        add_header Cache-Control "public";
    }

    location ~* \.(css|js|json)$ {
        expires 1h;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

- [ ] **Step 2: Crear `compose.yaml`**

```yaml
services:
  portfolio:
    image: nginx:alpine
    container_name: portfolio
    restart: unless-stopped
    ports:
      - "8099:80"
    volumes:
      - ./site:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

- [ ] **Step 3: Probar en local**

```bash
docker compose up -d
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8099/
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:8099/js/main.js
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8099/no-existe
curl -sI -H "Accept-Encoding: gzip" http://localhost:8099/css/style.css | grep -i content-encoding
docker compose down
```
Expected: `200`, `200 application/javascript`, `404` y `Content-Encoding: gzip`.

- [ ] **Step 4: Crear `deploy.sh`**

```bash
#!/usr/bin/env bash
# Sube el portfolio a ZimaOS y (re)arranca el contenedor.
set -euo pipefail
cd "$(dirname "$0")"

HOST=zimaos
DEST=/DATA/AppData/portfolio

ssh "$HOST" "mkdir -p $DEST/site"
rsync -av --delete site/ "$HOST:$DEST/site/"
rsync -av compose.yaml nginx.conf "$HOST:$DEST/"
ssh "$HOST" "cd $DEST && docker compose up -d && docker compose exec -T portfolio nginx -s reload"
echo "Desplegado en $HOST:$DEST"
```

Run: `chmod +x deploy.sh && bash -n deploy.sh`
Expected: sin salida (la sintaxis es correcta).

- [ ] **Step 5: Commit**

```bash
git add compose.yaml nginx.conf deploy.sh
git commit -m "feat: add nginx container and deploy script"
```

---

### Task 7: Contenido pendiente, publicación y dominio

**Files:**
- Modify: `site/index.html` (enlaces de LinkedIn y correo), `site/data/profile.json` (`cv`)
- Create (si Picha los pasa): `site/assets/cv/cv-es.pdf`, `site/assets/cv/cv-en.pdf`, `site/assets/img/photo.jpg`

**Interfaces:**
- Consumes: `deploy.sh` (Task 6) y el HTML y los datos de las tareas anteriores.
- Produces: https://portfolio.pichahouse.es funcionando.

- [ ] **Step 1: Pedir a Picha el contenido pendiente**

Pregunta en el chat, en una sola vez:
1. URL de LinkedIn (o si prefiere quitar ese enlace).
2. Correo de contacto público.
3. CV en PDF (ES y/o EN) y foto (opcionales).

Aplica las respuestas:
- LinkedIn: en los dos `a[data-link="linkedin"]` de `site/index.html`, cambia `href="#"` por la URL. Si no tiene, borra esos dos `<a>` y su comentario `PENDIENTE`.
- Correo: en los dos `a[data-link="email"]`, cambia `href="#"` por `mailto:<correo>` y borra el comentario `PENDIENTE`.
- CV: copia los PDF a `site/assets/cv/` y en `site/data/profile.json` pon `"cv": { "es": "assets/cv/cv-es.pdf", "en": "assets/cv/cv-en.pdf" }`. Si solo hay uno, las dos claves apuntan al mismo fichero. Si no hay ninguno, se deja `null`.
- Foto: cópiala a `site/assets/img/photo.jpg` y sustituye `<span>PD</span>` dentro de `.photo` por `<img src="assets/img/photo.jpg" alt="" width="400" height="400">`.

Run: `npm test && grep -n 'href="#"' site/index.html || echo "sin enlaces vacíos"`
Expected: tests en PASS y `sin enlaces vacíos`.

Commit:
```bash
git add site/
git commit -m "feat: add contact links and personal content"
```

- [ ] **Step 2: Subir a GitHub**

Confirma con Picha si el repo va **público** (recomendado para un portfolio) o privado. Después:
```bash
gh repo create pichaDev/portfolio --public --source . --remote origin --push
```
(Usa `--private` si lo pide así.)
Expected: el repo aparece en `https://github.com/pichaDev/portfolio`.

- [ ] **Step 3: Desplegar en ZimaOS**

Run: `ssh zimaos 'ss -ltn | grep -c ":8099 "'`
Expected: `0` (el puerto sigue libre; si no, elige otro y cámbialo en `compose.yaml` y en el Step 5).

Run: `./deploy.sh`, y después `ssh zimaos 'curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8099/'`
Expected: `200`.

- [ ] **Step 4: DNS en Cloudflare**

Carga `mcp__plugin_cloudflare_cloudflare__search` y `mcp__plugin_cloudflare_cloudflare__execute` con ToolSearch. Busca la zona `pichahouse.es` y crea un registro:
`type: CNAME, name: portfolio, content: pichaserver.myddns.me, proxied: false, ttl: 1 (auto)`.
Si la integración no tiene acceso a la zona, para y pide a Picha que lo cree a mano con esos mismos valores.

Run: `dig +short @1.1.1.1 portfolio.pichahouse.es`
Expected: `pichaserver.myddns.me.` seguido de la IP pública (lo mismo que devuelve `pichaflix.pichahouse.es`). Puede tardar un par de minutos.

- [ ] **Step 5: Proxy host en Nginx Proxy Manager**

Solo cuando el DNS ya resuelve (Let's Encrypt lo necesita). Las credenciales las pasa Picha en el chat: se usan inline y **nunca se guardan en un fichero**. Todo se ejecuta dentro de `zimaos`, contra el puerto 81 local:

```bash
ssh zimaos 'TOKEN=$(curl -s -X POST http://localhost:81/api/tokens -H "Content-Type: application/json" \
  -d "{\"identity\":\"<EMAIL_NPM>\",\"secret\":\"<PASSWORD_NPM>\"}" | sed -n "s/.*\"token\":\"\([^\"]*\)\".*/\1/p");
  curl -s -X POST http://localhost:81/api/nginx/proxy-hosts -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{
    \"domain_names\":[\"portfolio.pichahouse.es\"],
    \"forward_scheme\":\"http\",\"forward_host\":\"192.168.1.130\",\"forward_port\":8099,
    \"access_list_id\":0,\"certificate_id\":\"new\",
    \"ssl_forced\":true,\"http2_support\":true,\"hsts_enabled\":true,\"hsts_subdomains\":false,
    \"block_exploits\":true,\"caching_enabled\":false,\"allow_websocket_upgrade\":false,
    \"advanced_config\":\"\",\"locations\":[],
    \"meta\":{\"letsencrypt_agree\":true,\"letsencrypt_email\":\"daniplay1011@gmail.com\",\"dns_challenge\":false}
  }"'
```
(`<EMAIL_NPM>` y `<PASSWORD_NPM>` se sustituyen en el momento por los valores del chat.)
Expected: un JSON con `"id":` y `"certificate_id":<número>`. Si devuelve error de certificado, espera a que el DNS propague y repite solo esta llamada después de borrar el host a medias desde el panel de NPM.

- [ ] **Step 6: Verificar en producción**

```bash
curl -sI https://portfolio.pichahouse.es | head -1
curl -sI http://portfolio.pichahouse.es | grep -i '^location'
curl -sI https://portfolio.pichahouse.es | grep -i strict-transport
echo | openssl s_client -connect portfolio.pichahouse.es:443 -servername portfolio.pichahouse.es 2>/dev/null | openssl x509 -noout -issuer -enddate
```
Expected: `HTTP/2 200`, `location: https://portfolio.pichahouse.es/`, una cabecera `strict-transport-security` y un certificado emitido por Let's Encrypt.

Después abre `https://portfolio.pichahouse.es` con playwright-cli y repite los puntos 2, 3 y 6 de Task 5.

- [ ] **Step 7: Recordar a Picha que cambie la contraseña de NPM**

Díselo en el chat: la contraseña ha quedado en el historial de la conversación.
