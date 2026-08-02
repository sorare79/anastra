// Anastra - Kurallar, kurulum ve el/oyun sonu modalleri
import type { GameState } from '../game/types';

interface RulesModalProps {
  onClose: () => void;
}

export function RulesModal({ onClose }: RulesModalProps) {
  return (
    <Overlay onClose={onClose}>
      <div className="max-w-lg w-full bg-slate-900 rounded-2xl p-5 text-white max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-3 text-amber-300">Anastra Kuralları</h2>
        <ul className="space-y-2 text-sm text-white/80 list-disc pl-4">
          <li>104 kart (2 deste, jokersiz), 2'şer kişilik iki takım oynar. Sen ve karşındaki "Ortak" aynı takımdasınız.</li>
          <li>Herkese 13'er kart dağıtılır, kalan 52 kart kapalı desteye konur.</li>
          <li>Sıran gelince desteden ya da yerdeki (atılan) karttan çekersin.</li>
          <li><b>Per türleri:</b> Aynı türden sıralı diziliş (Sinek A-K-Q) veya aynı değerde farklı türler (10-10-10). Her per en az 3 kart.</li>
          <li><b>El açma:</b> Açtığın perlerin toplamı en az <b>51</b> olmalı. Puanlar: sayılar kendi değeri, J/Q/K=10, A=11.</li>
          <li>Bir oyuncu açtıktan sonra baraj yükselir; sonraki açan onun üstüne çıkmalı.</li>
          <li>Yerden kart almak için, o kartla aynı turda elini açabilmelisin.</li>
          <li>Açıldıktan sonra elindeki kartları masadaki perlere <b>işleyebilirsin</b>.</li>
          <li>Bir el; deste bitince ya da bir oyuncu tüm kartlarını bitirince sona erer.</li>
          <li>Oyun, bir takım hedef sayıya (751/1051/1251/1751) ulaşınca biter.</li>
        </ul>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-amber-500 hover:bg-amber-400 py-2 font-semibold text-slate-900 transition-colors"
        >
          Anladım
        </button>
      </div>
    </Overlay>
  );
}

interface SetupModalProps {
  onStart: (target: number) => void;
}

export function SetupModal({ onStart }: SetupModalProps) {
  const targets = [751, 1051, 1251, 1751];
  return (
    <Overlay>
      <div className="max-w-md w-full bg-slate-900 rounded-2xl p-6 text-white text-center">
        <h1 className="text-3xl font-black mb-1 text-amber-300">ANASTRA</h1>
        <p className="text-white/60 text-sm mb-5">
          2 deste iskambil · takım oyunu · okey mantığı
        </p>
        <p className="text-white/80 text-sm mb-3">Hedef puanı seç:</p>
        <div className="grid grid-cols-2 gap-3">
          {targets.map((t) => (
            <button
              key={t}
              onClick={() => onStart(t)}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 py-4 text-xl font-bold transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

interface RoundOverModalProps {
  state: GameState;
  onNext: () => void;
  onNewGame: () => void;
}

export function RoundOverModal({ state, onNext, onNewGame }: RoundOverModalProps) {
  const gameOver = state.phase === 'gameOver';
  const winnerTeam = state.winnerTeam;

  return (
    <Overlay>
      <div className="max-w-md w-full bg-slate-900 rounded-2xl p-6 text-white text-center">
        <h2 className="text-2xl font-bold mb-3 text-amber-300">
          {gameOver ? 'Oyun Bitti!' : 'El Sona Erdi'}
        </h2>

        {gameOver && winnerTeam !== null && (
          <p className="text-lg mb-4">
            {winnerTeam === 0 ? '🏆 Takımın (Sen+Ortak) kazandı!' : 'Takım 2 kazandı.'}
          </p>
        )}

        <div className="flex gap-3 mb-4">
          <div className="flex-1 rounded-lg bg-sky-500/20 p-3">
            <div className="text-[11px] text-sky-300">Takım 1</div>
            <div className="text-lg font-bold">{state.teamScores[0]}</div>
            <div className="text-[11px] text-white/50">
              bu el {state.roundScores[0] >= 0 ? '+' : ''}{state.roundScores[0]}
            </div>
          </div>
          <div className="flex-1 rounded-lg bg-rose-500/20 p-3">
            <div className="text-[11px] text-rose-300">Takım 2</div>
            <div className="text-lg font-bold">{state.teamScores[1]}</div>
            <div className="text-[11px] text-white/50">
              bu el {state.roundScores[1] >= 0 ? '+' : ''}{state.roundScores[1]}
            </div>
          </div>
        </div>

        {gameOver ? (
          <button
            onClick={onNewGame}
            className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 py-2.5 font-semibold text-slate-900 transition-colors"
          >
            Yeni Oyun
          </button>
        ) : (
          <button
            onClick={onNext}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 font-semibold transition-colors"
          >
            Sonraki El
          </button>
        )}
      </div>
    </Overlay>
  );
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
        {children}
      </div>
    </div>
  );
}
