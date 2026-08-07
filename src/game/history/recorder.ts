// Anastra - Oyun geçmişi kayıt yardımcıları

import type {
  GameState,
  Player,
} from '../types';

import {
  handPenalty,
} from '../rules';

import type {
  GameActionRecord,
  GameActionType,
  GameRecord,
  RoundRecord,
} from './types';

let gameRecordCounter = 0;
let roundRecordCounter = 0;
let actionRecordCounter = 0;

function nextGameRecordId(): string {
  gameRecordCounter += 1;

  return (
    'game-record-' +
    gameRecordCounter +
    '-' +
    Date.now()
  );
}

function nextRoundRecordId(): string {
  roundRecordCounter += 1;

  return (
    'round-record-' +
    roundRecordCounter +
    '-' +
    Date.now()
  );
}

function nextActionRecordId(): string {
  actionRecordCounter += 1;

  return (
    'action-record-' +
    actionRecordCounter +
    '-' +
    Date.now()
  );
}

function getPlayer(
  state: GameState,
  seat: number,
): Player {
  const player =
    state.players.find(
      (item) =>
        item.seat === seat,
    );

  if (!player) {
    throw new Error(
      'Geçmiş kaydı için oyuncu bulunamadı.',
    );
  }

  return player;
}

export function createGameRecord(
  state: GameState,
): GameRecord {
  return {
    id:
      nextGameRecordId(),

    startedAt:
      Date.now(),

    targetScore:
      state.targetScore,

    rounds: [],

    version: 1,
  };
}

export function createRoundRecord(
  state: GameState,
): RoundRecord {
  return {
    id:
      nextRoundRecordId(),

    roundNumber:
      state.roundNumber,

    dealerSeat:
      state.dealerSeat,

    startingSeat:
      state.currentSeat,

    startedAt:
      Date.now(),

    actions: [],
  };
}

export interface CreateActionRecordOptions {
  stateBefore: GameState;

  stateAfter: GameState;

  seat: number;

  action: GameActionType;

  cardIds?: string[];

  meldId?: string;

  discardStartIndex?: number;

  cardsTakenCount?: number;

  pointsGained?: number;

  openingPoints?: number;

  requiredCardUsed?: boolean;

  opponentMeldLocked?: boolean;

  roundEnded?: boolean;

  metadata?: Record<
    string,
    string | number | boolean | null
  >;
}

/*
 * Gerçekleşen tek bir hamleyi yapılandırılmış
 * geçmiş kaydına dönüştürür.
 */
export function createActionRecord(
  options: CreateActionRecordOptions,
): GameActionRecord {
  const beforePlayer =
    getPlayer(
      options.stateBefore,
      options.seat,
    );

  const afterPlayer =
    getPlayer(
      options.stateAfter,
      options.seat,
    );

  const cardIds =
    options.cardIds ?? [];

  const cards =
    cardIds
      .map((cardId) => {
        const beforeCard =
          beforePlayer.hand.find(
            (card) =>
              card.id === cardId,
          );

        if (beforeCard) {
          return beforeCard;
        }

        const afterCard =
          afterPlayer.hand.find(
            (card) =>
              card.id === cardId,
          );

        if (afterCard) {
          return afterCard;
        }

        return (
          options.stateBefore.discard.find(
            (card) =>
              card.id === cardId,
          ) ??
          options.stateAfter.discard.find(
            (card) =>
              card.id === cardId,
          )
        );
      })
      .filter(
        (card) =>
          card !== undefined,
      );

  const meld =
    options.meldId
      ? (
          options.stateAfter.melds.find(
            (item) =>
              item.id ===
              options.meldId,
          ) ??
          options.stateBefore.melds.find(
            (item) =>
              item.id ===
              options.meldId,
          )
        )
      : undefined;

  return {
    id:
      nextActionRecordId(),

    roundNumber:
      options.stateAfter.roundNumber,

    turnNumber:
      0,

    seat:
      beforePlayer.seat,

    team:
      beforePlayer.team,

    playerName:
      beforePlayer.name,

    action:
      options.action,

    createdAt:
      Date.now(),

    cardIds,

    cards,

    meldId:
      options.meldId,

    meldType:
      meld?.type,

    discardStartIndex:
      options.discardStartIndex,

    cardsTakenCount:
      options.cardsTakenCount,

    pointsGained:
      options.pointsGained,

    openingPoints:
      options.openingPoints,

    handCountBefore:
      beforePlayer.hand.length,

    handCountAfter:
      afterPlayer.hand.length,

    handPenaltyBefore:
      handPenalty(
        beforePlayer.hand,
      ),

    handPenaltyAfter:
      handPenalty(
        afterPlayer.hand,
      ),

    requiredCardUsed:
      options.requiredCardUsed,

    opponentMeldLocked:
      options.opponentMeldLocked,

    roundEnded:
      options.roundEnded,

    metadata:
      options.metadata,
  };
}

/*
 * Hamleyi mevcut el kaydına ekler.
 *
 * turnNumber, mevcut action sayısına göre otomatik
 * olarak belirlenir.
 */
export function appendActionToRound(
  round: RoundRecord,
  action: GameActionRecord,
): RoundRecord {
  return {
    ...round,

    actions: [
      ...round.actions,
      {
        ...action,

        turnNumber:
          round.actions.length + 1,
      },
    ],
  };
}

/*
 * Yeni el kaydını oyun kaydına ekler.
 */
export function appendRoundToGame(
  game: GameRecord,
  round: RoundRecord,
): GameRecord {
  return {
    ...game,

    rounds: [
      ...game.rounds,
      round,
    ],
  };
}

/*
 * Bitmiş elin sonuçlarını kaydeder.
 */
export function finishRoundRecord(
  round: RoundRecord,
  state: GameState,
  options: {
    endReason:
      | 'finished'
      | 'deck';

    winnerSeat?: number;

    winnerTeam?: number;
  },
): RoundRecord {
  return {
    ...round,

    endedAt:
      Date.now(),

    endReason:
      options.endReason,

    winnerSeat:
      options.winnerSeat,

    winnerTeam:
      options.winnerTeam,

    roundScores: [
      ...state.roundScores,
    ] as [number, number],

    teamScoresAfter: [
      ...state.teamScores,
    ] as [number, number],
  };
}

/*
 * Tamamlanmış oyunun nihai sonucunu kaydeder.
 */
export function finishGameRecord(
  game: GameRecord,
  state: GameState,
): GameRecord {
  return {
    ...game,

    endedAt:
      Date.now(),

    winnerTeam:
      state.winnerTeam ??
      undefined,

    finalTeamScores: [
      ...state.teamScores,
    ] as [number, number],
  };
}