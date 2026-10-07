// Comandos de la terminal. Puro: devuelve líneas de salida y una acción que ejecuta la UI.
const LINKS = {
  github: 'https://github.com/dromerCode',
  linkedin: 'https://www.linkedin.com/in/dromerocoz/',
  mail: 'mailto:dromerCode@gmail.com',
};

// nombre canónico → alias
const COMMANDS = {
  help: ['ayuda', '?'],
  inicio: ['home', 'about'],
  proyectos: ['projects'],
  stack: [],
  homelab: [],
  contacto: ['contact'],
  cv: ['resume'],
  github: [],
  linkedin: [],
  mail: ['email'],
  lang: ['idioma'],
  foto: ['photo'],
  sonido: ['sound'],
  whoami: [],
  neofetch: ['fetch'],
  'easter-egg': ['secreto', 'secret', 'huevo', 'egg'],
  clear: ['limpiar', 'cls'],
  salir: ['exit', 'quit'],
};

// Logo de neofetch: la "P" del favicon
const LOGO = [
  ' ____  ',
  '|  _ \\ ',
  '| |_) |',
  '|  __/ ',
  '|_|    ',
];

// Logo a la izquierda e info a la derecha; las líneas que sobran van sin logo
function fetchLines(info) {
  const lines = ['dromer@pichahouse', '-----------------', ...info];
  return lines.map((l, i) => `${(LOGO[i] ?? '').padEnd(9)}${l}`);
}

const VIEWS = { inicio: '/', proyectos: '/proyectos', stack: '/stack', homelab: '/homelab', contacto: '/contacto' };

const T = {
  es: {
    help: [
      'COMANDOS DISPONIBLES',
      '  inicio · proyectos · stack · homelab · contacto   ir a una vista',
      '  cv                    descargar el CV',
      '  github · linkedin · mail   abrir enlace',
      '  lang es|en            cambiar idioma',
      '  foto                  cambiar foto real/anime',
      '  sonido [on|off]       efectos de sonido',
      '  whoami                quién soy',
      '  neofetch              info del sistema',
      '  easter-egg            ¿?',
      '  clear · salir',
      'ATAJOS: 1-5 vistas · / terminal · ? ver atajos',
    ],
    notFound: (c) => `comando no encontrado: ${c}. Escribe "help".`,
    go: (v) => `abriendo ${v}…`,
    cv: 'descargando CV…',
    open: (n) => `abriendo ${n}…`,
    lang: 'uso: lang es|en',
    langOk: (l) => `idioma: ${l}`,
    photo: 'foto cambiada',
    sound: (on) => `sonido: ${on ? 'ON' : 'OFF'}`,
    whoami: ['Daniel Romero Cózar · @dromerCode', 'Junior Web Developer · 2º DAW · España'],
    neofetch: fetchLines([
      'OS: EndeavourOS',
      'Host: HP Victus 15',
      'WM: niri · Shell: zsh',
      'Editor: Neovim',
      'Stack: React · TS · Java',
      'Homelab: ZimaOS · 30 cont.',
      'Idiomas: ES · EN',
      'Estado: DISPONIBLE',
    ]),
    egg: [
      '[!] has encontrado un huevo de pascua.',
      'Hay otro escondido en la web:',
      'cierra la terminal y prueba el código Konami.',
      'pista: ↑ ↑ ↓ ↓ ← → ← → B A',
    ],
    sudo: ['permiso denegado: el usuario no está en el fichero sudoers.', 'Este incidente será reportado.'],
  },
  en: {
    help: [
      'AVAILABLE COMMANDS',
      '  home · projects · stack · homelab · contact   go to a view',
      '  cv                    download the CV',
      '  github · linkedin · mail   open link',
      '  lang es|en            switch language',
      '  photo                 switch real/anime photo',
      '  sound [on|off]        sound effects',
      '  whoami                who am I',
      '  neofetch              system info',
      '  easter-egg            ?',
      '  clear · exit',
      'SHORTCUTS: 1-5 views · / terminal · ? show shortcuts',
    ],
    notFound: (c) => `command not found: ${c}. Type "help".`,
    go: (v) => `opening ${v}…`,
    cv: 'downloading CV…',
    open: (n) => `opening ${n}…`,
    lang: 'usage: lang es|en',
    langOk: (l) => `language: ${l}`,
    photo: 'photo switched',
    sound: (on) => `sound: ${on ? 'ON' : 'OFF'}`,
    whoami: ['Daniel Romero Cózar · @dromerCode', 'Junior Web Developer · 2nd year DAW · Spain'],
    neofetch: fetchLines([
      'OS: EndeavourOS',
      'Host: HP Victus 15',
      'WM: niri · Shell: zsh',
      'Editor: Neovim',
      'Stack: React · TS · Java',
      'Homelab: ZimaOS · 30 ctrs',
      'Languages: ES · EN',
      'Status: AVAILABLE',
    ]),
    egg: [
      '[!] you found an easter egg.',
      'There is another one hidden on the site:',
      'close the terminal and try the Konami code.',
      'hint: ↑ ↑ ↓ ↓ ← → ← → B A',
    ],
    sudo: ['permission denied: user is not in the sudoers file.', 'This incident will be reported.'],
  },
};

const ALIASES = Object.fromEntries(Object.entries(COMMANDS).flatMap(([name, al]) => [[name, name], ...al.map((a) => [a, name])]));

const result = (out, action = null, error = false) => ({ out, action, error });

export function runCommand(raw, lang, state = {}) {
  const t = T[lang] ?? T.en;
  const [word = '', ...args] = String(raw).trim().split(/\s+/).filter(Boolean);
  if (!word) return result([]);
  const lower = word.toLowerCase();
  if (lower === 'sudo') return result(t.sudo);
  const cmd = ALIASES[lower];
  const arg = args[0]?.toLowerCase();

  if (!cmd) return result([t.notFound(word)], null, true);
  if (cmd in VIEWS) return result([t.go(lower)], { type: 'go', path: VIEWS[cmd] });
  switch (cmd) {
    case 'help': return result(t.help);
    case 'cv': return result([t.cv], { type: 'cv' });
    case 'github': case 'linkedin': case 'mail': return result([t.open(cmd)], { type: 'open', url: LINKS[cmd] });
    case 'lang':
      if (arg !== 'es' && arg !== 'en') return result([t.lang], null, true);
      return result([t.langOk(arg)], { type: 'lang', lang: arg });
    case 'foto': return result([t.photo], { type: 'photo' });
    case 'sonido': {
      const on = arg === 'on' ? true : arg === 'off' ? false : !state.sound;
      return result([t.sound(on)], { type: 'sound', on });
    }
    case 'whoami': return result(t.whoami);
    case 'neofetch': return result(t.neofetch);
    case 'easter-egg': return result(t.egg);
    case 'clear': return result([], { type: 'clear' });
    case 'salir': return result([], { type: 'close' });
  }
  return result([t.notFound(word)], null, true);
}

// Candidatos para autocompletar (solo nombres canónicos)
export function complete(prefix) {
  const p = String(prefix).trim().toLowerCase();
  if (!p) return [];
  return Object.keys(COMMANDS).filter((c) => c.startsWith(p));
}
