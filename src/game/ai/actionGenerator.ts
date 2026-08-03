// Anastra AI - Olası hamle üreticisi

import type {
  Card,
  GameState,
  Meld,
  Player,
} from '../types';

import {
  findMelds,
  selectBestMelds,
} from '../meldFinder';

import {
  canLayOffToMeld,
} from '../engine';

import {
  meldPoints,
} from '../rules';

import {
  emptyEvaluation,
} from './utility';

import type {
  AIActionCandidate,
  AIActionType,
  AIGoal,
  AIGoalType,
  AITurnPlan,
} from './types';

/*
 * Action Generator yalnızca geçerli olabilecek hamle
 * adaylarını üretir.
 *
 * Hamleleri uygulamaz.
 * Hamlelerin iyi veya kötü olduğuna karar vermez.
 *
 * Uygulama Simulator'ın,
 * puanlama Utility/Evaluator'ın görevidir.
 */

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
      'Hamle üretmek için oyuncu bulunamadı.',
    );
  }

  return player;
}

function createCandidate(
  type: AIActionType,
  options?: {
    cardIds?: string[];
    meldId?: string;
    discardIndex?: number;
  },
): AIActionCandidate {
  return {
    type,

    score:
      emptyEvaluation(),

    reasons: [],

    cardIds:
      options?.cardIds,

    meldId:
      options?.meldId,

    discardIndex:
      options?.discardIndex,
  };
}

function containsSameCards(
  first: string[],
  second: string[],
): boolean {
  if (
    first.length !==
    second.length
  ) {
    return false;
  }

  const firstSet =
    new Set(first);

  return second.every(
    (id) =>
      firstSet.has(id),
  );
}

function removeDuplicateCandidates(
  candidates: AIActionCandidate[],
): AIActionCandidate[] {
  const unique:
    AIActionCandidate[] = [];

  for (
    const candidate of candidates
  ) {
    const duplicate =
      unique.some(
        (existing) =>
          existing.type ===
            candidate.type &&
          existing.meldId ===
            candidate.meldId &&
          existing.discardIndex ===
            candidate.discardIndex &&
          containsSameCards(
            existing.cardIds ?? [],
            candidate.cardIds ?? [],
          ),
      );

    if (!duplicate) {
      unique.push(candidate);
    }
  }

  return unique;
}

// --------------------------------------------------
// KART ÇEKME ADAYLARI
// --------------------------------------------------

function generateDrawDeckCandidate(
  state: GameState,
): AIActionCandidate[] {
  if (
    state.phase !== 'draw' ||
    state.deck.length === 0
  ) {
    return [];
  }

  return [
    createCandidate(
      'draw-deck',
    ),
  ];
}

function generateDiscardDrawCandidates(
  state: GameState,
  player: Player,
): AIActionCandidate[] {
  if (
    state.phase !== 'draw' ||
    state.discard.length === 0
  ) {
    return [];
  }

  /*
   * Elini açmamış oyuncu yalnızca rakibin son
   * attığı kartı alabilir.
   */
  if (!player.hasOpened) {
    return [
      createCandidate(
        'draw-discard',
        {
          discardIndex:
            state.discard.length -
            1,
        },
      ),
    ];
  }

  /*
   * Elini açmış oyuncu yerdeki bütün kartlardan
   * birini başlangıç noktası olarak seçebilir.
   *
   * Kullanılabilirlik Simulator ve Engine tarafından
   * kesin olarak doğrulanacaktır.
   */
  return state.discard.map(
    (_, index) =>
      createCandidate(
        'draw-discard',
        {
          discardIndex:
            index,
        },
      ),
  );
}

// --------------------------------------------------
// AÇILIŞ VE YENİ PER ADAYLARI
// --------------------------------------------------

function generateInitialOpenCandidates(
  state: GameState,
  player: Player,
): AIActionCandidate[] {
  if (
    player.hasOpened ||
    state.phase !== 'action'
  ) {
    return [];
  }

  const bestMelds =
    selectBestMelds(
      player.hand,
    );

  const bestTotal =
    bestMelds.reduce(
      (total, meld) =>
        total +
        meldPoints(meld),
      0,
    );

  if (
    bestMelds.length === 0 ||
    bestTotal <
      state.openThreshold
  ) {
    return [];
  }

  /*
   * openHand() birden fazla per grubunu string[][]
   * olarak bekler. AIActionCandidate içinde düz
   * cardIds bulunduğu için grupları ayıran özel bir
   * işaret kullanmıyoruz.
   *
   * Simulator ilk açılış adayında selectBestMelds()
   * sonucunu yeniden oluşturacaktır.
   */
  return [
    createCandidate(
      'open-hand',
      {
        cardIds:
          bestMelds.flatMap(
            (meld) =>
              meld.map(
                (card) =>
                  card.id,
              ),
          ),
      },
    ),
  ];
}

function generateNewMeldCandidates(
  state: GameState,
  player: Player,
): AIActionCandidate[] {
  if (
    !player.hasOpened ||
    state.phase !== 'action'
  ) {
    return [];
  }

  const melds =
    findMelds(
      player.hand,
    );

  const candidates =
    melds
      .filter(
        (meld) =>
          player.hand.length -
            meld.length >=
          1,
      )
      .map(
        (meld) =>
          createCandidate(
            'create-meld',
            {
              cardIds:
                meld.map(
                  (card) =>
                    card.id,
                ),
            },
          ),
      );

  return removeDuplicateCandidates(
    candidates,
  );
}

// --------------------------------------------------
// İŞLEME ADAYLARI
// --------------------------------------------------

function actionTypeForMeld(
  player: Player,
  meld: Meld,
): AIActionType {
  if (
    meld.ownerTeam ===
    player.team
  ) {
    return 'layoff-own';
  }

  if (
    meld.type === 'set'
  ) {
    return 'close-opponent-set';
  }

  return 'replace-opponent-run';
}

function generateLayoffCandidates(
  state: GameState,
  player: Player,
): AIActionCandidate[] {
  if (
    !player.hasOpened ||
    state.phase !== 'action'
  ) {
    return [];
  }

  const candidates:
    AIActionCandidate[] = [];

  for (
    const card of player.hand
  ) {
    /*
     * Tur sonunda kart atılabilmesi için normal
     * durumda son kartı işleme adayı üretmiyoruz.
     */
    if (
      player.hand.length <= 1
    ) {
      break;
    }

    for (
      const meld of state.melds
    ) {
      if (
        !canLayOffToMeld(
          state,
          player.seat,
          card,
          meld,
        )
      ) {
        continue;
      }

      candidates.push(
        createCandidate(
          actionTypeForMeld(
            player,
            meld,
          ),
          {
            cardIds: [
              card.id,
            ],

            meldId:
              meld.id,
          },
        ),
      );
    }
  }

  return candidates;
}

// --------------------------------------------------
// KART ATMA ADAYLARI
// --------------------------------------------------

function generateDiscardCandidates(
  state: GameState,
  player: Player,
): AIActionCandidate[] {
  if (
    state.phase !== 'action' ||
    !state.drawnThisTurn
  ) {
    return [];
  }

  /*
   * Yerden alınmış zorunlu kart kullanılmadan
   * kart atma adayları motor tarafından reddedilir.
   *
   * Gereksiz simülasyon oluşturmamak için burada
   * aday üretmiyoruz.
   */
  if (
    state.requiredDiscardCardId
  ) {
    return [];
  }

  return player.hand.map(
    (card) =>
      createCandidate(
        'discard',
        {
          cardIds: [
            card.id,
          ],
        },
      ),
  );
}

// --------------------------------------------------
// HEDEF → HAMLE DÖNÜŞÜMÜ
// --------------------------------------------------

function actionsForGoal(
  state: GameState,
  player: Player,
  goalType: AIGoalType,
): AIActionCandidate[] {
  switch (goalType) {
    case 'open-now':
      return generateInitialOpenCandidates(
        state,
        player,
      );

    case 'wait-open':
      /*
       * Beklemek doğrudan Engine hamlesi değildir.
       * AI bu hedefte kart çekme ve küçük kart atma
       * adaylarını değerlendirecektir.
       */
      return [
        ...generateDrawDeckCandidate(
          state,
        ),

        ...generateDiscardCandidates(
          state,
          player,
        ),
      ];

    case 'take-discard':
      return generateDiscardDrawCandidates(
        state,
        player,
      );

    case 'draw-deck':
      return generateDrawDeckCandidate(
        state,
      );

    case 'create-meld':
      return generateNewMeldCandidates(
        state,
        player,
      );

    case 'layoff-own':
      return generateLayoffCandidates(
        state,
        player,
      ).filter(
        (candidate) =>
          candidate.type ===
          'layoff-own',
      );

    case 'close-opponent-set':
      return generateLayoffCandidates(
        state,
        player,
      ).filter(
        (candidate) =>
          candidate.type ===
          'close-opponent-set',
      );

    case 'capture-run-card':
      return generateLayoffCandidates(
        state,
        player,
      ).filter(
        (candidate) =>
          candidate.type ===
          'replace-opponent-run',
      );

    case 'protect-high-cards':
      /*
       * Yüksek kartı koruma hedefi doğrudan bir hamle
       * değildir. Atılabilecek kart seçenekleri üretilir;
       * Utility yüksek kartları düşük puanlayacaktır.
       */
      return generateDiscardCandidates(
        state,
        player,
      );

    case 'reduce-hand':
      return [
        ...generateNewMeldCandidates(
          state,
          player,
        ),

        ...generateLayoffCandidates(
          state,
          player,
        ),
      ];

    case 'discard-low-card':
      return generateDiscardCandidates(
        state,
        player,
      );

    case 'finish-round':
      return [
        ...generateNewMeldCandidates(
          state,
          player,
        ),

        ...generateLayoffCandidates(
          state,
          player,
        ),

        ...generateDiscardCandidates(
          state,
          player,
        ),
      ];
  }
}

// --------------------------------------------------
// DIŞA AKTARILAN ANA FONKSİYONLAR
// --------------------------------------------------

export function generateActionsForGoal(
  state: GameState,
  seat: number,
  goal: AIGoal,
): AIActionCandidate[] {
  const player =
    getPlayer(
      state,
      seat,
    );

  const candidates =
    actionsForGoal(
      state,
      player,
      goal.type,
    );

  return removeDuplicateCandidates(
    candidates.map(
      (candidate) => ({
        ...candidate,

        reasons: [
          ...goal.reasons,
        ],
      }),
    ),
  );
}

/*
 * Bir tur planındaki bütün hedeflerden hamle adayları
 * üretir.
 */
export function generatePlanActions(
  state: GameState,
  plan: AITurnPlan,
): AIActionCandidate[] {
  const goals =
    plan.goals ?? [];

  const candidates =
    goals.flatMap(
      (goal) =>
        generateActionsForGoal(
          state,
          plan.seat,
          goal,
        ),
    );

  /*
   * Goal Planner henüz goals alanını plana eklememişse
   * güvenli varsayılan adaylar üret.
   */
  if (
    candidates.length === 0
  ) {
    const player =
      getPlayer(
        state,
        plan.seat,
      );

    return removeDuplicateCandidates([
      ...generateDrawDeckCandidate(
        state,
      ),

      ...generateDiscardDrawCandidates(
        state,
        player,
      ),

      ...generateInitialOpenCandidates(
        state,
        player,
      ),

      ...generateNewMeldCandidates(
        state,
        player,
      ),

      ...generateLayoffCandidates(
        state,
        player,
      ),

      ...generateDiscardCandidates(
        state,
        player,
      ),
    ]);
  }

  return removeDuplicateCandidates(
    candidates,
  );
}

/*
 * Simulator tarafından ilk açılış gruplarını tekrar
 * kurmak için kullanılır.
 */
export function getOpeningMeldCardIds(
  hand: Card[],
): string[][] {
  return selectBestMelds(
    hand,
  ).map(
    (meld) =>
      meld.map(
        (card) =>
          card.id,
      ),
  );
}