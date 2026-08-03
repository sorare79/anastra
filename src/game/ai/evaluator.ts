// Anastra AI - Simülasyon sonuçlarını puanlama katmanı

import type {
  Card,
  GameState,
  Player,
} from '../types';

import {
  findMelds,
} from '../meldFinder';

import {
  rankToPenalty,
} from '../deck';

import {
  baseDiscardUtility,
  evaluateUtility,
  extraDiscardCardsRisk,
  highCardProtectionValue,
} from './utility';

import type {
  AIActionCandidate,
  AIEvaluationScore,
  AITurnPlan,
} from './types';

import type {
  AISimulationResult,
} from './simulator';

/*
 * Evaluator hamle uygulamaz.
 *
 * Simulator'ın oluşturduğu sonuçları inceler,
 * her hamleye Utility puanı verir ve en iyi hamleyi seçer.
 */

export interface EvaluatedAction {
  action: AIActionCandidate;

  simulation: AISimulationResult;

  evaluation: AIEvaluationScore;
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
      'Hamle değerlendirmesi için oyuncu bulunamadı.',
    );
  }

  return player;
}

/*
 * Bir elin gelecekteki per potansiyelini ölçer.
 *
 * Tam perler yüksek değer alır.
 * Yakın kartlar sonraki sürümlerde ayrıca
 * daha ayrıntılı değerlendirilecektir.
 */
function futureMeldValue(
  hand: Card[],
): number {
  const melds =
    findMelds(hand);

  return melds.reduce(
    (total, meld) =>
      total +
      meld.reduce(
        (sum, card) =>
          sum +
          card.points,
        0,
      ) +
      meld.length * 4,
    0,
  );
}

function cardFromAction(
  state: GameState,
  seat: number,
  action: AIActionCandidate,
): Card | null {
  const cardId =
    action.cardIds?.[0];

  if (!cardId) {
    return null;
  }

  const player =
    getPlayer(state, seat);

  return (
    player.hand.find(
      (card) =>
        card.id === cardId,
    ) ??
    null
  );
}

/*
 * Yerden alınan fazladan kartları bulur.
 */
function extraTakenCards(
  simulation: AISimulationResult,
): Card[] {
  if (
    simulation.action.type !==
      'draw-discard' ||
    simulation.action.discardIndex ===
      undefined
  ) {
    return [];
  }

  const taken =
    simulation.stateBefore.discard.slice(
      simulation.action.discardIndex,
    );

  return taken.slice(1);
}

function evaluateDrawDeck(
  state: GameState,
  seat: number,
  plan: AITurnPlan,
  simulation: AISimulationResult,
): AIEvaluationScore {
  const beforePlayer =
    getPlayer(state, seat);

  const afterPlayer =
    getPlayer(
      simulation.stateAfter,
      seat,
    );

  const futureBefore =
    futureMeldValue(
      beforePlayer.hand,
    );

  const futureAfter =
    futureMeldValue(
      afterPlayer.hand,
    );

  return evaluateUtility(
    {
      state,
      player: beforePlayer,
      strategy:
        plan.strategy,
    },
    {
      futureMeldValue:
        Math.max(
          0,
          futureAfter -
            futureBefore,
        ),

      penaltyRisk:
        Math.max(
          0,
          simulation.metrics.handPenaltyAfter -
            simulation.metrics.handPenaltyBefore,
        ),

      handReductionValue: 0,

      discardPileValue: 0,
    },
  );
}

function evaluateDrawDiscard(
  state: GameState,
  seat: number,
  plan: AITurnPlan,
  simulation: AISimulationResult,
): AIEvaluationScore {
  const beforePlayer =
    getPlayer(state, seat);

  const afterPlayer =
    getPlayer(
      simulation.stateAfter,
      seat,
    );

  const futureBefore =
    futureMeldValue(
      beforePlayer.hand,
    );

  const futureAfter =
    futureMeldValue(
      afterPlayer.hand,
    );

  const extras =
    extraTakenCards(
      simulation,
    );

  const pileRisk =
    extraDiscardCardsRisk(
      state,
      extras,
    );

  /*
   * Anastra'nın temelinde puan üretmek olduğu için
   * yerden kart alma fırsatı güçlü biçimde ödüllendirilir.
   */
  const discardPileValue =
    simulation.metrics.cardsTakenFromDiscard *
      5 +
    Math.max(
      0,
      futureAfter -
        futureBefore,
    );

  return evaluateUtility(
    {
      state,
      player: beforePlayer,
      strategy:
        plan.strategy,
    },
    {
      immediateScore:
        simulation.metrics.scoringPointGain,

      futureMeldValue:
        Math.max(
          0,
          futureAfter -
            futureBefore,
        ),

      discardPileValue,

      penaltyRisk:
        pileRisk,

      handReductionValue:
        simulation.metrics.handReduction,
    },
  );
}

function evaluateOpenOrCreateMeld(
  state: GameState,
  seat: number,
  plan: AITurnPlan,
  simulation: AISimulationResult,
): AIEvaluationScore {
  const beforePlayer =
    getPlayer(state, seat);

  const afterPlayer =
    getPlayer(
      simulation.stateAfter,
      seat,
    );

  const firstOpening =
    !beforePlayer.hasOpened &&
    afterPlayer.hasOpened;

  let openingValue =
    simulation.metrics.meldPointGain;

  if (
    firstOpening &&
    plan.strategy === 'tempo'
  ) {
    openingValue += 35;
  }

  if (
    firstOpening &&
    plan.strategy === 'patlama'
  ) {
    openingValue +=
      simulation.metrics.handReduction *
      7;
  }

  return evaluateUtility(
    {
      state,
      player: beforePlayer,
      strategy:
        plan.strategy,
    },
    {
      immediateScore:
        simulation.metrics.meldPointGain,

      openingValue,

      handReductionValue:
        simulation.metrics.handReduction *
        5,

      penaltyRisk:
        Math.max(
          0,
          simulation.metrics.handPenaltyAfter,
        ),

      futureMeldValue:
        futureMeldValue(
          afterPlayer.hand,
        ),
    },
  );
}

function evaluateLayoff(
  state: GameState,
  seat: number,
  plan: AITurnPlan,
  simulation: AISimulationResult,
): AIEvaluationScore {
  const player =
    getPlayer(state, seat);

  let opponentDamage =
    simulation.metrics.opponentMeldPointLoss;

  if (
    simulation.action.type ===
    'close-opponent-set'
  ) {
    opponentDamage +=
      simulation.metrics.newlyLockedOpponentMelds *
      40;
  }

  if (
    simulation.action.type ===
    'replace-opponent-run'
  ) {
    opponentDamage +=
      simulation.metrics.scoringPointGain;
  }

  return evaluateUtility(
    {
      state,
      player,
      strategy:
        plan.strategy,
    },
    {
      immediateScore:
        simulation.metrics.meldPointGain +
        simulation.metrics.scoringPointGain,

      opponentDamage,

      handReductionValue:
        simulation.metrics.handReduction *
        4,

      penaltyRisk:
        Math.max(
          0,
          simulation.metrics.handPenaltyAfter,
        ),
    },
  );
}

function evaluateDiscard(
  state: GameState,
  seat: number,
  plan: AITurnPlan,
  simulation: AISimulationResult,
): AIEvaluationScore {
  const player =
    getPlayer(state, seat);

  const card =
    cardFromAction(
      state,
      seat,
      simulation.action,
    );

  if (!card) {
    return evaluateUtility(
      {
        state,
        player,
        strategy:
          plan.strategy,
      },
      {
        discardRisk: 100,
      },
    );
  }

  const basicValue =
    baseDiscardUtility(
      state,
      player,
      card,
    );

  const protection =
    highCardProtectionValue(
      player,
      card,
    );

  const futureBefore =
    futureMeldValue(
      player.hand,
    );

  const afterPlayer =
    getPlayer(
      simulation.stateAfter,
      seat,
    );

  const futureAfter =
    futureMeldValue(
      afterPlayer.hand,
    );

  const futureLoss =
    Math.max(
      0,
      futureBefore -
        futureAfter,
    );

  /*
   * Oyuncu açılmadıysa küçük kartları atma teşvik edilir.
   * Büyük kartlar 51 açılışını kolaylaştırdığı için korunur.
   */
  let discardValue =
    basicValue;

  if (!player.hasOpened) {
    discardValue +=
      Math.max(
        0,
        8 -
          card.points,
      ) *
      4;

    discardValue -=
      protection;
  } else {
    /*
     * Açıldıktan sonra yüksek ve bağlantısız ceza
     * kartlarından kurtulmak daha değerlidir.
     */
    discardValue +=
      rankToPenalty(
        card.rank,
      ) *
      1.5;
  }

  if (
    plan.strategy === 'patlama' &&
    !player.hasOpened
  ) {
    /*
     * Patlama stratejisinde güçlü kartları ve per
     * bağlantılarını korumak daha da önemlidir.
     */
    discardValue -=
      protection * 0.6;

    discardValue -=
      futureLoss * 1.2;
  }

  return evaluateUtility(
    {
      state,
      player,
      strategy:
        plan.strategy,
    },
    {
      immediateScore:
        discardValue,

      handReductionValue: 3,

      penaltyRisk:
        simulation.metrics.handPenaltyAfter,

      discardRisk:
        futureLoss,
    },
  );
}

/*
 * Tek başarılı simülasyonu puanlar.
 */
export function evaluateSimulation(
  state: GameState,
  seat: number,
  plan: AITurnPlan,
  simulation: AISimulationResult,
): EvaluatedAction | null {
  if (!simulation.success) {
    return null;
  }

  let evaluation:
    AIEvaluationScore;

  switch (
    simulation.action.type
  ) {
    case 'draw-deck':
      evaluation =
        evaluateDrawDeck(
          state,
          seat,
          plan,
          simulation,
        );

      break;

    case 'draw-discard':
      evaluation =
        evaluateDrawDiscard(
          state,
          seat,
          plan,
          simulation,
        );

      break;

    case 'open-hand':
    case 'create-meld':
      evaluation =
        evaluateOpenOrCreateMeld(
          state,
          seat,
          plan,
          simulation,
        );

      break;

    case 'layoff-own':
    case 'close-opponent-set':
    case 'replace-opponent-run':
      evaluation =
        evaluateLayoff(
          state,
          seat,
          plan,
          simulation,
        );

      break;

    case 'discard':
      evaluation =
        evaluateDiscard(
          state,
          seat,
          plan,
          simulation,
        );

      break;

    case 'wait-to-open':
    case 'finish-turn':
      return null;
  }

  return {
    action: {
      ...simulation.action,

      score:
        evaluation,

      resultingState:
        simulation.stateAfter,
    },

    simulation,

    evaluation,
  };
}

/*
 * Bütün başarılı simülasyonları puanlar.
 */
export function evaluateSimulations(
  state: GameState,
  seat: number,
  plan: AITurnPlan,
  simulations: AISimulationResult[],
): EvaluatedAction[] {
  const evaluated:
    EvaluatedAction[] = [];

  for (
    const simulation of simulations
  ) {
    const result =
      evaluateSimulation(
        state,
        seat,
        plan,
        simulation,
      );

    if (result) {
      evaluated.push(result);
    }
  }

  return evaluated.sort(
    (first, second) =>
      second.evaluation.total -
      first.evaluation.total,
  );
}

/*
 * En yüksek Utility değerine sahip hamleyi döndürür.
 */
export function selectBestEvaluatedAction(
  evaluated: EvaluatedAction[],
): EvaluatedAction | null {
  if (
    evaluated.length === 0
  ) {
    return null;
  }

  return evaluated[0];
}