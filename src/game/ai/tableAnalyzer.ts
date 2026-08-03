// Anastra AI - Ortak masa analiz katmanı

import type {
  GameState,
  Player,
} from '../types';

import {
  handPenalty,
  meldPoints,
} from '../rules';

import {
  selectBestMelds,
} from '../meldFinder';

import type {
  AIGameStage,
  AITableAnalysis,
} from './types';

/*
 * Bu dosya AI'nın gözleridir.
 *
 * Strategy, Goal Planner, Utility ve ileride
 * Action Generator aynı masa analizini kullanır.
 */

export interface ExtendedTableAnalysis
  extends AITableAnalysis {
  stage: AIGameStage;

  currentOpeningPoints: number;

  currentOpeningCardCount: number;

  cardsRemainingAfterOpening: number;

  ownOpened: boolean;

  teammateOpened: boolean;

  allOpponentsOpened: boolean;

  visibleOpponentHandTotal: number;

  ownTeamHandTotal: number;

  discardPenaltyTotal: number;

  lockedOwnMeldCount: number;

  lockedOpponentMeldCount: number;

  availableOpponentSetCount: number;

  availableOpponentRunCount: number;

  scoreDifference: number;
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
      'Masa analizi için oyuncu bulunamadı.',
    );
  }

  return player;
}

function opponentTeam(
  team: number,
): number {
  return team === 0 ? 1 : 0;
}

function getTeamMeldPoints(
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

function getTeamScoringPoints(
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

function determineStage(
  state: GameState,
): AIGameStage {
  const openedCount =
    state.players.filter(
      (player) =>
        player.hasOpened,
    ).length;

  const smallestHand =
    Math.min(
      ...state.players.map(
        (player) =>
          player.hand.length,
      ),
    );

  if (
    state.deck.length <= 18 ||
    smallestHand <= 4
  ) {
    return 'late';
  }

  if (openedCount > 0) {
    return 'mid';
  }

  return 'early';
}

function discardPenaltyTotal(
  state: GameState,
): number {
  return state.discard.reduce(
    (total, card) =>
      total +
      card.points,
    0,
  );
}

export function analyzeTableState(
  state: GameState,
  seat: number,
): ExtendedTableAnalysis {
  const player =
    getPlayer(
      state,
      seat,
    );

  const ownTeam =
    player.team;

  const enemyTeam =
    opponentTeam(
      ownTeam,
    );

  const opponents =
    state.players.filter(
      (item) =>
        item.team === enemyTeam,
    );

  const teammates =
    state.players.filter(
      (item) =>
        item.team === ownTeam &&
        item.seat !== seat,
    );

  const openedPlayers =
    state.players.filter(
      (item) =>
        item.hasOpened,
    );

  const openedOpponents =
    opponents.filter(
      (item) =>
        item.hasOpened,
    );

  const openedTeammates =
    teammates.filter(
      (item) =>
        item.hasOpened,
    );

  const opponentHandSizes =
    opponents.map(
      (item) =>
        item.hand.length,
    );

  const smallestOpponentHand =
    opponentHandSizes.length > 0
      ? Math.min(
          ...opponentHandSizes,
        )
      : 0;

  const largestOpponentHand =
    opponentHandSizes.length > 0
      ? Math.max(
          ...opponentHandSizes,
        )
      : 0;

  const bestOpeningMelds =
    selectBestMelds(
      player.hand,
    );

  const currentOpeningPoints =
    bestOpeningMelds.reduce(
      (total, meld) =>
        total +
        meldPoints(meld),
      0,
    );

  const currentOpeningCardCount =
    bestOpeningMelds.reduce(
      (total, meld) =>
        total +
        meld.length,
      0,
    );

  const ownMeldPoints =
    getTeamMeldPoints(
      state,
      ownTeam,
    );

  const ownScoringCardPoints =
    getTeamScoringPoints(
      state,
      ownTeam,
    );

  const opponentMeldPoints =
    getTeamMeldPoints(
      state,
      enemyTeam,
    );

  const opponentScoringCardPoints =
    getTeamScoringPoints(
      state,
      enemyTeam,
    );

  const visibleOpponentHandTotal =
    opponents.reduce(
      (total, item) =>
        total +
        item.hand.length,
      0,
    );

  const ownTeamHandTotal =
    state.players
      .filter(
        (item) =>
          item.team === ownTeam,
      )
      .reduce(
        (total, item) =>
          total +
          item.hand.length,
        0,
      );

  const lockedOwnMeldCount =
    state.melds.filter(
      (meld) =>
        meld.ownerTeam ===
          ownTeam &&
        meld.locked,
    ).length;

  const lockedOpponentMeldCount =
    state.melds.filter(
      (meld) =>
        meld.ownerTeam ===
          enemyTeam &&
        meld.locked,
    ).length;

  const availableOpponentSetCount =
    state.melds.filter(
      (meld) =>
        meld.ownerTeam ===
          enemyTeam &&
        meld.type === 'set' &&
        !meld.locked,
    ).length;

  const availableOpponentRunCount =
    state.melds.filter(
      (meld) =>
        meld.ownerTeam ===
          enemyTeam &&
        meld.type === 'run' &&
        !meld.locked,
    ).length;

  const scoreDifference =
    (
      ownMeldPoints +
      ownScoringCardPoints
    ) -
    (
      opponentMeldPoints +
      opponentScoringCardPoints
    );

  return {
    stage:
      determineStage(state),

    openedPlayerCount:
      openedPlayers.length,

    openedOpponentCount:
      openedOpponents.length,

    openedTeammateCount:
      openedTeammates.length,

    discardCount:
      state.discard.length,

    deckCount:
      state.deck.length,

    ownHandCount:
      player.hand.length,

    ownHandPenalty:
      handPenalty(
        player.hand,
      ),

    ownMeldPoints,

    ownScoringCardPoints,

    opponentMeldPoints,

    opponentScoringCardPoints,

    smallestOpponentHand,

    largestOpponentHand,

    hasFirstOpeningOpportunity:
      openedPlayers.length === 0,

    opponentMayFinishSoon:
      smallestOpponentHand <= 4,

    currentOpeningPoints,

    currentOpeningCardCount,

    cardsRemainingAfterOpening:
      Math.max(
        0,
        player.hand.length -
          currentOpeningCardCount,
      ),

    ownOpened:
      player.hasOpened,

    teammateOpened:
      openedTeammates.length > 0,

    allOpponentsOpened:
      openedOpponents.length ===
      opponents.length,

    visibleOpponentHandTotal,

    ownTeamHandTotal,

    discardPenaltyTotal:
      discardPenaltyTotal(state),

    lockedOwnMeldCount,

    lockedOpponentMeldCount,

    availableOpponentSetCount,

    availableOpponentRunCount,

    scoreDifference,
  };
}