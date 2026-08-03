// Anastra AI v2 - Ana karar yöneticisi
import type {
  Card,
  GameState,
} from './types';

import {
  selectBestMelds,
} from './meldFinder';

import {
  meldPoints,
} from './rules';

import {
  discardCard,
  drawFromDeck,
} from './engine';

import {
  chooseStrategy,
} from './ai/strategy';

import {
  createGoals,
} from './ai/goalPlanner';

import {
  generatePlanActions,
} from './ai/actionGenerator';

import {
  simulateActions,
} from './ai/simulator';

import {
  evaluateSimulations,
  selectBestEvaluatedAction,
} from './ai/evaluator';

import {
  analyzeTableState,
} from './ai/tableAnalyzer';

import type {
  AIActionCandidate,
  AIActionType,
  AITurnPlan,
} from './ai/types';

import type {
  EvaluatedAction,
} from './ai/evaluator';

export type AIStep =
  | { kind: 'draw'; state: GameState }
  | { kind: 'open'; state: GameState }
  | { kind: 'layoff'; state: GameState }
  | { kind: 'discard'; state: GameState }
  | { kind: 'done'; state: GameState };

const ACTION_TYPES = {
  drawDiscard: new Set<AIActionType>([
    'draw-discard',
  ]),

  open: new Set<AIActionType>([
    'open-hand',
  ]),

  tableAction: new Set<AIActionType>([
    'create-meld',
    'layoff-own',
    'close-opponent-set',
    'replace-opponent-run',
  ]),

  discard: new Set<AIActionType>([
    'discard',
  ]),
};

function getPlan(
  state: GameState,
  seat: number,
): AITurnPlan {
  const plan =
    chooseStrategy(
      state,
      seat,
    );

  return {
    ...plan,
    goals:
      createGoals(
        state,
        plan,
      ),
  };
}

function generateAllActions(
  state: GameState,
  plan: AITurnPlan,
): AIActionCandidate[] {
  const goalActions =
    generatePlanActions(
      state,
      plan,
    );

  const fallbackActions =
    generatePlanActions(
      state,
      {
        ...plan,
        goals: [],
      },
    );

  const unique =
    new Map<
      string,
      AIActionCandidate
    >();

  for (
    const action of [
      ...goalActions,
      ...fallbackActions,
    ]
  ) {
    const cardKey =
      [...(action.cardIds ?? [])]
        .sort()
        .join(',');

    const key = [
      action.type,
      cardKey,
      action.meldId ?? '',
      action.discardIndex ?? '',
    ].join('|');

    if (!unique.has(key)) {
      unique.set(
        key,
        action,
      );
    }
  }

  return [
    ...unique.values(),
  ];
}

function filterActions(
  actions: AIActionCandidate[],
  allowed:
    Set<AIActionType>,
): AIActionCandidate[] {
  return actions.filter(
    (action) =>
      allowed.has(
        action.type,
      ),
  );
}

function evaluateActions(
  state: GameState,
  seat: number,
  plan: AITurnPlan,
  actions: AIActionCandidate[],
): EvaluatedAction[] {
  const simulations =
    simulateActions(
      state,
      seat,
      actions,
    );

  return evaluateSimulations(
    state,
    seat,
    plan,
    simulations,
  );
}

function canSatisfyRequiredCard(
  state: GameState,
  seat: number,
): boolean {
  if (
    !state.requiredDiscardCardId
  ) {
    return true;
  }

  const plan =
    getPlan(
      state,
      seat,
    );

  const actions =
    filterActions(
      generateAllActions(
        state,
        plan,
      ),
      new Set<AIActionType>([
        'open-hand',
        'create-meld',
        'layoff-own',
        'close-opponent-set',
        'replace-opponent-run',
      ]),
    );

  const simulations =
    simulateActions(
      state,
      seat,
      actions,
    );

  return simulations.some(
    (simulation) =>
      simulation.success &&
      simulation.stateAfter
        .requiredDiscardCardId ===
        null,
  );
}

function chooseDiscardDraw(
  state: GameState,
  seat: number,
  plan: AITurnPlan,
): EvaluatedAction | null {
  const discardActions =
    filterActions(
      generateAllActions(
        state,
        plan,
      ),
      ACTION_TYPES.drawDiscard,
    );

  const evaluated =
    evaluateActions(
      state,
      seat,
      plan,
      discardActions,
    );

  for (
    const candidate of evaluated
  ) {
    if (
      !canSatisfyRequiredCard(
        candidate.simulation
          .stateAfter,
        seat,
      )
    ) {
      continue;
    }

    if (
      candidate.evaluation
        .total >= 4
    ) {
      return candidate;
    }
  }

  return null;
}

function shouldOpenNow(
  state: GameState,
  seat: number,
  plan: AITurnPlan,
): boolean {
  const analysis =
    analyzeTableState(
      state,
      seat,
    );

  if (
    analysis.currentOpeningPoints <
      state.openThreshold ||
    analysis.cardsRemainingAfterOpening <
      1
  ) {
    return false;
  }

  if (
    plan.strategy ===
    'tempo'
  ) {
    return true;
  }

  if (
    analysis.opponentMayFinishSoon
  ) {
    return true;
  }

  if (
    plan.strategy ===
    'patlama'
  ) {
    return (
      analysis
        .cardsRemainingAfterOpening <=
        4 ||
      analysis
        .currentOpeningPoints >=
        75
    );
  }

  return (
    analysis
      .cardsRemainingAfterOpening <=
      3 ||
    analysis
      .currentOpeningPoints >=
      85
  );
}

function chooseBestAction(
  state: GameState,
  seat: number,
  plan: AITurnPlan,
  allowed:
    Set<AIActionType>,
): EvaluatedAction | null {
  const actions =
    filterActions(
      generateAllActions(
        state,
        plan,
      ),
      allowed,
    );

  const evaluated =
    evaluateActions(
      state,
      seat,
      plan,
      actions,
    );

  return (
    selectBestEvaluatedAction(
      evaluated,
    )
  );
}

function chooseRequiredCardAction(
  state: GameState,
  seat: number,
  plan: AITurnPlan,
): EvaluatedAction | null {
  if (
    !state.requiredDiscardCardId
  ) {
    return null;
  }

  const actions =
    filterActions(
      generateAllActions(
        state,
        plan,
      ),
      new Set<AIActionType>([
        'open-hand',
        'create-meld',
        'layoff-own',
        'close-opponent-set',
        'replace-opponent-run',
      ]),
    );

  const evaluated =
    evaluateActions(
      state,
      seat,
      plan,
      actions,
    ).filter(
      (item) =>
        item.simulation
          .stateAfter
          .requiredDiscardCardId ===
        null,
    );

  return (
    selectBestEvaluatedAction(
      evaluated,
    )
  );
}

function fallbackDiscard(
  state: GameState,
  seat: number,
): GameState {
  const player =
    state.players.find(
      (item) =>
        item.seat === seat,
    );

  if (
    !player ||
    player.hand.length === 0 ||
    state.requiredDiscardCardId
  ) {
    return state;
  }

  const ordered = [
    ...player.hand,
  ].sort(
    (first, second) =>
      first.points -
      second.points,
  );

  for (
    const card of ordered
  ) {
    const result =
      discardCard(
        state,
        seat,
        card.id,
      );

    if (result.ok) {
      return result.state;
    }
  }

  return state;
}

export function* playAITurn(
  initial: GameState,
): Generator<
  AIStep,
  void,
  unknown
> {
  let state =
    initial;

  const seat =
    state.currentSeat;

  if (
    state.phase === 'draw'
  ) {
    const plan =
      getPlan(
        state,
        seat,
      );

    const discardChoice =
      chooseDiscardDraw(
        state,
        seat,
        plan,
      );

    if (discardChoice) {
      state =
        discardChoice.simulation
          .stateAfter;
    } else {
      state =
        drawFromDeck(
          state,
        );
    }

    yield {
      kind: 'draw',
      state,
    };

    if (
      state.phase ===
        'roundOver' ||
      state.phase ===
        'gameOver'
    ) {
      yield {
        kind: 'done',
        state,
      };

      return;
    }
  }

  if (
    state.requiredDiscardCardId
  ) {
    const plan =
      getPlan(
        state,
        seat,
      );

    const requiredAction =
      chooseRequiredCardAction(
        state,
        seat,
        plan,
      );

    if (requiredAction) {
      const wasOpened =
        state.players.find(
          (item) =>
            item.seat === seat,
        )?.hasOpened ?? false;

      state =
        requiredAction.simulation
          .stateAfter;

      const isOpened =
        state.players.find(
          (item) =>
            item.seat === seat,
        )?.hasOpened ?? false;

      yield {
        kind:
          !wasOpened &&
          isOpened
            ? 'open'
            : 'layoff',

        state,
      };
    }
  }

  const currentPlayer =
    state.players.find(
      (item) =>
        item.seat === seat,
    );

  if (
    currentPlayer &&
    !currentPlayer.hasOpened &&
    !state.requiredDiscardCardId
  ) {
    const plan =
      getPlan(
        state,
        seat,
      );

    if (
      shouldOpenNow(
        state,
        seat,
        plan,
      )
    ) {
      const opening =
        chooseBestAction(
          state,
          seat,
          plan,
          ACTION_TYPES.open,
        );

      if (opening) {
        state =
          opening.simulation
            .stateAfter;

        yield {
          kind: 'open',
          state,
        };
      }
    }
  }

  for (
    let actionCount = 0;
    actionCount < 30;
    actionCount += 1
  ) {
    const player =
      state.players.find(
        (item) =>
          item.seat === seat,
      );

    if (
      !player ||
      !player.hasOpened ||
      player.hand.length <= 1 ||
      state.phase !== 'action'
    ) {
      break;
    }

    const plan =
      getPlan(
        state,
        seat,
      );

    const action =
      state.requiredDiscardCardId
        ? chooseRequiredCardAction(
            state,
            seat,
            plan,
          )
        : chooseBestAction(
            state,
            seat,
            plan,
            ACTION_TYPES.tableAction,
          );

    if (
      !action ||
      action.evaluation.total <= 0
    ) {
      break;
    }

    state =
      action.simulation
        .stateAfter;

    yield {
      kind: 'layoff',
      state,
    };
  }

  if (
    state.phase === 'action'
  ) {
    const plan =
      getPlan(
        state,
        seat,
      );

    const discard =
      chooseBestAction(
        state,
        seat,
        plan,
        ACTION_TYPES.discard,
      );

    if (discard) {
      state =
        discard.simulation
          .stateAfter;
    } else {
      state =
        fallbackDiscard(
          state,
          seat,
        );
    }

    yield {
      kind: 'discard',
      state,
    };
  }

  yield {
    kind: 'done',
    state,
  };
}

export function suggestMelds(
  hand: Card[],
): {
  melds: Card[][];
  total: number;
} {
  const melds =
    selectBestMelds(
      hand,
    );

  const total =
    melds.reduce(
      (sum, meld) =>
        sum +
        meldPoints(meld),
      0,
    );

  return {
    melds,
    total,
  };
}