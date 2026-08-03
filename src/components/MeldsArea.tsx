// Anastra - Masadaki açılmış ve kapatılmış perler
import type { Meld } from '../game/types';
import { meldPoints } from '../game/rules';
import {
  CardBack,
  CardView,
} from './CardView';

interface MeldsAreaProps {
  melds: Meld[];

  /*
   * İşleme modu açıkken seçilmiş kart,
   * tıklanan uygun pere işlenir.
   */
  layoffMode?: boolean;

  onMeldClick?: (
    meldId: string,
  ) => void;

  /*
   * Seçilen kartın işlenebileceği perlerin kimlikleri.
   */
  appendableMeldIds?: Set<string>;
}

export function MeldsArea({
  melds,
  layoffMode = false,
  onMeldClick,
  appendableMeldIds,
}: MeldsAreaProps) {
  if (melds.length === 0) {
    return (
      <div className="w-full py-4 text-center text-sm text-emerald-200/50">
        Henüz masaya açılmış per yok
      </div>
    );
  }

  const team0 = melds.filter(
    (meld) =>
      meld.ownerTeam === 0,
  );

  const team1 = melds.filter(
    (meld) =>
      meld.ownerTeam === 1,
  );

  const renderMeld = (
    meld: Meld,
  ) => {
    const appendable =
      appendableMeldIds?.has(
        meld.id,
      ) ?? false;

    /*
     * Kilitli perler hiçbir zaman
     * tekrar tıklanamaz.
     */
    const clickable =
      layoffMode &&
      appendable &&
      !meld.locked;

    const handleClick = () => {
      if (!clickable) {
        return;
      }

      onMeldClick?.(
        meld.id,
      );
    };

    return (
      <button
        key={meld.id}
        type="button"
        onClick={handleClick}
        disabled={!clickable}
        className={[
          'inline-flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors',
          meld.locked
            ? 'border-slate-500/40 bg-slate-950/50'
            : 'border-white/10 bg-black/20',
          clickable
            ? 'cursor-pointer ring-2 ring-emerald-400 hover:bg-emerald-500/20'
            : 'cursor-default',
        ].join(' ')}
        title={
          meld.locked
            ? 'Bu per kapatılmıştır ve tekrar işlenemez.'
            : clickable
              ? 'Seçili kartı bu pere işle'
              : 'Açık per'
        }
      >
        {/*
         * Rakibin perine kart işlendiğinde
         * per kapanır ve kartlar ters görünür.
         *
         * Kartlar meld.cards içinde kalmaya devam ettiği
         * için oyun sonunda puan eski sahibine yazılır.
         */}
        {meld.locked ? (
          <div className="flex -space-x-3">
            {meld.cards.map(
              (card) => (
                <div
                  key={card.id}
                  className="pointer-events-none"
                >
                  <CardBack size="sm" />
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="flex -space-x-3">
            {meld.cards.map(
              (card) => (
                <div
                  key={card.id}
                  className="pointer-events-none"
                >
                  <CardView
                    card={card}
                    size="sm"
                    disabled
                  />
                </div>
              ),
            )}
          </div>
        )}

        <span className="text-[10px] text-white/60">
          {meld.type === 'run'
            ? 'Seri'
            : 'Grup'}
          {' · '}
          {meldPoints(
            meld.cards,
          )}
          p
        </span>

        {meld.locked && (
          <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-[9px] font-medium text-slate-200">
            Kapalı
          </span>
        )}

        {!meld.locked &&
          clickable && (
            <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-bold text-slate-950">
              İşlenebilir
            </span>
          )}
      </button>
    );
  };

  return (
    <div className="w-full space-y-3">
      {team0.length > 0 && (
        <section className="space-y-1">
          <div className="text-center text-[10px] font-medium uppercase tracking-wide text-sky-200/70">
            Bizim Takım
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {team0.map(
              renderMeld,
            )}
          </div>
        </section>
      )}

      {team0.length > 0 &&
        team1.length > 0 && (
          <div className="border-t border-white/10" />
        )}

      {team1.length > 0 && (
        <section className="space-y-1">
          <div className="text-center text-[10px] font-medium uppercase tracking-wide text-rose-200/70">
            Diğer Takım
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {team1.map(
              renderMeld,
            )}
          </div>
        </section>
      )}
    </div>
  );
}