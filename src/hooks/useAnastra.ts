// Anastra - Oyun durumu yönetimi hook'u
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  Card,
  GameState,
  Meld,
} from '../game/types';

import {
  canTakeDiscard,
  createRound,
  discardCard,
  drawFromDeck,
  drawFromDiscard,
  layOff,
  openHand,
  reorderPlayerHand,
  seatTeam,
} from '../game/engine';

import { meldPoints } from '../game/rules';
import { playAITurn } from '../game/ai';

import {
  completeHistoryGame,
  completeHistoryRound,
  recordHistoryAction,
  resetHistorySession,
  startHistoryGame,
  startHistoryRound,
} from '../game/history/session';

import type { GameActionType } from '../game/history/types';

export interface UIMessage {
  text: string;
  type: 'info' | 'error' | 'success';
}

interface PendingDiscardHistory {
  stateBefore: GameState;
  stateAfter: GameState;
  selectedIndex: number;
  cardIds: string[];
  cardsTakenCount: number;
}

function addedHandCards(
  before: GameState,
  after: GameState,
  seat: number,
): Card[] {
  const beforePlayer = before.players.find((player) => player.seat === seat);
  const afterPlayer = after.players.find((player) => player.seat === seat);

  if (!beforePlayer || !afterPlayer) {
    return [];
  }

  const beforeIds = new Set(beforePlayer.hand.map((card) => card.id));
  return afterPlayer.hand.filter((card) => !beforeIds.has(card.id));
}

function removedHandCards(
  before: GameState,
  after: GameState,
  seat: number,
): Card[] {
  const beforePlayer = before.players.find((player) => player.seat === seat);
  const afterPlayer = after.players.find((player) => player.seat === seat);

  if (!beforePlayer || !afterPlayer) {
    return [];
  }

  const afterIds = new Set(afterPlayer.hand.map((card) => card.id));
  return beforePlayer.hand.filter((card) => !afterIds.has(card.id));
}

function newMeldsOwnedBySeat(
  before: GameState,
  after: GameState,
  seat: number,
): Meld[] {
  const beforeIds = new Set(before.melds.map((meld) => meld.id));

  return after.melds.filter(
    (meld) => meld.ownerSeat === seat && !beforeIds.has(meld.id),
  );
}

function findChangedMeld(
  before: GameState,
  after: GameState,
): {
  beforeMeld?: Meld;
  afterMeld?: Meld;
} {
  for (const afterMeld of after.melds) {
    const beforeMeld = before.melds.find(
      (meld) => meld.id === afterMeld.id,
    );

    if (!beforeMeld) {
      return { afterMeld };
    }

    const beforeIds = beforeMeld.cards
      .map((card) => card.id)
      .sort()
      .join('|');

    const afterIds = afterMeld.cards
      .map((card) => card.id)
      .sort()
      .join('|');

    if (
      beforeIds !== afterIds ||
      beforeMeld.locked !== afterMeld.locked
    ) {
      return {
        beforeMeld,
        afterMeld,
      };
    }
  }

  return {};
}

function finishHistoryWhenNeeded(
  before: GameState,
  after: GameState,
): void {
  const ended =
    (after.phase === 'roundOver' || after.phase === 'gameOver') &&
    before.phase !== 'roundOver' &&
    before.phase !== 'gameOver';

  if (!ended) {
    return;
  }

  const finisher = after.players.find(
    (player) => player.hasOpened && player.hand.length === 0,
  );

  completeHistoryRound(after, {
    endReason: finisher ? 'finished' : 'deck',
    winnerSeat: finisher?.seat,
    winnerTeam: finisher?.team,
  });

  if (after.phase === 'gameOver') {
    completeHistoryGame(after);
  }
}

function recordAITransition(
  before: GameState,
  after: GameState,
  seat: number,
  stepKind: 'draw' | 'open' | 'layoff' | 'discard',
): void {
  if (stepKind === 'draw') {
    const added = addedHandCards(before, after, seat);

    recordHistoryAction(before, after, {
      seat,
      action: after.tookFromDiscard ? 'draw-discard' : 'draw-deck',
      cardIds: added.map((card) => card.id),
      discardStartIndex: after.tookFromDiscard
        ? after.discard.length
        : undefined,
      cardsTakenCount: after.tookFromDiscard
        ? added.length
        : undefined,
    });

    finishHistoryWhenNeeded(before, after);
    return;
  }

  if (stepKind === 'open') {
    const beforePlayer = before.players.find(
      (player) => player.seat === seat,
    );

    const removed = removedHandCards(before, after, seat);
    const newMelds = newMeldsOwnedBySeat(before, after, seat);

    recordHistoryAction(before, after, {
      seat,
      action: beforePlayer?.hasOpened ? 'create-meld' : 'open-hand',
      cardIds: removed.map((card) => card.id),
      openingPoints: newMelds.reduce(
        (total, meld) => total + meldPoints(meld.cards),
        0,
      ),
      requiredCardUsed: Boolean(
        before.requiredDiscardCardId &&
          after.requiredDiscardCardId === null,
      ),
    });

    finishHistoryWhenNeeded(before, after);
    return;
  }

  if (stepKind === 'layoff') {
    const player = before.players.find((item) => item.seat === seat);
    const removed = removedHandCards(before, after, seat);
    const changed = findChangedMeld(before, after);

    let action: GameActionType = 'layoff-own';

    if (
      player &&
      changed.afterMeld &&
      changed.afterMeld.ownerTeam !== player.team
    ) {
      action =
        changed.afterMeld.type === 'set'
          ? 'close-opponent-set'
          : 'replace-opponent-run';
    }

    const scoringBefore = before.scoringCards
      .filter((item) => item.ownerSeat === seat)
      .reduce((total, item) => total + item.card.points, 0);

    const scoringAfter = after.scoringCards
      .filter((item) => item.ownerSeat === seat)
      .reduce((total, item) => total + item.card.points, 0);

    recordHistoryAction(before, after, {
      seat,
      action,
      cardIds: removed.map((card) => card.id),
      meldId: changed.afterMeld?.id ?? changed.beforeMeld?.id,
      pointsGained: Math.max(0, scoringAfter - scoringBefore),
      requiredCardUsed: Boolean(
        before.requiredDiscardCardId &&
          after.requiredDiscardCardId === null,
      ),
      opponentMeldLocked: Boolean(
        player &&
          changed.beforeMeld &&
          changed.afterMeld &&
          changed.afterMeld.ownerTeam !== player.team &&
          !changed.beforeMeld.locked &&
          changed.afterMeld.locked,
      ),
    });

    finishHistoryWhenNeeded(before, after);
    return;
  }

  const discardedCard = after.discard[after.discard.length - 1];

  recordHistoryAction(before, after, {
    seat,
    action: 'discard',
    cardIds: discardedCard ? [discardedCard.id] : [],
    roundEnded:
      after.phase === 'roundOver' ||
      after.phase === 'gameOver',
  });

  finishHistoryWhenNeeded(before, after);
}

export function useAnastra(targetScore: number) {
  const [state, setState] = useState<GameState>(() =>
    createRound({ targetScore }),
  );

  const [message, setMessage] = useState<UIMessage | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  const historyStartedRef = useRef(false);
  const discardTakeBackupRef = useRef<GameState | null>(null);
  const pendingDiscardHistoryRef =
    useRef<PendingDiscardHistory | null>(null);

  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timeouts.current.forEach((timer) => clearTimeout(timer));
    timeouts.current = [];
  }, []);

  useEffect(() => {
    if (!historyStartedRef.current) {
      resetHistorySession();
      startHistoryGame(stateRef.current);
      historyStartedRef.current = true;
    }

    return clearTimers;
  }, [clearTimers]);

  const flash = useCallback(
    (text: string, type: UIMessage['type']) => {
      setMessage({ text, type });
    },
    [],
  );

  const flushPendingDiscardHistory = useCallback(() => {
    const pending = pendingDiscardHistoryRef.current;

    if (!pending) {
      return;
    }

    recordHistoryAction(
      pending.stateBefore,
      pending.stateAfter,
      {
        seat: 0,
        action: 'draw-discard',
        cardIds: pending.cardIds,
        discardStartIndex: pending.selectedIndex,
        cardsTakenCount: pending.cardsTakenCount,
      },
    );

    pendingDiscardHistoryRef.current = null;
  }, []);

  // AI turlarını otomatik oynat.
  useEffect(() => {
    if (
      state.phase === 'roundOver' ||
      state.phase === 'gameOver'
    ) {
      return;
    }

    const currentPlayer = state.players.find(
      (player) => player.seat === state.currentSeat,
    );

    if (!currentPlayer || currentPlayer.isHuman) {
      return;
    }

    discardTakeBackupRef.current = null;
    pendingDiscardHistoryRef.current = null;
    setAiThinking(true);

    const aiSeat = state.currentSeat;
    const generator = playAITurn(state);
    let previousAIState = state;

    const runStep = () => {
      const result = generator.next();

      if (result.done) {
        setAiThinking(false);
        return;
      }

      const step = result.value;

      if (step.kind !== 'done') {
        recordAITransition(
          previousAIState,
          step.state,
          aiSeat,
          step.kind,
        );
      }

      previousAIState = step.state;
      setState(step.state);

      if (step.kind === 'done') {
        setAiThinking(false);
        return;
      }

      let delay = 650;

      if (step.kind === 'draw') {
        delay = 700;
      } else if (step.kind === 'discard') {
        delay = 800;
      }

      const timer = setTimeout(runStep, delay);
      timeouts.current.push(timer);
    };

    const initialTimer = setTimeout(runStep, 600);
    timeouts.current.push(initialTimer);

    return clearTimers;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentSeat, state.phase]);

  const humanDrawDeck = useCallback(() => {
    const currentState = stateRef.current;

    if (
      currentState.currentSeat !== 0 ||
      currentState.phase !== 'draw'
    ) {
      return;
    }

    discardTakeBackupRef.current = null;
    pendingDiscardHistoryRef.current = null;
    setMessage(null);

    const nextState = drawFromDeck(currentState);
    const added = addedHandCards(currentState, nextState, 0);

    recordHistoryAction(currentState, nextState, {
      seat: 0,
      action: 'draw-deck',
      cardIds: added.map((card) => card.id),
    });

    finishHistoryWhenNeeded(currentState, nextState);
    setState(nextState);
  }, []);

  const humanDrawDiscard = useCallback(
    (selectedIndex?: number) => {
      const currentState = stateRef.current;

      if (
        currentState.currentSeat !== 0 ||
        currentState.phase !== 'draw'
      ) {
        return;
      }

      if (currentState.discard.length === 0) {
        flash('Yerde alınacak kart yok.', 'error');
        return;
      }

      const player = currentState.players[0];
      const effectiveIndex = player.hasOpened
        ? selectedIndex
        : currentState.discard.length - 1;

      if (!canTakeDiscard(currentState, 0, effectiveIndex)) {
        flash(
          player.hasOpened
            ? 'Seçtiğin kart mevcut perlerden hiçbirine işlenemiyor.'
            : 'Rakibin son attığı kart alınamadı.',
          'error',
        );
        return;
      }

      discardTakeBackupRef.current = currentState;

      const nextState = drawFromDiscard(
        currentState,
        effectiveIndex,
      );

      const handDidNotChange =
        nextState.players[0].hand.length ===
        currentState.players[0].hand.length;

      const discardDidNotChange =
        nextState.discard.length ===
        currentState.discard.length;

      if (handDidNotChange && discardDidNotChange) {
        discardTakeBackupRef.current = null;
        pendingDiscardHistoryRef.current = null;
        flash('Yerden kart alma işlemi gerçekleşmedi.', 'error');
        return;
      }

      const added = addedHandCards(currentState, nextState, 0);

      pendingDiscardHistoryRef.current = {
        stateBefore: currentState,
        stateAfter: nextState,
        selectedIndex:
          effectiveIndex ??
          currentState.discard.length - 1,
        cardIds: added.map((card) => card.id),
        cardsTakenCount: added.length,
      };

      setState(nextState);

      const requiredCard = nextState.players[0].hand.find(
        (card) => card.id === nextState.requiredDiscardCardId,
      );

      if (!player.hasOpened) {
        flash(
          requiredCard
            ? requiredCard.rank +
                ' kartını aldın. Bu kartı açılış perlerinden birinde kullanarak elini açmalısın. Açamazsan Yerden Almayı İptal Et düğmesine basabilirsin.'
            : 'Rakibin son attığı kartı aldın. Bu kartla elini açmalısın.',
          'info',
        );
        return;
      }

      flash(
        requiredCard
          ? 'Yerden ' +
              nextState.takenDiscardCardIds.length +
              ' kart aldın. ' +
              requiredCard.rank +
              ' kartını şimdi işlemelisin. Uygun değilse işlemi iptal edebilirsin.'
          : 'Yerden kartları aldın. Seçtiğin ilk kartı şimdi işlemelisin.',
        'info',
      );
    },
    [flash],
  );

  const humanCancelDiscardTake = useCallback(() => {
    const backup = discardTakeBackupRef.current;
    const currentState = stateRef.current;

    if (!backup) {
      flash(
        'Geri alınabilecek bir yerden kart alma işlemi yok.',
        'error',
      );
      return false;
    }

    if (
      currentState.currentSeat !== 0 ||
      currentState.phase !== 'action' ||
      !currentState.tookFromDiscard ||
      !currentState.requiredDiscardCardId
    ) {
      flash(
        'Bu aşamada yerden kart alma işlemi geri alınamaz.',
        'error',
      );
      return false;
    }

    discardTakeBackupRef.current = null;
    pendingDiscardHistoryRef.current = null;
    setState(backup);

    flash(
      'Yerden aldığın kartları geri koydun. Desteden çekebilir veya başka bir yer kartını deneyebilirsin.',
      'info',
    );

    return true;
  }, [flash]);

  const humanOpen = useCallback(
    (meldCardIds: string[][]) => {
      const currentState = stateRef.current;
      const playerBefore = currentState.players[0];
      const result = openHand(currentState, 0, meldCardIds);

      if (!result.ok) {
        flash(result.error || 'Açılış başarısız.', 'error');
        return false;
      }

      flushPendingDiscardHistory();

      const createdMelds = newMeldsOwnedBySeat(
        currentState,
        result.state,
        0,
      );

      recordHistoryAction(currentState, result.state, {
        seat: 0,
        action: playerBefore.hasOpened
          ? 'create-meld'
          : 'open-hand',
        cardIds: meldCardIds.flat(),
        openingPoints: createdMelds.reduce(
          (total, meld) => total + meldPoints(meld.cards),
          0,
        ),
        requiredCardUsed: Boolean(
          currentState.requiredDiscardCardId &&
            result.state.requiredDiscardCardId === null,
        ),
      });

      finishHistoryWhenNeeded(currentState, result.state);
      discardTakeBackupRef.current = null;
      setState(result.state);

      flash(
        playerBefore.hasOpened ? 'Yeni per açtın!' : 'Elini açtın!',
        'success',
      );

      return true;
    },
    [flash, flushPendingDiscardHistory],
  );

  const humanLayOff = useCallback(
    (cardId: string, meldId: string) => {
      const currentState = stateRef.current;
      const usedRequiredCard =
        currentState.requiredDiscardCardId === cardId;

      const targetMeld = currentState.melds.find(
        (meld) => meld.id === meldId,
      );

      const player = currentState.players[0];
      const result = layOff(currentState, 0, cardId, meldId);

      if (!result.ok) {
        flash(result.error || 'İşleme başarısız.', 'error');
        return false;
      }

      if (usedRequiredCard) {
        flushPendingDiscardHistory();
        discardTakeBackupRef.current = null;
      }

      let action: GameActionType = 'layoff-own';

      if (targetMeld && targetMeld.ownerTeam !== player.team) {
        action =
          targetMeld.type === 'set'
            ? 'close-opponent-set'
            : 'replace-opponent-run';
      }

      const scoringBefore = currentState.scoringCards
        .filter((item) => item.ownerSeat === 0)
        .reduce((total, item) => total + item.card.points, 0);

      const scoringAfter = result.state.scoringCards
        .filter((item) => item.ownerSeat === 0)
        .reduce((total, item) => total + item.card.points, 0);

      const updatedMeld = result.state.melds.find(
        (meld) => meld.id === meldId,
      );

      recordHistoryAction(currentState, result.state, {
        seat: 0,
        action,
        cardIds: [cardId],
        meldId,
        pointsGained: Math.max(0, scoringAfter - scoringBefore),
        requiredCardUsed: usedRequiredCard,
        opponentMeldLocked: Boolean(
          targetMeld &&
            updatedMeld &&
            targetMeld.ownerTeam !== player.team &&
            !targetMeld.locked &&
            updatedMeld.locked,
        ),
      });

      finishHistoryWhenNeeded(currentState, result.state);
      setState(result.state);

      flash(
        usedRequiredCard
          ? 'Yerden aldığın zorunlu kartı işledin.'
          : 'Kartı pere işledin.',
        'success',
      );

      return true;
    },
    [flash, flushPendingDiscardHistory],
  );

  const humanDiscard = useCallback(
    (cardId: string) => {
      const currentState = stateRef.current;
      const result = discardCard(currentState, 0, cardId);

      if (!result.ok) {
        flash(result.error || 'Atma başarısız.', 'error');
        return false;
      }

      recordHistoryAction(currentState, result.state, {
        seat: 0,
        action: 'discard',
        cardIds: [cardId],
        roundEnded:
          result.state.phase === 'roundOver' ||
          result.state.phase === 'gameOver',
      });

      finishHistoryWhenNeeded(currentState, result.state);
      discardTakeBackupRef.current = null;
      pendingDiscardHistoryRef.current = null;
      setState(result.state);
      setMessage(null);

      return true;
    },
    [flash],
  );


  /*
   * İnsan oyuncunun elindeki kartların görsel sırasını
   * değiştirir. Bu işlem oyun hamlesi değildir ve
   * History sistemine kaydedilmez.
   */
  const reorderHand = useCallback(
    (
      fromIndex: number,
      toIndex: number,
    ) => {
      const currentState =
        stateRef.current;

      if (
        fromIndex === toIndex
      ) {
        return;
      }

      const nextState =
        reorderPlayerHand(
          currentState,
          0,
          fromIndex,
          toIndex,
        );

      stateRef.current =
        nextState;

      setState(
        nextState,
      );
    },
    [],
  );

  const nextRound = useCallback(() => {
    const currentState = stateRef.current;

    clearTimers();
    discardTakeBackupRef.current = null;
    pendingDiscardHistoryRef.current = null;

    const nextState = createRound({
      targetScore: currentState.targetScore,
      dealerSeat: (currentState.dealerSeat + 1) % 4,
      teamScores: currentState.teamScores,
      roundNumber: currentState.roundNumber + 1,

      // Skor defteri geçmişini yeni ele taşı.
      scoreHistory: currentState.scoreHistory,
    });

    startHistoryRound(nextState);
    setState(nextState);
    setMessage(null);
  }, [clearTimers]);

  const newGame = useCallback(
    (target: number) => {
      clearTimers();
      discardTakeBackupRef.current = null;
      pendingDiscardHistoryRef.current = null;

      resetHistorySession();

      const nextState = createRound({
        targetScore: target,
      });

      startHistoryGame(nextState);
      historyStartedRef.current = true;
      setState(nextState);
      setMessage(null);
    },
    [clearTimers],
  );

  return {
    state,
    message,
    aiThinking,
    setMessage,
    humanDrawDeck,
    humanDrawDiscard,
    humanCancelDiscardTake,
    humanOpen,
    humanLayOff,
    humanDiscard,
    reorderHand,
    nextRound,
    newGame,
    seatTeam,
  };
}