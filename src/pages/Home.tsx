// Anastra - Ana oyun sayfası
import { useMemo, useState } from 'react';
import { useAnastra } from '../hooks/useAnastra';
import { PlayerHand } from '../components/PlayerHand';
import { OpponentSeat } from '../components/OpponentSeat';
import { MeldsArea } from '../components/MeldsArea';
import { ScorePanel } from '../components/ScorePanel';
import { CardBack, CardView } from '../components/CardView';
import {
  RulesModal,
  SetupModal,
  RoundOverModal,
} from '../components/Modals';
import {
  getMeldType,
  meldPoints,
} from '../game/rules';

import {
  canLayOffToMeld,
} from '../game/engine';
import { suggestMelds } from '../game/ai';
import type { Card } from '../game/types';

export default function Home() {
  const [started, setStarted] = useState(false);
  const [target, setTarget] = useState(751);

  const anastra = useAnastra(target);

  const {
    state,
    message,
    aiThinking,
    humanDrawDeck,
    humanDrawDiscard,
    humanCancelDiscardTake,
    humanOpen,
    humanLayOff,
    humanDiscard,
    nextRound,
    newGame,
  } = anastra;

  const [showRules, setShowRules] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(),
  );
  const [pendingMelds, setPendingMelds] = useState<
    string[][]
  >([]);
  const [layoffMode, setLayoffMode] = useState(false);

  const me = state.players[0];
  const isMyTurn = state.currentSeat === 0;

  const canCancelDiscardTake =
    isMyTurn &&
    state.phase === 'action' &&
    state.tookFromDiscard &&
    state.requiredDiscardCardId !== null;

  const pendingIds = useMemo(() => {
    const ids = new Set<string>();

    pendingMelds.forEach((group) => {
      group.forEach((id) => ids.add(id));
    });

    return ids;
  }, [pendingMelds]);

  const selectedCards: Card[] = useMemo(
    () =>
      me.hand.filter((card) =>
        selected.has(card.id),
      ),
    [me.hand, selected],
  );

  const selectedMeldType = useMemo(
    () => getMeldType(selectedCards),
    [selectedCards],
  );

  const pendingTotal = useMemo(() => {
    let total = 0;

    for (const group of pendingMelds) {
      const cards = me.hand.filter((card) =>
        group.includes(card.id),
      );

      total += meldPoints(cards);
    }

    return total;
  }, [pendingMelds, me.hand]);

  const appendableMeldIds = useMemo(() => {
    const ids = new Set<string>();

    if (
      !layoffMode ||
      selectedCards.length !== 1
    ) {
      return ids;
    }

    const card = selectedCards[0];

    for (const meld of state.melds) {
      if (
        canLayOffToMeld(
          state,
          0,
          card,
          meld,
        )
      ) {
        ids.add(meld.id);
      }
    }

    return ids;
  }, [
    layoffMode,
    selectedCards,
    state.melds,
  ]);

  const clearSelection = () => {
    setSelected(new Set());
  };

  const resetLocalActions = () => {
    clearSelection();
    setPendingMelds([]);
    setLayoffMode(false);
  };

  const toggleCard = (cardId: string) => {
    if (pendingIds.has(cardId)) {
      return;
    }

    setSelected((previous) => {
      const next = new Set(previous);

      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }

      return next;
    });
  };

  const addPendingMeld = () => {
    if (!selectedMeldType) {
      return;
    }

    setPendingMelds((previous) => [
      ...previous,
      [...selected],
    ]);

    clearSelection();
  };

  const removePendingMeld = (index: number) => {
    setPendingMelds((previous) =>
      previous.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  };

  const doOpen = () => {
    const groups = [...pendingMelds];

    if (selectedMeldType) {
      groups.push([...selected]);
    }

    if (groups.length === 0) {
      return;
    }

    const successful = humanOpen(groups);

    if (successful) {
      resetLocalActions();
    }
  };

  /*
   * Elini açmış oyuncu için yeni per oluşturma.
   * Motor tarafında openHand(), açılmış oyuncularda
   * yeni per oluşturma işlemi olarak çalışır.
   */
  const doCreateNewMeld = () => {
    if (!selectedMeldType) {
      anastra.setMessage({
        text:
          'Yeni per için en az 3 kartlık geçerli bir seri veya grup seçmelisin.',
        type: 'error',
      });

      return;
    }

    const successful = humanOpen([
      [...selected],
    ]);

    if (successful) {
      resetLocalActions();

      anastra.setMessage({
        text: 'Yeni per masaya açıldı.',
        type: 'success',
      });
    }
  };

  const doDiscard = () => {
    if (selected.size !== 1) {
      return;
    }

    const cardId = [...selected][0];
    const successful = humanDiscard(cardId);

    if (successful) {
      resetLocalActions();
    }
  };

  const cancelDiscardTake = () => {
    const cancelled = humanCancelDiscardTake();

    if (cancelled) {
      resetLocalActions();
    }
  };

  const onMeldClick = (meldId: string) => {
    if (
      !layoffMode ||
      selectedCards.length !== 1
    ) {
      return;
    }

    const successful = humanLayOff(
      selectedCards[0].id,
      meldId,
    );

    if (successful) {
      clearSelection();
    }
  };

  const hint = () => {
    const result = suggestMelds(me.hand);
    const melds = result.melds;
    const total = result.total;

    if (
      melds.length === 0 ||
      total < state.openThreshold
    ) {
      anastra.setMessage({
        text:
          'Açılış için yeterli per yok (en iyi: ' +
          total +
          ' puan, gerekli: ' +
          state.openThreshold +
          ').',
        type: 'info',
      });

      return;
    }

    setPendingMelds(
      melds.map((meld) =>
        meld.map((card) => card.id),
      ),
    );

    clearSelection();

    anastra.setMessage({
      text:
        total +
        ' puanlık açılış hazır. Eli Aç ile onayla.',
      type: 'success',
    });
  };

  if (!started) {
    return (
      <SetupModal
        onStart={(newTarget) => {
          setTarget(newTarget);
          newGame(newTarget);
          setStarted(true);
        }}
      />
    );
  }

  const roundEnded =
    state.phase === 'roundOver' ||
    state.phase === 'gameOver';

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-slate-900 text-white flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-black/30">
        <h1 className="text-lg md:text-xl font-black text-amber-300 tracking-wide">
          ANASTRA
        </h1>

        <div className="flex gap-3 text-xs md:text-sm">
          <span className="text-sky-300">
            T1: {state.teamScores[0]}
          </span>

          <span className="text-rose-300">
            T2: {state.teamScores[1]}
          </span>

          <span className="text-white/50">
            Baraj {state.openThreshold}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-2 p-2 md:p-3">
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-center">
            <OpponentSeat
              player={state.players[2]}
              isCurrent={state.currentSeat === 2}
              thinking={aiThinking}
              position="top"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <OpponentSeat
              player={state.players[1]}
              isCurrent={state.currentSeat === 1}
              thinking={aiThinking}
              position="left"
            />

            <div className="flex items-start justify-center gap-3 min-w-0">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={humanDrawDeck}
                  disabled={
                    !isMyTurn ||
                    state.phase !== 'draw'
                  }
                  className="disabled:opacity-40 transition-transform hover:scale-105"
                >
                  <CardBack size="lg" />
                </button>

                <span className="text-[10px] text-white/60">
                  Deste ({state.deck.length})
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 min-w-0">
                {state.discard.length > 0 ? (
                  <div className="max-w-[58vw] md:max-w-[480px] overflow-x-auto overflow-y-visible pt-5 pb-5">
                    <div className="flex items-end px-3 min-w-max">
                      {state.discard.map(
                        (card, index) => {
                          const isTop =
                            index ===
                            state.discard.length - 1;

                          /*
                           * El açılmadıysa yalnızca son kart alınabilir.
                           * El açıldıysa yerdeki bütün kartlar seçilebilir.
                           */
                          const canSelect =
                            me.hasOpened
                              ? true
                              : isTop;

                          const canInteract =
                            isMyTurn &&
                            state.phase === 'draw' &&
                            canSelect;

                          return (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => {
                                if (!canInteract) {
                                  return;
                                }

                                humanDrawDiscard(index);
                              }}
                              disabled={!canInteract}
                              className={[
                                'relative border-0 bg-transparent p-0 transition-all duration-150',
                                index === 0
                                  ? ''
                                  : '-ml-9 md:-ml-11',
                                canInteract
                                  ? 'hover:-translate-y-4 hover:z-50 cursor-pointer'
                                  : 'opacity-60 cursor-not-allowed',
                              ].join(' ')}
                              style={{
                                zIndex: index + 1,
                              }}
                              title={
                                canInteract
                                  ? me.hasOpened
                                    ? 'Bu karttan itibaren yerdeki kartları al'
                                    : 'Rakibin son attığı kartı al'
                                  : 'Bu kart şu anda alınamaz'
                              }
                            >
                              <div className="pointer-events-none select-none">
                                <CardView
                                  card={card}
                                  size="lg"
                                  disabled
                                />
                              </div>

                              {index === 0 && (
                                <span className="pointer-events-none absolute -bottom-4 left-0 text-[9px] text-white/50 whitespace-nowrap">
                                  En alt
                                </span>
                              )}

                              {isTop && (
                                <span className="pointer-events-none absolute -bottom-4 right-0 text-[9px] text-amber-300 whitespace-nowrap">
                                  En üst
                                </span>
                              )}

                              {canInteract &&
                                me.hasOpened && (
                                  <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[8px] font-bold text-slate-950 whitespace-nowrap">
                                    Seç
                                  </span>
                                )}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-24 md:w-20 md:h-28 rounded-lg border-2 border-dashed border-white/20" />
                )}

                <span className="text-[10px] text-white/60">
                  Yer ({state.discard.length})
                </span>
              </div>
            </div>

            <OpponentSeat
              player={state.players[3]}
              isCurrent={state.currentSeat === 3}
              thinking={aiThinking}
              position="right"
            />
          </div>

          <div className="flex-1 rounded-xl bg-black/20 p-2 min-h-[100px] flex items-center">
            <MeldsArea
              melds={state.melds}
              layoffMode={layoffMode}
              onMeldClick={onMeldClick}
              appendableMeldIds={
                appendableMeldIds
              }
            />
          </div>

          {state.scoringCards.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2">
              {[0, 1].map((team) => {
                const teamCards =
                  state.scoringCards.filter(
                    (item) =>
                      item.ownerTeam === team,
                  );

                if (teamCards.length === 0) {
                  return null;
                }

                const teamPoints =
                  teamCards.reduce(
                    (sum, item) =>
                      sum +
                      item.card.points,
                    0,
                  );

                return (
                  <section
                    key={team}
                    className="rounded-xl border border-white/10 bg-black/20 p-2"
                  >
                    <div className="mb-2 text-center text-[10px] font-medium uppercase tracking-wide text-white/70">
                      {team === 0
                        ? 'Bizim Kapalı Puan Kartlarımız'
                        : 'Diğer Takımın Kapalı Puan Kartları'}
                    </div>

                    <div className="flex flex-wrap justify-center gap-1">
                      {teamCards.map(
                        (item) => (
                          <div
                            key={item.id}
                            className="relative"
                            title={
                              item.card.rank +
                              ' · ' +
                              item.card.points +
                              ' puan'
                            }
                          >
                            <div className="pointer-events-none">
                              <CardBack size="sm" />
                            </div>

                            <span className="absolute -bottom-1 -right-1 rounded-full bg-amber-400 px-1 text-[8px] font-bold text-slate-950">
                              {item.card.points}
                            </span>
                          </div>
                        ),
                      )}
                    </div>

                    <div className="mt-2 text-center text-[10px] text-amber-200">
                      Toplam: {teamPoints} puan
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:w-64">
          <ScorePanel
            state={state}
            onShowRules={() =>
              setShowRules(true)
            }
            onNewGame={() =>
              setStarted(false)
            }
          />
        </div>
      </div>

      <div className="bg-black/40 border-t border-white/10 p-2 md:p-3 space-y-2">
        {message && (
          <div
            className={[
              'text-center text-sm rounded-lg py-1.5 px-3',
              message.type === 'error'
                ? 'bg-red-500/20 text-red-200'
                : message.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'bg-sky-500/20 text-sky-200',
            ].join(' ')}
          >
            {message.text}
          </div>
        )}

        <div className="text-center text-xs text-white/60">
          {isMyTurn
            ? state.phase === 'draw'
              ? me.hasOpened
                ? 'Sıra sende: Desteden çek veya yerde istediğin kartı seç.'
                : 'Sıra sende: Desteden çek veya rakibin son attığı kartı al.'
              : state.requiredDiscardCardId
                ? me.hasOpened
                  ? 'Yerden aldığın ilk kartı işle, rakip perini kapat, yeni bir perde kullan veya yerden almayı iptal et.'
                  : 'Yerden aldığın kartla 51 puan aç veya yerden almayı iptal et.'
                : me.hasOpened
                  ? 'Yeni per açabilir, kendi perine işleyebilir, rakip perini kapatabilir veya kart atabilirsin.'
                  : 'El açabilir (51+) veya bir kart atabilirsin.'
            : 'Sıra: ' +
              state.players[state.currentSeat].name}
        </div>

        {pendingMelds.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-amber-300">
              Açılacak ({pendingTotal}p):
            </span>

            {pendingMelds.map(
              (group, index) => {
                const cards = me.hand.filter(
                  (card) =>
                    group.includes(card.id),
                );

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      removePendingMeld(index)
                    }
                    className="flex -space-x-3 rounded-lg bg-white/10 p-1 hover:bg-red-500/20"
                    title="Kaldırmak için tıkla"
                  >
                    {cards.map((card) => (
                      <CardView
                        key={card.id}
                        card={card}
                        size="sm"
                        disabled
                      />
                    ))}
                  </button>
                );
              },
            )}
          </div>
        )}

        <PlayerHand
          hand={me.hand}
          selectedIds={selected}
          highlightIds={pendingIds}
          lastDrawnId={state.lastDrawnCardId}
          disabled={!isMyTurn}
          onToggle={toggleCard}
        />

        {isMyTurn &&
          state.phase === 'action' && (
            <div className="flex flex-wrap justify-center gap-2">
              {!me.hasOpened && (
                <>
                  <button
                    type="button"
                    onClick={addPendingMeld}
                    disabled={!selectedMeldType}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-3 py-2 text-sm font-medium"
                  >
                    Per Ekle
                    {selectedMeldType
                      ? ' (' +
                        meldPoints(
                          selectedCards,
                        ) +
                        'p)'
                      : ''}
                  </button>

                  <button
                    type="button"
                    onClick={doOpen}
                    disabled={
                      pendingMelds.length === 0 &&
                      !selectedMeldType
                    }
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-3 py-2 text-sm font-semibold"
                  >
                    Eli Aç
                  </button>

                  <button
                    type="button"
                    onClick={hint}
                    className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-sm"
                  >
                    İpucu
                  </button>
                </>
              )}

              {me.hasOpened && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setLayoffMode(
                        (value) => !value,
                      );

                      clearSelection();
                    }}
                    className={[
                      'rounded-lg px-3 py-2 text-sm font-medium',
                      layoffMode
                        ? 'bg-emerald-500 text-slate-900'
                        : 'bg-indigo-600 hover:bg-indigo-500',
                    ].join(' ')}
                  >
                    {layoffMode
                      ? 'İşleme: Açık'
                      : 'İşle'}
                  </button>

                  <button
                    type="button"
                    onClick={doCreateNewMeld}
                    disabled={!selectedMeldType}
                    className="rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 px-3 py-2 text-sm font-semibold"
                  >
                    Yeni Per Aç
                    {selectedMeldType
                      ? ' (' +
                        meldPoints(
                          selectedCards,
                        ) +
                        'p)'
                      : ''}
                  </button>
                </>
              )}

              {canCancelDiscardTake && (
                <button
                  type="button"
                  onClick={cancelDiscardTake}
                  className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  Yerden Almayı İptal Et
                </button>
              )}

              <button
                type="button"
                onClick={doDiscard}
                disabled={
                  selected.size !== 1 ||
                  canCancelDiscardTake
                }
                className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 disabled:opacity-40 px-3 py-2 text-sm font-semibold"
              >
                Kartı At
              </button>
            </div>
          )}

        {isMyTurn &&
          state.phase === 'draw' && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={humanDrawDeck}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-6 py-2 text-sm font-semibold"
              >
                Desteden Çek
              </button>
            </div>
          )}
      </div>

      {showRules && (
        <RulesModal
          onClose={() =>
            setShowRules(false)
          }
        />
      )}

      {roundEnded && (
        <RoundOverModal
          state={state}
          onNext={nextRound}
          onNewGame={() =>
            setStarted(false)
          }
        />
      )}
    </div>
  );
}