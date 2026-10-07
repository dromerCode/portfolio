// Terminal modal: <dialog> nativo con historial (↑↓) y autocompletado (Tab).
import { runCommand, complete } from './commands.js';

const PROMPT = 'dromer@pichahouse:~$';

export function createTerminal({ lang, onAction, sound, state }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'term-dlg box';
  dialog.setAttribute('aria-label', 'Terminal');
  dialog.innerHTML = `<div class="term__bar"><span></span><span></span><span></span><span class="term__name">${PROMPT}</span><button class="term-dlg__close" type="button" aria-label="Cerrar">×</button></div>
<div class="term-dlg__log" aria-live="polite"></div>
<form class="term-dlg__line"><label class="term-dlg__prompt" for="term-input">&gt;</label><input id="term-input" class="term-dlg__input" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"></form>`;
  document.body.append(dialog);

  const log = dialog.querySelector('.term-dlg__log');
  const input = dialog.querySelector('input');
  const history = [];
  let pos = 0;

  const print = (lines, cls = '') => {
    for (const line of lines) {
      const div = document.createElement('div');
      div.textContent = line;
      if (cls) div.className = cls;
      log.append(div);
    }
    log.scrollTop = log.scrollHeight;
  };

  dialog.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = input.value;
    input.value = '';
    if (!raw.trim()) return;
    history.push(raw);
    pos = history.length;
    print([`> ${raw}`], 'term-dlg__cmd');
    const r = runCommand(raw, lang(), state());
    print(r.out, r.error ? 'term-dlg__err' : '');
    sound.play(r.error ? 'error' : 'toggle');
    if (r.action?.type === 'clear') log.textContent = '';
    else if (r.action?.type === 'close') close();
    else if (r.action) {
      // Navegar o abrir algo cierra la terminal para que se vea el resultado
      if (['go', 'cv', 'open'].includes(r.action.type)) setTimeout(close, 250);
      onAction(r.action);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && pos > 0) { e.preventDefault(); input.value = history[--pos]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); pos = Math.min(history.length, pos + 1); input.value = history[pos] ?? ''; }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const options = complete(input.value);
      if (options.length === 1) input.value = `${options[0]} `;
      else if (options.length > 1) print([options.join('  ')], 'term-dlg__hint');
    } else if (e.key.length === 1) sound.play('key');
  });

  dialog.querySelector('.term-dlg__close').addEventListener('click', () => close());
  // Clic fuera de la caja (en el backdrop) cierra
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  dialog.addEventListener('close', () => sound.play('close'));

  function open() {
    if (dialog.open) return;
    if (!log.childElementCount) print([lang() === 'es' ? 'Escribe "help" para ver los comandos. Tab autocompleta.' : 'Type "help" to list commands. Tab completes.'], 'term-dlg__hint');
    dialog.showModal();
    input.focus();
    sound.play('open');
  }
  function close() { if (dialog.open) dialog.close(); }

  return { open, close };
}
