// Anastra AI - Hamle simülasyon katmanı

import type {
  Card,
  GameState,
  Player,
} from '../types';

import {
  discardCard,
  drawFromDeck,
  drawFromDiscard,
  layOff,
  openHand,
} from '../engine';

import {
  handPenalty,
  meldPoints,
} from '../rules';

import {
  getOpeningMeldCardIds,
} from './actionGenerator';

import type {
  AIActionCandidate,
  AIActionType,
} from './types';

/*
 * Simulator karar vermez ve hamle puanlamaz.
 *
 * Yalnızca:
 * - hamleyi oyun motorunda dener,
 * - başarılı olup olmadığını bildirir,
 * - oluşan yeni durumu ve değişimleri döndürür.
 */

export interface AISimulationMetrics {
  handCardsBefore: number;
  handCardsAfter: number;
  handReduction: number;

  handPenaltyBefore: number;
  handPenaltyAfter: number;
  penaltyReduction: number;

  ownMeldPointsBefore: number;
  ownMeldPointsAfter: number;
  meldPointGain: number;

  ownScoringPointsBefore: number;
  ownScoringPointsAfter: number;
  scoringPointGain: number;

  opponentMeldPointsBefore: number;
  opponentMeldPointsAfter: number;
  opponentMeldPointLoss: number;

  discardCountBefore: number;
  discardCountAfter: number;

  cardsTakenFromDiscard: number;

  lockedOpponentMeldsBefore: number;
  lockedOpponentMeldsAfter: number;
  newlyLockedOpponentMelds: number;

  roundEnded: boolean;
}

export interface AISimulationResult {
  success: boolean;

  action: AIActionCandidate;

  stateBefore: GameState;

  stateAfter: GameState;

  metrics: AISimulationMetrics;

  error?: string;
}

function getPlayer(
  state: GameState,
  seat: number,
): Player {
  const player = state.players.find(
    (item) => item.seat === seat,
  );

  if (!player) {
    throw new Error(
      'Simülasyon için oyuncu bulunamadı.',
    );
  }

  return player;
}

function opponentTeam(
  team: number,
): number {
  return team === 0 ? 1 : 0;
}

function teamMeldPoints(
  state: GameState,
  team: number,
): number {
  return state.melds
    .filter(
      (meld) =>
        meld.ownerTeam === team,
    )
    .reduce(
      (total, meld) =>
        total +
        meldPoints(meld.cards),
      0,
    );
}

function teamScoringPoints(
  state: GameState,
  team: number,
): number {
  return state.scoringCards
    .filter(
      (item) =>
        item.ownerTeam === team,
    )
    .reduce(
      (total, item) =>
        total +
        item.card.points,
      0,
    );
}

function lockedMeldCount(
  state: GameState,
  team: number,
): number {
  return state.melds.filter(
    (meld) =>
      meld.ownerTeam === team &&
      meld.locked,
  ).length;
}

function emptyMetrics(
  state: GameState,
  seat: number,
): AISimulationMetrics {
  const player = getPlayer(
    state,
    seat,
  );

  const enemyTeam =
    opponentTeam(player.team);

  const playerPenalty =
    handPenalty(player.hand);

  const ownMeldPoints =
    teamMeldPoints(
      state,
      player.team,
    );

  const ownScoringPoints =
    teamScoringPoints(
      state,
      player.team,
    );

  const opponentPoints =
    teamMeldPoints(
      state,
      enemyTeam,
    );

  const opponentLocked =
    lockedMeldCount(
      state,
      enemyTeam,
    );

  return {
    handCardsBefore:
      player.hand.length,

    handCardsAfter:
      player.hand.length,

    handReduction: 0,

    handPenaltyBefore:
      playerPenalty,

    handPenaltyAfter:
      playerPenalty,

    penaltyReduction: 0,

    ownMeldPointsBefore:
      ownMeldPoints,

    ownMeldPointsAfter:
      ownMeldPoints,

    meldPointGain: 0,

    ownScoringPointsBefore:
      ownScoringPoints,

    ownScoringPointsAfter:
      ownScoringPoints,

    scoringPointGain: 0,

    opponentMeldPointsBefore:
      opponentPoints,

    opponentMeldPointsAfter:
      opponentPoints,

    opponentMeldPointLoss: 0,

    discardCountBefore:
      state.discard.length,

    discardCountAfter:
      state.discard.length,

    cardsTakenFromDiscard: 0,

    lockedOpponentMeldsBefore:
      opponentLocked,

    lockedOpponentMeldsAfter:
      opponentLocked,

    newlyLockedOpponentMelds: 0,

    roundEnded:
      state.phase === 'roundOver' ||
      state.phase === 'gameOver',
  };
}

function calculateMetrics(
  before: GameState,
  after: GameState,
  seat: number,
  actionType: AIActionType,
): AISimulationMetrics {
  const beforePlayer =
    getPlayer(before, seat);

  const afterPlayer =
    getPlayer(after, seat);

  const ownTeam =
    beforePlayer.team;

  const enemyTeam =
    opponentTeam(ownTeam);

  const handPenaltyBefore =
    handPenalty(
      beforePlayer.hand,
    );

  const handPenaltyAfter =
    handPenalty(
      afterPlayer.hand,
    );

  const ownMeldPointsBefore =
    teamMeldPoints(
      before,
      ownTeam,
    );

  const ownMeldPointsAfter =
    teamMeldPoints(
      after,
      ownTeam,
    );

  const ownScoringPointsBefore =
    teamScoringPoints(
      before,
      ownTeam,
    );

  const ownScoringPointsAfter =
    teamScoringPoints(
      after,
      ownTeam,
    );

  const opponentMeldPointsBefore =
    teamMeldPoints(
      before,
      enemyTeam,
    );

  const opponentMeldPointsAfter =
    teamMeldPoints(
      after,
      enemyTeam,
    );

  const lockedBefore =
    lockedMeldCount(
      before,
      enemyTeam,
    );

  const lockedAfter =
    lockedMeldCount(
      after,
      enemyTeam,
    );

  const cardsTakenFromDiscard =
    actionType === 'draw-discard'
      ? Math.max(
          0,
          before.discard.length -
            after.discard.length,
        )
      : 0;

  return {
    handCardsBefore:
      beforePlayer.hand.length,

    handCardsAfter:
      afterPlayer.hand.length,

    handReduction:
      beforePlayer.hand.length -
      afterPlayer.hand.length,

    handPenaltyBefore,

    handPenaltyAfter,

    penaltyReduction:
      handPenaltyBefore -
      handPenaltyAfter,

    ownMeldPointsBefore,

    ownMeldPointsAfter,

    meldPointGain:
      ownMeldPointsAfter -
      ownMeldPointsBefore,

    ownScoringPointsBefore,

    ownScoringPointsAfter,

    scoringPointGain:
      ownScoringPointsAfter -
      ownScoringPointsBefore,

    opponentMeldPointsBefore,

    opponentMeldPointsAfter,

    opponentMeldPointLoss:
      opponentMeldPointsBefore -
      opponentMeldPointsAfter,

    discardCountBefore:
      before.discard.length,

    discardCountAfter:
      after.discard.length,

    cardsTakenFromDiscard,

    lockedOpponentMeldsBefore:
      lockedBefore,

    lockedOpponentMeldsAfter:
      lockedAfter,

    newlyLockedOpponentMelds:
      Math.max(
        0,
        lockedAfter -
          lockedBefore,
      ),

    roundEnded:
      after.phase === 'roundOver' ||
      after.phase === 'gameOver',
  };
}

function failedSimulation(
  state: GameState,
  seat: number,
  action: AIActionCandidate,
  error: string,
): AISimulationResult {
  return {
    success: false,

    action,

    stateBefore: state,

    stateAfter: state,

    metrics:
      emptyMetrics(
        state,
        seat,
      ),

    error,
  };
}

function firstCardId(
  action: AIActionCandidate,
): string | null {
  return (
    action.cardIds?.[0] ??
    null
  );
}

function cardsFromIds(
  hand: Card[],
  ids: string[],
): Card[] {
  const idSet =
    new Set(ids);

  return hand.filter(
    (card) =>
      idSet.has(card.id),
  );
}

/*
 * Tek bir hamle adayını motor üzerinde simüle eder.
 */
export function simulateAction(
  state: GameState,
  seat: number,
  action: AIActionCandidate,
): AISimulationResult {
  if (
    state.currentSeat !== seat
  ) {
    return failedSimulation(
      state,
      seat,
      action,
      'Simülasyon yapılan oyuncunun sırası değil.',
    );
  }

  const player =
    getPlayer(state, seat);

  let resultingState =
    state;

  switch (action.type) {
    case 'draw-deck': {
      if (state.phase !== 'draw') {
        return failedSimulation(
          state,
          seat,
          action,
          'Kapalı desteden çekme yalnızca çekme aşamasında yapılabilir.',
        );
      }

      resultingState =
        drawFromDeck(state);

      break;
    }

    case 'draw-discard': {
      if (
        action.discardIndex ===
        undefined
      ) {
        return failedSimulation(
          state,
          seat,
          action,
          'Yerden alma için kart indeksi bulunamadı.',
        );
      }

      resultingState =
        drawFromDiscard(
          state,
          action.discardIndex,
        );

      if (
        resultingState === state ||
        !resultingState.tookFromDiscard
      ) {
        return failedSimulation(
          state,
          seat,
          action,
          'Seçilen yer kartı alınamadı.',
        );
      }

      break;
    }

    case 'open-hand': {
      const meldGroups =
        getOpeningMeldCardIds(
          player.hand,
        );

      if (
        meldGroups.length === 0
      ) {
        return failedSimulation(
          state,
          seat,
          action,
          'Geçerli açılış perleri bulunamadı.',
        );
      }

      const result =
        openHand(
          state,
          seat,
          meldGroups,
        );

      if (!result.ok) {
        return failedSimulation(
          state,
          seat,
          action,
          result.error ??
            'Açılış simülasyonu başarısız.',
        );
      }

      resultingState =
        result.state;

      break;
    }

    case 'create-meld': {
      const ids =
        action.cardIds ?? [];

      if (ids.length < 3) {
        return failedSimulation(
          state,
          seat,
          action,
          'Yeni per için yeterli kart seçilmedi.',
        );
      }

      const cards =
        cardsFromIds(
          player.hand,
          ids,
        );

      if (
        cards.length !==
        ids.length
      ) {
        return failedSimulation(
          state,
          seat,
          action,
          'Yeni per kartlarından biri oyuncunun elinde bulunamadı.',
        );
      }

      const result =
        openHand(
          state,
          seat,
          [ids],
        );

      if (!result.ok) {
        return failedSimulation(
          state,
          seat,
          action,
          result.error ??
            'Yeni per simülasyonu başarısız.',
        );
      }

      resultingState =
        result.state;

      break;
    }

    case 'layoff-own':
    case 'close-opponent-set':
    case 'replace-opponent-run': {
      const cardId =
        firstCardId(action);

      if (!cardId) {
        return failedSimulation(
          state,
          seat,
          action,
          'İşlenecek kart bulunamadı.',
        );
      }

      if (!action.meldId) {
        return failedSimulation(
          state,
          seat,
          action,
          'İşlenecek per bulunamadı.',
        );
      }

      const result =
        layOff(
          state,
          seat,
          cardId,
          action.meldId,
        );

      if (!result.ok) {
        return failedSimulation(
          state,
          seat,
          action,
          result.error ??
            'İşleme simülasyonu başarısız.',
        );
      }

      resultingState =
        result.state;

      break;
    }

    case 'discard': {
      const cardId =
        firstCardId(action);

      if (!cardId) {
        return failedSimulation(
          state,
          seat,
          action,
          'Atılacak kart bulunamadı.',
        );
      }

      const result =
        discardCard(
          state,
          seat,
          cardId,
        );

      if (!result.ok) {
        return failedSimulation(
          state,
          seat,
          action,
          result.error ??
            'Kart atma simülasyonu başarısız.',
        );
      }

      resultingState =
        result.state;

      break;
    }

    case 'wait-to-open':
    case 'finish-turn': {
      /*
       * Bunlar doğrudan motor hamlesi değildir.
       * Goal Planner seviyesinde kullanılan plan
       * ifadeleridir.
       */
      return failedSimulation(
        state,
        seat,
        action,
        'Bu eylem doğrudan simüle edilebilen bir motor hamlesi değildir.',
      );
    }
  }

  return {
    success: true,

    action: {
      ...action,
      resultingState,
    },

    stateBefore: state,

    stateAfter:
      resultingState,

    metrics:
      calculateMetrics(
        state,
        resultingState,
        seat,
        action.type,
      ),
  };
}

/*
 * Birden fazla hamle adayını aynı oyun durumu üzerinde
 * ayrı ayrı simüle eder.
 *
 * Her aday başlangıçtaki aynı state üzerinden denenir;
 * adaylar birbirlerinin sonucunu etkilemez.
 */
export function simulateActions(
  state: GameState,
  seat: number,
  actions: AIActionCandidate[],
): AISimulationResult[] {
  return actions.map(
    (action) =>
      simulateAction(
        state,
        seat,
        action,
      ),
  );
}

/*
 * Yalnızca başarılı simülasyonları döndürür.
 */
export function successfulSimulations(
  simulations: AISimulationResult[],
): AISimulationResult[] {
  return simulations.filter(
    (simulation) =>
      simulation.success,
  );
}