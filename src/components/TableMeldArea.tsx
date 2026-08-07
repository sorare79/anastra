// Anastra - Bir oyuncunun kendi önündeki per alanı
import type {
  Meld,
} from '../game/types';

import {
  meldPoints,
} from '../game/rules';

import {
  CardBack,
  CardView,
} from './CardView';

interface TableMeldAreaProps {
  melds: Meld[];

  orientation:
    | 'top'
    | 'left'
    | 'right'
    | 'bottom';

  layoffMode?: boolean;

  appendableMeldIds?: Set<string>;

  onMeldClick?: (
    meldId: string,
  ) => void;
}

export function TableMeldArea({
  melds,
  orientation,
  layoffMode = false,
  appendableMeldIds,
  onMeldClick,
}: TableMeldAreaProps) {
  if (
    melds.length === 0
  ) {
    return (
      <div
        className={[
          'table-player-melds',
          `orientation-${orientation}`,
          'is-empty',
        ].join(' ')}
      />
    );
  }

  return (
    <div
      className={[
        'table-player-melds',
        `orientation-${orientation}`,
      ].join(' ')}
    >
      <div className="table-player-melds-scroll">
        <div className="table-player-melds-list">
          {melds.map(
            (meld) => {
              const appendable =
                appendableMeldIds?.has(
                  meld.id,
                ) ?? false;

              const canLayOff =
                layoffMode &&
                appendable &&
                !meld.locked;

              const clickable =
                !meld.locked &&
                Boolean(onMeldClick);

              return (
                <button
                  key={meld.id}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (
                      clickable
                    ) {
                      onMeldClick?.(
                        meld.id,
                      );
                    }
                  }}
                  className={[
                    'table-meld',
                    meld.locked
                      ? 'is-locked'
                      : '',
                    canLayOff
                      ? 'is-appendable'
                      : '',
                  ].join(' ')}
                  title={
                    meld.locked
                      ? 'Bu per kapalıdır.'
                      : canLayOff
                        ? 'Seçili kartı bu pere işle'
                        : 'Büyütmek için tıkla'
                  }
                >
                  <div className="table-meld-cards">
                    {meld.cards.map(
                      (
                        card,
                        index,
                      ) => (
                        <div
                          key={card.id}
                          className="table-meld-card"
                          style={{
                            zIndex:
                              index + 1,
                          }}
                        >
                          {meld.locked ? (
                            <CardBack
                              size="sm"
                            />
                          ) : (
                            <CardView
                              card={card}
                              size="sm"
                              disabled
                            />
                          )}
                        </div>
                      ),
                    )}
                  </div>

                  <div className="table-meld-caption">
                    {meldPoints(
                      meld.cards,
                    )}
                    p
                  </div>
                </button>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}