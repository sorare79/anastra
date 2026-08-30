// Anastra - Ana oyun sayfası
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAnastra } from '../hooks/useAnastra';
import { PlayerHand } from '../components/PlayerHand';
import { OpponentSeat } from '../components/OpponentSeat';
import { TableMeldArea } from '../components/TableMeldArea';
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
import { playGameSound } from '../utils/sound';

interface DiscardFlight {
  card: Card;
  from: DOMRect;
  to: DOMRect;
}


function ExistingGameHome() {
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
    reorderHand,
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
  const [previewMeldId, setPreviewMeldId] = useState<string | null>(null);

  const [fitMode, setFitMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [yourTurnPulse, setYourTurnPulse] = useState(false);
  const [discardFlight, setDiscardFlight] = useState<DiscardFlight | null>(null);

  const cardElementsRef = useRef(new Map<string, HTMLDivElement>());
  const discardTargetRef = useRef<HTMLDivElement | null>(null);

  const previousSeatRef = useRef(state.currentSeat);
  const previousMeldCountRef = useRef(state.melds.length);

  useEffect(() => {
    const previousSeat = previousSeatRef.current;

    if (previousSeat !== 0 && state.currentSeat === 0) {
      setYourTurnPulse(true);
      playGameSound('turn', soundEnabled);

      const timer = window.setTimeout(() => {
        setYourTurnPulse(false);
      }, 900);

      previousSeatRef.current = state.currentSeat;
      return () => window.clearTimeout(timer);
    }

    previousSeatRef.current = state.currentSeat;
  }, [state.currentSeat, soundEnabled]);

  useEffect(() => {
    const previousCount = previousMeldCountRef.current;

    if (state.melds.length > previousCount) {
      playGameSound('meld', soundEnabled);
    }

    previousMeldCountRef.current = state.melds.length;
  }, [state.melds.length, soundEnabled]);

  /*
   * Yerdeki kartlar çoğaldığında yatay scroll'u otomatik
   * olarak en son atılan karta götürür.
   */
  const discardScrollRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element =
      discardScrollRef.current;

    if (!element) {
      return;
    }

    const frame =
      requestAnimationFrame(() => {
        element.scrollTo({
          left: element.scrollWidth,
          behavior: 'smooth',
        });
      });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [state.discard.length]);

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

  const registerHandCardElement = (
    cardId: string,
    element: HTMLDivElement | null,
  ) => {
    if (element) {
      cardElementsRef.current.set(cardId, element);
    } else {
      cardElementsRef.current.delete(cardId);
    }
  };

  const doDiscard = () => {
    if (selected.size !== 1) {
      return;
    }

    const cardId = [...selected][0];
    const card = me.hand.find((item) => item.id === cardId);
    const cardElement = cardElementsRef.current.get(cardId);
    const discardTarget = discardTargetRef.current;

    const from = cardElement?.getBoundingClientRect();
    const to = discardTarget?.getBoundingClientRect();

    const successful = humanDiscard(cardId);

    if (successful) {
      playGameSound('discard', soundEnabled);

      if (card && from && to) {
        setDiscardFlight({ card, from, to });
      }

      resetLocalActions();
    }
  };

  const drawDeckWithSound = () => {
    const successful = humanDrawDeck();

    if (successful) {
      playGameSound('draw', soundEnabled);
    }
  };

  const drawDiscardWithSound = (index?: number) => {
    const successful = humanDrawDiscard(index);

    if (successful) {
      playGameSound('draw', soundEnabled);
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
      layoffMode &&
      selectedCards.length === 1 &&
      appendableMeldIds.has(meldId)
    ) {
      const successful = humanLayOff(
        selectedCards[0].id,
        meldId,
      );

      if (successful) {
        clearSelection();
      }

      return;
    }

    setPreviewMeldId(meldId);
  };

  const toggleFullscreen = async () => {
    const nextFitMode = !fitMode;
    setFitMode(nextFitMode);

    try {
      if (
        nextFitMode &&
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        await document.documentElement.requestFullscreen();
      } else if (
        !nextFitMode &&
        document.fullscreenElement &&
        document.exitFullscreen
      ) {
        await document.exitFullscreen();
      }
    } catch {
      /*
       * Bazı mobil tarayıcılar Fullscreen API'yi desteklemez.
       * Bu durumda fitMode yine çalışır ve oyun ekrana sığdırılır.
       */
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
    <div className={fitMode ? "mobile-scale-stage is-fit-mode" : "mobile-scale-stage"}>
      <div className="anastra-page text-white flex flex-col">
        <div className="game-topbar">
        <h1 className="game-brand text-lg md:text-xl font-black">
          ANASTRA
        </h1>

        <div className="flex flex-wrap justify-end gap-2 text-xs md:text-sm">
          <span className="score-chip text-sky-300">
            T1: {state.teamScores[0]}
          </span>

          <span className="score-chip text-rose-300">
            T2: {state.teamScores[1]}
          </span>

          <span className="score-chip text-white/60">
            Baraj {state.openThreshold}
          </span>

          <button
            type="button"
            onClick={() => setSoundEnabled((value) => !value)}
            className="fullscreen-button"
            title={soundEnabled ? 'Sesleri kapat' : 'Sesleri aç'}
            aria-label={soundEnabled ? 'Sesleri kapat' : 'Sesleri aç'}
            aria-pressed={!soundEnabled}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="fullscreen-button"
            title={fitMode ? 'Tam ekrandan çık' : 'Tam ekran / ekrana sığdır'}
            aria-label={fitMode ? 'Tam ekrandan çık' : 'Tam ekran / ekrana sığdır'}
          >
            {fitMode ? '×' : '⛶'}
          </button>
        </div>
      </div>

      <div className="anastra-table-shell">
        <div
          className={[
            'anastra-table',
            yourTurnPulse ? 'is-your-turn-pulse' : '',
          ].join(' ')}
        >
          <div className="table-seat table-seat-top">
            <OpponentSeat
              player={state.players[2]}
              isCurrent={state.currentSeat === 2}
              thinking={aiThinking}
              position="top"
            />
          </div>

          <div className="table-seat table-seat-left">
            <OpponentSeat
              player={state.players[1]}
              isCurrent={state.currentSeat === 1}
              thinking={aiThinking}
              position="left"
            />
          </div>

          <div className="table-seat table-seat-right">
            <OpponentSeat
              player={state.players[3]}
              isCurrent={state.currentSeat === 3}
              thinking={aiThinking}
              position="right"
            />
          </div>

          <div className="table-meld-zone table-meld-zone-top">
            <TableMeldArea
              melds={state.melds.filter(
                (meld) =>
                  meld.ownerSeat === 2,
              )}
              orientation="top"
              layoffMode={layoffMode}
              onMeldClick={onMeldClick}
              appendableMeldIds={appendableMeldIds}
            />
          </div>

          <div className="table-meld-zone table-meld-zone-left">
            <TableMeldArea
              melds={state.melds.filter(
                (meld) =>
                  meld.ownerSeat === 1,
              )}
              orientation="left"
              layoffMode={layoffMode}
              onMeldClick={onMeldClick}
              appendableMeldIds={appendableMeldIds}
            />
          </div>

          <div className="table-meld-zone table-meld-zone-right">
            <TableMeldArea
              melds={state.melds.filter(
                (meld) =>
                  meld.ownerSeat === 3,
              )}
              orientation="right"
              layoffMode={layoffMode}
              onMeldClick={onMeldClick}
              appendableMeldIds={appendableMeldIds}
            />
          </div>

          <div className="table-center">
            <div className="table-deck-area">
              <button
                type="button"
                onClick={drawDeckWithSound}
                disabled={
                  !isMyTurn ||
                  state.phase !== 'draw'
                }
                className="deck-stack disabled:opacity-40"
              >
                <CardBack size="lg" />
              </button>

              <span className="table-center-label">
                Deste ({state.deck.length})
              </span>
            </div>


            <div
              ref={discardTargetRef}
              className="table-discard-area"
            >
              {state.discard.length > 0 ? (
                <div
                  ref={discardScrollRef}
                  className="max-w-[58vw] md:max-w-[480px] overflow-x-auto overflow-y-visible pt-5 pb-5"
                >
                  <div className="flex items-end px-3 min-w-max">
                    <AnimatePresence mode="popLayout">
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
                          <motion.button
                            key={card.id}
                            layout
                            exit={{
                              opacity: 0,
                              scale: 0.6,
                              transition: { duration: 0.15 },
                            }}
                            transition={{
                              type: 'spring',
                              stiffness: 520,
                              damping: 40,
                            }}
                            type="button"
                            onClick={() => {
                              if (!canInteract) {
                                return;
                              }

                              drawDiscardWithSound(index);
                            }}
                            disabled={!canInteract}
                            className={[
                              'relative border-0 bg-transparent p-0',
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
                                : me.hasOpened
                                  ? 'Sıra sende değil veya çekme aşamasında değilsin'
                                  : 'El açmadan yalnızca son kart alınabilir'
                            }
                          >
                            <div className="pointer-events-none select-none">
                              <CardView
                                card={card}
                                size="lg"
                                disabled
                              />
                            </div>
                          </motion.button>
                        );
                      },
                    )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="table-empty-discard" />
              )}

              <span className="table-center-label">
                Yer ({state.discard.length})
              </span>
            </div>
          </div>

          <div className="table-meld-zone table-meld-zone-bottom">
            <TableMeldArea
              melds={state.melds.filter(
                (meld) =>
                  meld.ownerSeat === 0,
              )}
              orientation="bottom"
              layoffMode={layoffMode}
              onMeldClick={onMeldClick}
              appendableMeldIds={appendableMeldIds}
            />
          </div>

          <div className="table-score-corners">
            {[0, 1].map(
              (team) => {
                const teamCards =
                  state.scoringCards.filter(
                    (item) =>
                      item.ownerTeam === team,
                  );

                if (
                  teamCards.length === 0
                ) {
                  return null;
                }

                const total =
                  teamCards.reduce(
                    (
                      sum,
                      item,
                    ) =>
                      sum +
                      item.card.points,
                    0,
                  );

                return (
                  <div
                    key={team}
                    className={[
                      'table-scoring-stack',
                      team === 0
                        ? 'ours'
                        : 'theirs',
                    ].join(' ')}
                  >
                    <CardBack size="sm" />

                    <span>
                      ×{teamCards.length}
                    </span>

                    <strong>
                      {total}p
                    </strong>
                  </div>
                );
              },
            )}
          </div>

          <div className="table-score-panel">
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
      </div>

      {previewMeldId && (() => {
        const meld = state.melds.find(
          (m) => m.id === previewMeldId,
        );
      
        if (!meld) return null;
      
        return (
          <div
            className="meld-preview-overlay"
            onClick={() =>
              setPreviewMeldId(null)
            }
          >
            <div
              className="meld-preview-window"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <button
                type="button"
                className="meld-preview-close"
                onClick={() =>
      setPreviewMeldId(null)
                }
              >
                ✕
              </button>
      
              <div className="meld-preview-cards">
                {meld.cards.map((card) => (
      <CardView
        key={card.id}
        card={card}
        size="lg"
        disabled
        animated={false}
      />
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      <AnimatePresence>
        {discardFlight && (
          <motion.div
            key={`discard-flight-${discardFlight.card.id}`}
            initial={{
              left: discardFlight.from.left,
              top: discardFlight.from.top,
              width: discardFlight.from.width,
              height: discardFlight.from.height,
              rotate: 0,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              left:
                discardFlight.to.left +
                discardFlight.to.width / 2 -
                discardFlight.from.width / 2,
              top:
                discardFlight.to.top +
                discardFlight.to.height / 2 -
                discardFlight.from.height / 2,
              rotate: 5,
              scale: 0.9,
              opacity: 1,
            }}
            exit={{ opacity: 0, scale: 0.82 }}
            transition={{
              duration: 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={() => setDiscardFlight(null)}
            style={{
              position: 'fixed',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            <CardView
              card={discardFlight.card}
              size="lg"
              disabled
              animated={false}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="action-dock p-2 md:p-3 space-y-2">
        {message && (
          <div
            className={[
              'status-message text-center text-sm',
              message.type === 'error'
                ? 'error'
                : message.type === 'success'
                  ? 'success'
                  : 'info',
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
                        animated={false}
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
          onReorder={reorderHand}
          onCardElement={registerHandCardElement}
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
                    className="game-button disabled:opacity-40 text-sm"
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
                    className="game-button primary disabled:opacity-40 text-sm"
                  >
                    Eli Aç
                  </button>

                  <button
                    type="button"
                    onClick={hint}
                    className="game-button text-sm"
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
                      'game-button text-sm',
                      layoffMode
                        ? 'primary'
                        : '',
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
                    className="game-button disabled:opacity-40 text-sm"
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
                  className="game-button danger text-sm"
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
                className="game-button gold disabled:opacity-40 text-sm"
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
                onClick={drawDeckWithSound}
                className="game-button primary px-6 text-sm"
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
    </div>
  );
}
export default function Home() {
  return <ExistingGameHome />;
}