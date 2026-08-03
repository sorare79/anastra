// Anastra - Oyun durumu yönetimi hook'u
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { GameState } from '../game/types';
import {
  canTakeDiscard,
  createRound,
  discardCard,
  drawFromDeck,
  drawFromDiscard,
  layOff,
  openHand,
  seatTeam,
} from '../game/engine';
import { playAITurn } from '../game/ai';

export interface UIMessage {
  text: string;
  type: 'info' | 'error' | 'success';
}

export function useAnastra(targetScore: number) {
  const [state, setState] = useState<GameState>(() =>
    createRound({ targetScore }),
  );
  const [message, setMessage] = useState<UIMessage | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  const discardTakeBackupRef = useRef<GameState | null>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timeouts.current.forEach((timer) => clearTimeout(timer));
    timeouts.current = [];
  }, []);

  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  const flash = useCallback(
    (text: string, type: UIMessage['type']) => {
      setMessage({ text, type });
    },
    [],
  );

  // AI turlarını otomatik oynat.
  useEffect(() => {
    if (state.phase === 'roundOver' || state.phase === 'gameOver') {
      return;
    }

    const currentPlayer = state.players.find(
      (player) => player.seat === state.currentSeat,
    );

    if (!currentPlayer || currentPlayer.isHuman) {
      return;
    }

    discardTakeBackupRef.current = null;
    setAiThinking(true);

    const generator = playAITurn(state);

    const runStep = () => {
      const result = generator.next();

      if (result.done) {
        setAiThinking(false);
        return;
      }

      const step = result.value;
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

    return () => {
      clearTimers();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentSeat, state.phase]);

  const humanDrawDeck = useCallback(() => {
    const currentState = stateRef.current;

    if (currentState.currentSeat !== 0 || currentState.phase !== 'draw') {
      return;
    }

    discardTakeBackupRef.current = null;
    setMessage(null);
    setState(drawFromDeck(currentState));
  }, []);

  const humanDrawDiscard = useCallback(
    (selectedIndex?: number) => {
      const currentState = stateRef.current;

      if (currentState.currentSeat !== 0 || currentState.phase !== 'draw') {
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

      const nextState = drawFromDiscard(currentState, effectiveIndex);
      const handDidNotChange =
        nextState.players[0].hand.length === currentState.players[0].hand.length;
      const discardDidNotChange =
        nextState.discard.length === currentState.discard.length;

      if (handDidNotChange && discardDidNotChange) {
        discardTakeBackupRef.current = null;
        flash('Yerden kart alma işlemi gerçekleşmedi.', 'error');
        return;
      }

      setState(nextState);

      const requiredCard = nextState.players[0].hand.find(
        (card) => card.id === nextState.requiredDiscardCardId,
      );

      if (!player.hasOpened) {
        if (requiredCard) {
          flash(
            requiredCard.rank +
              ' kartını aldın. Bu kartı açılış perlerinden birinde kullanarak elini açmalısın. Açamazsan Yerden Almayı İptal Et düğmesine basabilirsin.',
            'info',
          );
        } else {
          flash(
            'Rakibin son attığı kartı aldın. Bu kartla elini açmalısın.',
            'info',
          );
        }
        return;
      }

      if (requiredCard) {
        flash(
          'Yerden ' +
            nextState.takenDiscardCardIds.length +
            ' kart aldın. ' +
            requiredCard.rank +
            ' kartını şimdi işlemelisin. Uygun değilse işlemi iptal edebilirsin.',
          'info',
        );
      } else {
        flash(
          'Yerden kartları aldın. Seçtiğin ilk kartı şimdi işlemelisin.',
          'info',
        );
      }
    },
    [flash],
  );

  const humanCancelDiscardTake = useCallback(() => {
    const backup = discardTakeBackupRef.current;
    const currentState = stateRef.current;

    if (!backup) {
      flash('Geri alınabilecek bir yerden kart alma işlemi yok.', 'error');
      return false;
    }

    if (
      currentState.currentSeat !== 0 ||
      currentState.phase !== 'action' ||
      !currentState.tookFromDiscard ||
      !currentState.requiredDiscardCardId
    ) {
      flash('Bu aşamada yerden kart alma işlemi geri alınamaz.', 'error');
      return false;
    }

    discardTakeBackupRef.current = null;
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
      const result = openHand(currentState, 0, meldCardIds);

      if (!result.ok) {
        flash(result.error || 'Açılış başarısız.', 'error');
        return false;
      }

      discardTakeBackupRef.current = null;
      setState(result.state);
      flash('Elini açtın!', 'success');
      return true;
    },
    [flash],
  );

  const humanLayOff = useCallback(
    (cardId: string, meldId: string) => {
      const currentState = stateRef.current;
      const usedRequiredCard =
        currentState.requiredDiscardCardId === cardId;
      const result = layOff(currentState, 0, cardId, meldId);

      if (!result.ok) {
        flash(result.error || 'İşleme başarısız.', 'error');
        return false;
      }

      if (usedRequiredCard) {
        discardTakeBackupRef.current = null;
      }

      setState(result.state);
      flash(
        usedRequiredCard
          ? 'Yerden aldığın zorunlu kartı işledin.'
          : 'Kartı pere işledin.',
        'success',
      );
      return true;
    },
    [flash],
  );

  const humanDiscard = useCallback(
    (cardId: string) => {
      const currentState = stateRef.current;
      const result = discardCard(currentState, 0, cardId);

      if (!result.ok) {
        flash(result.error || 'Atma başarısız.', 'error');
        return false;
      }

      discardTakeBackupRef.current = null;
      setState(result.state);
      setMessage(null);
      return true;
    },
    [flash],
  );

  const nextRound = useCallback(() => {
    const currentState = stateRef.current;

    clearTimers();
    discardTakeBackupRef.current = null;
    setState(
      createRound({
        targetScore: currentState.targetScore,
        dealerSeat: (currentState.dealerSeat + 1) % 4,
        teamScores: currentState.teamScores,
        roundNumber: currentState.roundNumber + 1,
      }),
    );
    setMessage(null);
  }, [clearTimers]);

  const newGame = useCallback(
    (target: number) => {
      clearTimers();
      discardTakeBackupRef.current = null;
      setState(createRound({ targetScore: target }));
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
    nextRound,
    newGame,
    seatTeam,
  };
}
