// Anastra - Merkezi oyun ses altyapısı

export type GameSound =
  | 'draw'
  | 'discard'
  | 'meld'
  | 'turn';

const soundFiles: Record<GameSound, string> = {
  draw: '/sounds/card-draw.wav',
  discard: '/sounds/card-discard.wav',

  // Şimdilik per açma ve sıra bildirimi için
  // ayrıca ses kullanmıyoruz.
  meld: '',
  turn: '',
};

const volumes: Record<GameSound, number> = {
  draw: 0.55,
  discard: 0.7,
  meld: 0.45,
  turn: 0.4,
};

export function playGameSound(
  sound: GameSound,
  enabled = true,
): void {
  if (!enabled) {
    return;
  }

  const source = soundFiles[sound];

  if (!source) {
    return;
  }

  try {
    const audio = new Audio(source);

    audio.volume =
      volumes[sound];

    audio.currentTime = 0;

    void audio.play().catch(() => {
      // Mobil tarayıcı sesi engellerse
      // oyun çalışmaya devam eder.
    });
  } catch {
    // Ses hatası oyun akışını etkilemesin.
  }
}