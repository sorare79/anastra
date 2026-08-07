// Anastra - Masadaki açılmış ve kapatılmış perler
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

interface MeldsAreaProps {
  melds: Meld[];

  layoffMode?: boolean;

  onMeldClick?: (
    meldId: string,
  ) => void;

  appendableMeldIds?: Set<string>;
}

interface TeamMeldRowProps {
  title: string;

  tone:
    | 'ours'
    | 'theirs';

  melds: Meld[];

  layoffMode: boolean;

  onMeldClick?: (
    meldId: string,
  ) => void;

  appendableMeldIds?: Set<string>;
}

function TeamMeldRow({
  title,
  tone,
  melds,
  layoffMode,
  onMeldClick,
  appendableMeldIds,
}: TeamMeldRowProps) {
  if (
    melds.length === 0
  ) {
    return null;
  }

  return (
    <section
      className={[
        'team-meld-row',
        tone,
      ].join(' ')}
    >
      <div className="team-meld-heading">
        <span>
          {title}
        </span>

        <span className="team-meld-count">
          {melds.length} per
        </span>
      </div>

      <div className="team-meld-scroll">
        <div className="team-meld-list">
          {melds.map(
            (meld) => {
              const appendable =
                appendableMeldIds?.has(
                  meld.id,
                ) ?? false;

              const clickable =
                layoffMode &&
                appendable &&
                !meld.locked;

              return (
                <button
                  key={
                    meld.id
                  }
                  type="button"
                  disabled={
                    !clickable
                  }
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
                    'meld-tile',
                    meld.locked
                      ? 'is-locked'
                      : '',
                    clickable
                      ? 'is-appendable'
                      : '',
                  ].join(' ')}
                  title={
                    meld.locked
                      ? 'Bu per kapatılmıştır ve tekrar işlenemez.'
                      : clickable
                        ? 'Seçili kartı bu pere işle'
                        : 'Açık per'
                  }
                >
                  <div className="meld-card-row">
                    {meld.cards.map(
                      (
                        card,
                        index,
                      ) => (
                        <div
                          key={
                            card.id
                          }
                          className="meld-card-layer"
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
                              card={
                                card
                              }
                              size="sm"
                              disabled
                            />
                          )}
                        </div>
                      ),
                    )}
                  </div>

                  <div className="meld-meta">
                    <span>
                      {meld.type ===
                      'run'
                        ? 'Seri'
                        : 'Grup'}
                    </span>

                    <span>
                      {meldPoints(
                        meld.cards,
                      )}
                      p
                    </span>
                  </div>

                  {meld.locked && (
                    <span className="meld-state locked">
                      Kapalı
                    </span>
                  )}

                  {!meld.locked &&
                    clickable && (
                      <span className="meld-state appendable">
                        İşlenebilir
                      </span>
                    )}
                </button>
              );
            },
          )}
        </div>
      </div>
    </section>
  );
}

export function MeldsArea({
  melds,
  layoffMode = false,
  onMeldClick,
  appendableMeldIds,
}: MeldsAreaProps) {
  if (
    melds.length === 0
  ) {
    return (
      <div className="empty-meld-zone">
        Henüz masaya açılmış per yok
      </div>
    );
  }

  const team0 =
    melds.filter(
      (meld) =>
        meld.ownerTeam === 0,
    );

  const team1 =
    melds.filter(
      (meld) =>
        meld.ownerTeam === 1,
    );

  return (
    <div className="melds-board">
      <TeamMeldRow
        title="Bizim Takım"
        tone="ours"
        melds={team0}
        layoffMode={
          layoffMode
        }
        onMeldClick={
          onMeldClick
        }
        appendableMeldIds={
          appendableMeldIds
        }
      />

      <div className="melds-board-divider" />

      <TeamMeldRow
        title="Diğer Takım"
        tone="theirs"
        melds={team1}
        layoffMode={
          layoffMode
        }
        onMeldClick={
          onMeldClick
        }
        appendableMeldIds={
          appendableMeldIds
        }
      />
    </div>
  );
}