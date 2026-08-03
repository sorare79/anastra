// Anastra AI - Utility değerlendirme motoru

import type {
  Card,
  GameState,
  Player,
} from '../types';

import {
  rankToPenalty,
} from '../deck';

import type {
  AIEvaluationScore,
  AIStrategy,
} from './types';

/*
 * ANASTRA AI FELSEFESİ
 *
 * Temel amaç yalnızca ceza azaltmak değildir.
 * Öncelik mümkün olduğunca yüksek puan üretmektir.
 *
 * Erken oyunda:
 * - büyük kartlar korunur,
 * - küçük ve bağlantısız kartlar atılır,
 * - ilk açılma avantajı önemlidir.
 *
 * Orta oyunda:
 * - puan üretme,
 * - yerden kart alma,
 * - yeni per ve işleme fırsatları öne çıkar.
 *
 * Geç oyunda:
 * - ceza riski daha fazla ağırlık kazanır.
 */

export interface UtilityContext {
  state: GameState;
  player: Player;
  strategy: AIStrategy;
}

export interface UtilityInput {
  immediateScore?: number;
  openingValue?: number;
  futureMeldValue?: number;
  opponentDamage?: number;
  discardPileValue?: number;
  handReductionValue?: number;
  penaltyRisk?: number;
  discardRisk?: number;
}

export function emptyEvaluation(): AIEvaluationScore {
  return {
    immediateScore: 0,
    openingValue: 0,
    futureMeldValue: 0,
    tempoValue: 0,
    explosionValue: 0,
    trapValue: 0,
    opponentDamage: 0,
    discardPileValue: 0,
    handReductionValue: 0,
    penaltyRisk: 0,
    discardRisk: 0,
    total: 0,
  };
}

export function determinePenaltyWeight(
  state: GameState,
): number {
  const smallestHand = Math.min(
    ...state.players.map(
      (player) => player.hand.length,
    ),
  );

  if (
    state.deck.length <= 18 ||
    smallestHand <= 4
  ) {
    return 1.1;
  }

  if (
    state.players.some(
      (player) => player.hasOpened,
    )
  ) {
    return 0.45;
  }

  return 0.18;
}

export function strategyWeights(
  strategy: AIStrategy,
): {
  tempo: number;
  explosion: number;
  trap: number;
} {
  switch (strategy) {
    case 'tempo':
      return {
        tempo: 1.4,
        explosion: 0.7,
        trap: 0.4,
      };

    case 'patlama':
      return {
        tempo: 0.5,
        explosion: 1.5,
        trap: 0.8,
      };

    case 'tuzak':
      return {
        tempo: 0.4,
        explosion: 0.9,
        trap: 1.5,
      };
  }
}

export function evaluateUtility(
  context: UtilityContext,
  input: UtilityInput,
): AIEvaluationScore {
  const evaluation =
    emptyEvaluation();

  evaluation.immediateScore =
    input.immediateScore ?? 0;

  evaluation.openingValue =
    input.openingValue ?? 0;

  evaluation.futureMeldValue =
    input.futureMeldValue ?? 0;

  evaluation.opponentDamage =
    input.opponentDamage ?? 0;

  evaluation.discardPileValue =
    input.discardPileValue ?? 0;

  evaluation.handReductionValue =
    input.handReductionValue ?? 0;

  evaluation.penaltyRisk =
    input.penaltyRisk ?? 0;

  evaluation.discardRisk =
    input.discardRisk ?? 0;

  const weights =
    strategyWeights(
      context.strategy,
    );

  evaluation.tempoValue =
    evaluation.openingValue *
    weights.tempo;

  evaluation.explosionValue =
    (
      evaluation.futureMeldValue +
      evaluation.handReductionValue
    ) *
    weights.explosion;

  evaluation.trapValue =
    evaluation.opponentDamage *
    weights.trap;

  const penaltyWeight =
    determinePenaltyWeight(
      context.state,
    );

  evaluation.total =
    evaluation.immediateScore * 1.35 +
    evaluation.openingValue +
    evaluation.futureMeldValue * 1.15 +
    evaluation.tempoValue +
    evaluation.explosionValue +
    evaluation.trapValue +
    evaluation.opponentDamage * 1.25 +
    evaluation.discardPileValue * 1.2 +
    evaluation.handReductionValue * 0.8 -
    evaluation.penaltyRisk *
      penaltyWeight -
    evaluation.discardRisk;

  return evaluation;
}

/*
 * Kartın erken oyunda korunma değerini hesaplar.
 *
 * Büyük kartlar 51 açılışını kolaylaştırdığı için
 * oyuncu henüz açılmadıysa güçlü biçimde korunur.
 */
export function highCardProtectionValue(
  player: Player,
  card: Card,
): number {
  if (player.hasOpened) {
    return 0;
  }

  if (card.points >= 11) {
    return 28;
  }

  if (card.points >= 10) {
    return 22;
  }

  if (card.points >= 7) {
    return 8;
  }

  return 0;
}

/*
 * Kartın elde kalması durumundaki temel ceza riski.
 *
 * Bu değer tek başına atma kararı değildir.
 * Oyunun aşamasına göre ağırlığı evaluateUtility()
 * içinde değişir.
 */
export function cardPenaltyRisk(
  card: Card,
): number {
  return rankToPenalty(
    card.rank,
  );
}

/*
 * Yerden alınan fazladan kartların riskini hesaplar.
 *
 * AI puan odaklı olduğu için erken ve orta oyunda
 * bu risk düşük tutulur. Geç oyunda ağırlık artar.
 */
export function extraDiscardCardsRisk(
  state: GameState,
  cards: Card[],
): number {
  const totalPenalty =
    cards.reduce(
      (sum, card) =>
        sum +
        rankToPenalty(
          card.rank,
        ),
      0,
    );

  const penaltyWeight =
    determinePenaltyWeight(
      state,
    );

  return (
    totalPenalty *
      penaltyWeight *
      0.7 +
    cards.length * 1.25
  );
}

/*
 * Bir kartın atılma değerini hesaplamak için
 * başlangıç puanı üretir.
 *
 * Yüksek sonuç kartın atılmasını kolaylaştırır.
 * Negatif sonuç kartın korunması gerektiğini gösterir.
 */
export function baseDiscardUtility(
  state: GameState,
  player: Player,
  card: Card,
): number {
  const penalty =
    cardPenaltyRisk(
      card,
    );

  const protection =
    highCardProtectionValue(
      player,
      card,
    );

  const penaltyWeight =
    determinePenaltyWeight(
      state,
    );

  return (
    penalty *
      penaltyWeight -
    protection
  );
}

/*
 * Utility değerlerini karşılaştırmak için küçük yardımcı.
 */
export function betterEvaluation(
  first: AIEvaluationScore | null,
  second: AIEvaluationScore,
): boolean {
  return (
    first === null ||
    second.total >
      first.total
  );
}