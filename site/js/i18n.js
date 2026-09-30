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
