// Anastra - Masadaki açılmış perler
import type { Meld } from '../game/types';
import { meldPoints } from '../game/rules';
import { CardView } from './CardView';

interface MeldsAreaProps {
  melds: Meld[];
  // İşleme modu: seçili kart bir pere tıklanınca eklenir
  layoffMode?: boolean;
  onMeldClick?: (meldId: string) => void;
  appendableMeldIds?: Set<string>;
}

export function MeldsArea({
  melds,
  layoffMode,
  onMeldClick,
  appendableMeldIds,
}: MeldsAreaProps) {
  if (melds.length === 0) {
    return (
      <div className="text-center text-emerald-200/50 text-sm py-4">
        Henüz masaya açılmış per yok
      </div>
    );
  }

  const team0 = melds.filter((m) => m.ownerTeam === 0);
  const team1 = melds.filter((m) => m.ownerTeam === 1);

  const renderMeld = (meld: Meld) => {
    const appendable = appendableMeldIds?.has(meld.id);
    const clickable = layoffMode && appendable;
    return (
      <div
        key={meld.id}
        onClick={() => clickable && onMeldClick?.(meld.id)}
        className={[
          'inline-flex flex-col items-center gap-1 rounded-lg p-1.5 bg-black/20',
          clickable
            ? 'ring-2 ring-emerald-400 cursor-pointer hover:bg-emerald-500/20'
            : '',
        ].join(' ')}
      >
        <div className="flex -space-x-3">
          {meld.cards.map((c) => (
            <CardView key={c.id} card={c} size="sm" />
          ))}
        </div>
        <span className="text-[10px] text-white/60">
          {meld.type === 'run' ? 'Seri' : 'Grup'} · {meldPoints(meld.cards)}p
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-2 w-full">
      <div className="flex flex-wrap justify-center gap-2">
        {team0.map(renderMeld)}
      </div>
      {team0.length > 0 && team1.length > 0 && (
        <div className="border-t border-white/10" />
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {team1.map(renderMeld)}
      </div>
    </div>
  );
}
