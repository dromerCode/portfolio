# Portfolio dromerCode: diseño

Fecha: 2026-09-30
URL final: https://portfolio.pichahouse.es

## Objetivo

Portfolio personal que sirve para dos cosas:

1. **Buscar prácticas o trabajo** (FCT de DAW, empresas, reclutadores): tiene que dejar claro en pocos segundos quién soy, qué sé hacer y cómo contactarme.
2. **Escaparate personal** de mis proyectos, incluido el homelab, pero sin que el servidor se coma el protagonismo.

Es bilingüe (español e inglés), se hace a mano sin frameworks y se aloja en mi propio servidor.

## Estilo visual

Un **expediente de desarrollador** de estética sci-fi y servercore suave. La referencia es una ficha de personaje (`refs/ref3.jpg`) y el mockup aprobado está en `.superpowers/brainstorm/*/content/ref3-dossier-v2.html`.

- Fondo casi negro (`#1a1a1f`) y un violeta monocromo (`#b8b3ff`) con brillo (`box-shadow` y `text-shadow`). Tono apagado: `#6d68a8`. Texto de lectura: `#dcd9ff`.
- Único acento aparte del violeta: el **verde de los LEDs de estado** (`#7dffb0`), que parpadean.
- Tipografías: **Orbitron** para títulos y **Share Tech Mono** para el resto. Van alojadas en el propio proyecto (woff2), sin pedirlas a Google Fonts.
- Cajas con borde de 1,5 px violeta y brillo, barras decorativas `/ / / /` y un fondo de malla curva en SVG con poca opacidad.
- El protagonista soy yo, no el servidor. El homelab aparece como un proyecto más.

## Estructura de la página (una sola página con scroll)

1. **Barra superior**: "DEV PROFILE", navegación con anclas (About, Projects, Contact) y el selector ES/EN.
2. **Ficha de cabecera** (#about), en rejilla de 3/4 + 1/4:
   - Cabecera: `DROMERCODE` y el ID `DAW-2027`.
   - Foto o avatar, con los enlaces (GitHub, LinkedIn, Mail) debajo.
   - **Radar de skills** en SVG con 6 ejes: Frontend, Backend, Java, Linux, DevOps y BBDD. Los valores salen de un JSON. Incluye una alternativa accesible: una lista oculta visualmente con cada skill y su nivel.
   - Tabla de datos: rol, formación, ubicación, idiomas y estado (LED verde + "Buscando prácticas").
   - Bio corta.
   - Columna lateral: firma (SVG), botón para descargar el CV (se oculta si todavía no hay CV) y un bloque "Ahora mismo".
3. **Proyectos** (#projects): tarjetas en rejilla de 3 columnas con número y categoría (`#01 · HOMELAB`), título, descripción y etiquetas. Proyectos iniciales: Pichaflix (homelab), CI/CD DAW, juegoNaves y cursophp/DWEC si caben. Cada tarjeta enlaza a su repo cuando lo tiene.
4. **Trayectoria**: tabla con año, descripción y tipo/estado.
5. **Pie / Contacto** (#contact): correo, GitHub, LinkedIn, descarga del CV y `PORTFOLIO.PICHAHOUSE.ES`.

## Arquitectura

HTML, CSS y JS sin frameworks ni build. Todo lo público va en `site/`, que es lo que se sube al servidor. El detalle de ficheros definitivo está en el plan (`docs/superpowers/plans/2026-09-30-portfolio.md`). Visión general:

```
portfolio/
├── index.html          # estructura con atributos data-i18n
├── css/style.css       # variables de color en :root, componentes, responsive
├── js/main.js          # i18n + renderizado de proyectos, trayectoria y radar
├── i18n/es.json        # textos fijos (clave → texto)
├── i18n/en.json
├── data/profile.json   # valores del radar, tabla de datos, enlaces
├── data/projects.json  # proyectos: { id, category, tags, repo, es:{title,desc}, en:{title,desc} }
├── data/timeline.json  # trayectoria con los textos en es/en
├── assets/
│   ├── fonts/          # orbitron, share-tech-mono (woff2)
│   ├── img/            # foto, favicon, imagen og
│   └── cv/             # cv-es.pdf, cv-en.pdf
├── compose.yaml        # nginx:alpine para el servidor
├── nginx.conf          # config mínima (cache de estáticos, gzip)
└── deploy.sh           # rsync al servidor
```

### Idioma (i18n)

- Al cargar, el idioma se elige en este orden: primero `localStorage.lang`, si existe; si no, `navigator.language` (si empieza por `es`, español); en cualquier otro caso, inglés.
- Los elementos con `data-i18n="clave"` reciben su texto desde el JSON. Al cambiar de idioma se actualizan `<html lang>`, `document.title`, la meta description y el enlace del CV, y se vuelven a pintar proyectos, trayectoria y radar.
- El HTML trae ya escritos los textos fijos en español, así que se leen aunque falle el JS. Proyectos, trayectoria y radar necesitan JS y, sin él, muestran un aviso con `<noscript>`.

### Datos y renderizado

- `main.js` carga los JSON con `fetch`. Si falla la carga, se queda el contenido estático del HTML y no se rompe nada visible.
- El radar se genera en SVG a partir de `profile.json` (6 ejes con valores de 0 a 100).
- Para añadir un proyecto solo hay que editar `projects.json`.

### Responsive y accesibilidad

- Por debajo de ~760 px todo pasa a una columna: la columna lateral baja debajo de la ficha y los proyectos se apilan.
- Con `prefers-reduced-motion` se desactivan el parpadeo de los LEDs y cualquier animación.
- Contraste del texto de lectura (`#dcd9ff` sobre `#1a1a1f`) por encima de 4.5:1. Foco visible en enlaces y botones.
- Metaetiquetas Open Graph para que el enlace se vea bien al compartirlo en LinkedIn o Telegram.

## Despliegue

Sigo el mismo patrón que el resto de servicios de pichahouse.es:

```
Cloudflare DNS (CNAME portfolio → pichaserver.myddns.me, DNS only)
  → router → Nginx Proxy Manager (443, Let's Encrypt)
  → 192.168.1.130:<puerto> → contenedor nginx:alpine
```

1. **Servidor**: la carpeta `/DATA/AppData/portfolio/` en ZimaOS con `compose.yaml` (`nginx:alpine`, `restart: unless-stopped`) y la web montada como volumen de solo lectura en `/usr/share/nginx/html`. El puerto del host será uno libre (se comprueba antes; la idea es 8099).
2. **Actualizar**: `deploy.sh` hace `rsync` de los ficheros públicos a `zimaos:/DATA/AppData/portfolio/site/`. No hace falta reiniciar el contenedor.
3. **Nginx Proxy Manager**: proxy host `portfolio.pichahouse.es` → `192.168.1.130:<puerto>`, con certificado Let's Encrypt, Force SSL, HTTP/2 y HSTS. Se crea con la API de NPM usando las credenciales que me pasas en el chat, que no se guardan en ningún fichero.
4. **Cloudflare**: registro CNAME `portfolio` → `pichaserver.myddns.me` en modo proxy desactivado (nube gris). Se crea con la integración de Cloudflare si tiene acceso a la zona; si no, lo añade Picha a mano.
5. **Repo**: `dromerCode/portfolio` en GitHub (push por SSH). El `.gitignore` incluye `.superpowers/` y `refs/`.

No se toca el firewall, SSH ni ningún hardening del servidor.

## Contenido que tiene que aportar Picha

- Foto o avatar. Mientras tanto va un marcador.
- CV en PDF (ES y/o EN). Si solo hay uno, se usa el mismo para los dos idiomas.
- URL de LinkedIn y correo de contacto público.
- Firma en SVG (opcional; si no hay, se usa una genérica).

Mientras falte algo se usan marcadores claros, y la web puede publicarse igual.

## Pruebas y verificación

- Comprobación con Playwright en local: la página carga sin errores en consola, el cambio ES/EN cambia los textos y se recuerda al recargar, se pintan los proyectos y el radar, y se ve bien a 375 px y a 1280 px.
- HTML válido (validador de W3C) y Lighthouse con accesibilidad ≥ 95.
- Tras desplegar: `curl -I https://portfolio.pichahouse.es` devuelve 200 con certificado válido, y la redirección de HTTP a HTTPS funciona.

## Fuera de alcance (por ahora)

- Páginas propias por proyecto.
- Blog o artículos.
- Datos en directo del servidor (uptime, contenedores).
- Formulario de contacto (basta con un enlace `mailto:`).
