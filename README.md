# portfolio

[![CI](https://github.com/dromerCode/portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/dromerCode/portfolio/actions/workflows/ci.yml)

My personal portfolio as a Junior Web Developer, live at **[portfolio.pichahouse.es](https://portfolio.pichahouse.es)**.

![Portfolio screenshot](docs/screenshot.png)

A bilingual (Spanish / English) single-page app styled as a sci-fi "dev dossier", self-hosted on my own homelab. Each section is its own view with its own URL, animated transitions and a few hidden extras.

## What's inside

- **Profile:** role, skills focus radar, stack, availability and CV download.
- **Projects:** subtrack, tabmon and a CI/CD pipeline, each with a screenshot or real snippet and what I learned.
- **Homelab and Pichaflix:** the services I run at home and how my private streaming platform works end to end.
- **Experience and education**, and a contact section.

Views: `/` · `/proyectos` · `/stack` · `/homelab` · `/contacto` (and a 404).

### Extras

- A boot sequence on the first visit (skippable).
- Open the command terminal with the floating `>_ TERMINAL` button, `/` or `Ctrl+K` (`help` lists the commands; there is a `neofetch` and an `easter-egg` that hints at the Konami code). `1`–`5` jump between views and `?` shows the shortcuts.
- Optional UI sounds (off by default) and a Konami code easter egg.
- Everything respects `prefers-reduced-motion`.

## Stack

Plain **HTML, CSS and JavaScript (ES modules)**, no framework and no build step.

- Texts live in `site/i18n/{es,en}.json` and are applied through `data-i18n` attributes. The language follows the browser and is remembered in `localStorage`.
- Projects, homelab, timeline and stack are JSON files in `site/data/` rendered by small functions in `site/js/render.js`. Everything coming from JSON is HTML-escaped.
- The skills radar is an SVG generated in `site/js/radar.js`.
- A tiny router (`site/js/router.js`) uses the History API: every view lives in `index.html` and the router shows one at a time. Transitions use the View Transitions API with a CSS fallback.
- Pure logic (routes, commands, shortcuts, text effects) is kept apart from the DOM code so it can be unit-tested.
- Fonts (Orbitron, Share Tech Mono) are self-hosted. Icons are an inline SVG sprite.

## Project structure

```
site/            everything that gets published
  index.html
  css/style.css
  js/            main.js · router.js · render.js · radar.js · i18n.js · photo.js
                 boot.js · fx.js · pointer.js · terminal.js · commands.js · keys.js · sound.js
  i18n/          es.json · en.json
  data/          profile · projects · homelab · pichaflix · timeline · stack
  assets/        fonts · images · CV
tests/           unit tests (node:test)
tools/           og.html + make-og.sh (share preview), cv/ + make-cv.sh (English CV PDF)
compose.yaml     nginx:alpine serving ./site + the auto-deployer
nginx.conf       gzip, static caching, revalidation for css/js/json, SPA fallback to index.html
deploy.sh        manual deploy: rsync to the server + reload
deployer.sh      auto-deploy loop: ships the last commit of main with green CI
.github/         CI: runs the tests on every push and pull request
```

## Run it locally

```sh
npm test                              # unit tests, no dependencies
```

To browse it, use the same container as in production (a plain static server would 404 on `/proyectos` and friends, because those routes need the fallback to `index.html`):

```sh
docker compose up -d                  # http://localhost:8099
```

## Deployment

It runs on my home server (ZimaOS) as an `nginx:alpine` container:

```
Cloudflare DNS (CNAME) → DDNS → Nginx Proxy Manager (Let's Encrypt, HTTPS) → nginx:alpine
```

Every push to `main` runs the tests in GitHub Actions. A tiny `alpine` container next to nginx (`deployer.sh`) polls the
GitHub API every 2 minutes for the newest commit of `main` whose CI passed, downloads that commit and syncs `site/`.
It only reads public endpoints, so the server needs no SSH keys or open ports for CI, and a red build never goes live.

`./deploy.sh` is still there for changes outside `site/` (`compose.yaml`, `nginx.conf`, `deployer.sh`) or to ship
something by hand: it syncs everything with rsync and reloads nginx.
