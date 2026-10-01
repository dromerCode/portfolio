// Foto de perfil: real por defecto, con la versión anime como alternativa.
export const PHOTOS = ['real', 'anime'];
const KEY = 'photo';

export function nextPhoto(current) {
  return current === 'anime' ? 'real' : 'anime';
}

export function readPhoto(storage) {
  try {
    const value = storage?.getItem(KEY);
    return PHOTOS.includes(value) ? value : 'real';
  } catch {
    return 'real';
  }
}

export function savePhoto(storage, value) {
  try {
    storage?.setItem(KEY, value);
  } catch {
    // Sin almacenamiento: la elección dura solo esta visita.
  }
}
