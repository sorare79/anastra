// Anastra - Rakip / ortak oyuncu göstergesi
import type { Player } from '../game/types';
import { CardBack } from './CardView';

interface OpponentSeatProps {
  player: Player;
  isCurrent: boolean;
  thinking: boolean;
  position: 'top' | 'left' | 'right';
}

export function OpponentSeat({
  player,
  isCurrent,
  thinking,
  position,
}: OpponentSeatProps) {
  const teamColor = player.team === 0 ? 'text-sky-300' : 'text-rose-300';
  const teamLabel = player.team === 0 ? 'Takım 1' : 'Takım 2';

  const cardCount = player.hand.length;
  const maxShow = position === 'top' ? 8 : 5;
  const shown = Math.min(cardCount, maxShow);

  return (
    <div
      className={[
        'flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all',
        isCurrent ? 'bg-amber-400/20 ring-2 ring-amber-400' : 'bg-black/20',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <div
          className={[
            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
            player.team === 0 ? 'bg-sky-500/30' : 'bg-rose-500/30',
          ].join(' ')}
        >
          {player.name.charAt(0)}
        </div>
        <div className="text-left">
          <div className="text-white text-xs font-semibold leading-tight flex items-center gap-1">
            {player.name}
            {player.hasOpened && (
              <span className="text-emerald-400 text-[10px]">●açık</span>
            )}
          </div>
          <div className={`text-[10px] ${teamColor} leading-tight`}>
            {teamLabel} · {cardCount} kart
          </div>
        </div>
      </div>

      <div
        className={
          position === 'top'
            ? 'flex -space-x-4'
            : 'flex -space-x-4'
        }
      >
        {Array.from({ length: shown }).map((_, i) => (
          <CardBack key={i} size="sm" />
        ))}
      </div>

      {thinking && isCurrent && (
        <div className="text-amber-300 text-[10px] animate-pulse">
          düşünüyor…
        </div>
      )}
    </div>
  );
}
