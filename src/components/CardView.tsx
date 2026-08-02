// Anastra - Tek kart görünümü
import type { Card } from '../game/types';
import { isRedSuit, suitSymbol } from '../game/deck';

interface CardViewProps {
  card: Card;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const sizeMap = {
  sm: 'w-9 h-12 text-[10px] md:w-10 md:h-14 md:text-xs',
  md: 'w-12 h-16 text-xs md:w-14 md:h-20 md:text-sm',
  lg: 'w-16 h-24 text-sm md:w-20 md:h-28 md:text-base',
};

export function CardView({
  card,
  selected,
  highlighted,
  disabled,
  size = 'md',
  onClick,
}: CardViewProps) {
  const red = isRedSuit(card.suit);
  const sym = suitSymbol(card.suit);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'relative rounded-lg border bg-white shadow-sm flex flex-col justify-between p-1 select-none transition-all',
        sizeMap[size],
        red ? 'text-red-600' : 'text-slate-900',
        selected ? '-translate-y-3 ring-2 ring-amber-400 shadow-lg' : '',
        highlighted ? 'ring-2 ring-emerald-400' : 'border-slate-300',
        onClick && !disabled ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md' : '',
        disabled ? 'opacity-60 cursor-default' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-0.5 font-bold leading-none">
        <span>{card.rank}</span>
        <span>{sym}</span>
      </div>
      <div className="text-center text-lg md:text-2xl leading-none">{sym}</div>
      <div className="flex items-center gap-0.5 font-bold leading-none self-end rotate-180">
        <span>{card.rank}</span>
        <span>{sym}</span>
      </div>
    </button>
  );
}

// Kapalı kart (arka yüz)
export function CardBack({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={[
        'rounded-lg border border-indigo-900 shadow-sm',
        'bg-gradient-to-br from-indigo-600 to-indigo-800',
        sizeMap[size],
      ].join(' ')}
    >
      <div className="w-full h-full rounded-md border-2 border-indigo-300/30 flex items-center justify-center">
        <span className="text-indigo-200/60 text-lg font-black">A</span>
      </div>
    </div>
  );
}
