# Portfolio v2: vistas y animación

Fecha: 2026-10-07

## Objetivo

Pasar de una página larga y estática a una web con **vistas separadas**, transiciones y animaciones,
manteniendo la identidad actual (dossier sci-fi: lavanda, Orbitron, Share Tech Mono, cajas con glow).
Sin dependencias ni build: HTML + CSS + ES modules, servido por nginx en el homelab.

## Decisiones tomadas con el dueño

- Vistas separadas tipo SPA (no una página con scroll animado).
- Se mantiene la identidad visual, solo se le añade movimiento.
- 5 vistas, **sin** vista de detalle por proyecto.
- Boot solo en la primera visita, saltable.
- Enfoque A: vanilla + History API + View Transitions API.

## 1 · Router y estructura

- Rutas: `/` (inicio), `/proyectos`, `/stack`, `/homelab`, `/contacto`. Slugs fijos en castellano en los dos idiomas.
  Se acepta barra final (`/proyectos/`). Cualquier otra ruta → vista 404 ("SEÑAL PERDIDA" / "SIGNAL LOST") con enlace a inicio.
- Enlaces antiguos con hash (`/#projects`, `/#about`, `/#homelab`, `/#contact`, `/#stack`, `/#timeline`, `/#pichaflix`)
  se redirigen con `replaceState` a la vista que corresponde.
- Las vistas viven todas en `index.html` como `<section data-view="…">`; el router pone `hidden` a las inactivas.
  - inicio: ficha (`#about`)
  - proyectos: `#projects`
  - stack: `#stack` + `#timeline`
  - homelab: `#homelab` + `#pichaflix`
  - contacto: `#contact`
- `js/router.js`: lógica pura testeable (`resolveRoute(path)`, `legacyHashRoute(hash)`) + `startRouter()`
  que intercepta clics en enlaces internos (`a[data-route]`), hace `pushState`, escucha `popstate`,
  actualiza `document.title` (`<Vista> · Daniel Romero`), `aria-current="page"` en el nav, sube el scroll arriba
  y mueve el foco al encabezado de la vista (`tabindex="-1"`).
- Assets con rutas absolutas (`/css/…`, `/js/…`, `/data/…`, `/assets/…`) para que funcionen desde cualquier ruta.
- nginx: `try_files $uri $uri/ /index.html;` (todo devuelve 200; el 404 lo pinta el JS).
- Topbar fija en todas las vistas, con indicador animado bajo el enlace activo y una línea de ruta
  `DOSSIER://PROYECTOS` con cursor parpadeante. El footer se mantiene en todas las vistas.

## 2 · Boot y transiciones

- **Boot** (`js/boot.js`): overlay con log que se escribe línea a línea (~1,8 s), flash y barrido final.
  Botón `[ SALTAR ]`; también se salta con cualquier tecla o clic. Se ejecuta en paralelo a la carga de datos.
  Se guarda `boot=done` en localStorage (try/catch; si falla, se vuelve a mostrar la próxima vez).
  Textos ES/EN según el idioma elegido. No se muestra con `prefers-reduced-motion`. Se muestra entre por la ruta que entre
  (es la primera impresión).
- **Transiciones**: con `document.startViewTransition` → la vista saliente hace glitch (desplazamiento RGB + recorte en franjas, ~150 ms)
  y la entrante entra con barrido de scanline (~300 ms). Sin la API → fade + desplazamiento CSS. Máximo ~400 ms.
- **Ambiente**: scanlines muy suaves sobre la página y la malla del fondo moviéndose despacio.
- **Reduced motion**: sin boot, sin glitch, sin scanlines, cambio de vista instantáneo, LED fijo.

## 3 · Animaciones por vista

Se disparan cada vez que se entra en la vista (clase `is-entering` en la sección, que se quita al terminar).
Los elementos usan una variable `--i` para escalonar retrasos.

- **Inicio**: el nombre se "descifra" (caracteres aleatorios que se asientan en las letras reales, `js/fx.js`);
  las cajas entran escalonadas; los stats cuentan desde 0; el radar dibuja la rejilla y la área crece desde el centro;
  la foto se revela con una línea de escaneo.
- **Proyectos**: tarjetas escalonadas; hover con esquinas que se dibujan, glow y barrido de scanline sobre la imagen; ligero zoom en la imagen.
- **Stack**: grupos escalonados y tags que aparecen uno a uno; filas de la trayectoria deslizan en secuencia.
- **Homelab**: servicios "arrancan" en secuencia (LED que se enciende y estado `ONLINE`); los pasos de Pichaflix se conectan
  con un pulso de datos que recorre la cadena.
- **Contacto**: caja tipo terminal que escribe `> ping dromerCode` / respuesta; el botón principal tiene un pulso suave.
- **404**: título con glitch continuo suave y enlace a inicio.

## Accesibilidad y rendimiento

- Contenido completo en el HTML (buscadores y previews); `noscript` muestra todas las secciones.
- Animaciones solo con `transform`/`opacity`/`clip-path`; nada bloquea la interacción.
- Foco y `aria-current` gestionados por el router; el texto que se descifra mantiene el texto real en `aria-label`.

## Tests (node:test)

- `router.test.js`: `resolveRoute` (rutas válidas, barra final, desconocidas → 404), `legacyHashRoute`.
- `fx.test.js`: lógica pura del descifrado (frame final = texto real, espacios intactos) y del contador.
- `boot.test.js`: `shouldBoot(storage, reducedMotion)`.
- Los tests existentes se adaptan donde comprueban anclas `#…` o el orden de secciones.
