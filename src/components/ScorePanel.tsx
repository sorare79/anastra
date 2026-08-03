// Anastra - Skor paneli ve olay günlüğü
import type { GameState } from '../game/types';

interface ScorePanelProps {
  state: GameState;
  onShowRules: () => void;
  onNewGame: () => void;
}

export function ScorePanel({ state, onShowRules, onNewGame }: ScorePanelProps) {
  return (
    <div className="flex flex-col gap-2 text-white">
      <div className="flex gap-2">
        <div className="flex-1 rounded-lg bg-sky-500/20 border border-sky-400/30 p-2 text-center">
          <div className="text-[10px] text-sky-300">Takım 1 (Sen+Ortak)</div>
          <div className="text-xl font-bold">{state.teamScores[0]}</div>
        </div>
        <div className="flex-1 rounded-lg bg-rose-500/20 border border-rose-400/30 p-2 text-center">
          <div className="text-[10px] text-rose-300">Takım 2</div>
          <div className="text-xl font-bold">{state.teamScores[1]}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-white/70 px-1">
        <span>Hedef: {state.targetScore}</span>
        <span>El: {state.roundNumber}</span>
        <span>Baraj: {state.openThreshold}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onShowRules}
          className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 py-1.5 text-xs transition-colors"
        >
          Kurallar
        </button>
        <button
          onClick={onNewGame}
          className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 py-1.5 text-xs transition-colors"
        >
          Yeni Oyun
        </button>
      </div>

      <div className="rounded-lg bg-black/30 p-2 h-24 overflow-y-auto text-[11px] text-white/60 space-y-0.5">
        {state.log.slice(-8).reverse().map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
