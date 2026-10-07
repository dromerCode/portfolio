// Bips de interfaz sintetizados con WebAudio. Apagados por defecto.
const KEY = 'sound';

export function readSound(storage) {
  try {
    return storage?.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function saveSound(storage, on) {
  try {
    storage?.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Sin almacenamiento: la preferencia dura solo esta visita.
  }
}

// [frecuencia Hz, duración s, retraso s]
const PATTERNS = {
  nav: [[660, .05, 0], [990, .06, .05]],
  key: [[1800, .012, 0]],
  open: [[440, .05, 0], [660, .05, .05], [880, .07, .1]],
  close: [[880, .05, 0], [550, .07, .05]],
  error: [[180, .12, 0]],
  toggle: [[1200, .04, 0]],
  overdrive: [[220, .08, 0], [330, .08, .08], [440, .08, .16], [660, .08, .24], [880, .16, .32]],
};

export function createSound(enabled) {
  let ctx = null;
  const api = {
    enabled,
    play(name) {
      if (!api.enabled || !PATTERNS[name]) return;
      try {
        ctx ??= new AudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        for (const [freq, dur, delay] of PATTERNS[name]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = name === 'error' ? 'sawtooth' : 'square';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(name === 'key' ? .02 : .05, now + delay);
          gain.gain.exponentialRampToValueAtTime(.0001, now + delay + dur);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + dur + .02);
        }
      } catch {
        // Sin WebAudio: en silencio.
      }
    },
  };
  return api;
}
