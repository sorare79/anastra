// Anastra AI - Strateji seçimi

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
  AIStrategy,
  AIStrategyScores,
  AITableAnalysis,
  AITurnPlan,
  AIDecisionReason,
} from './types';

/*
 * Oyunun hangi aşamada olduğunu belirler.
 *
 * early:
 * Henüz kimse açmamış veya oyun yeni başlamış.
 *
 * mid:
 * En az bir oyuncu açmış, fakat oyun sonuna
 * henüz yaklaşılmamış.
 *
 * late:
 * Deste azalmış veya bir oyuncunun eli çok küçülmüş.
 */
export function determineGameStage(
  state: GameState,
): AIGameStage {
  const openedCount =
    state.players.filter(
      (player) => player.hasOpened,
    ).length;

  const smallestHand =
    Math.min(
      ...state.players.map(
        (player) => player.hand.length,
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

/*
 * Bir takımın masadaki toplam per puanı.
 */
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

/*
 * Bir takımın kapalı puan kartlarının toplamı.
 */
function teamScoringCardPoints(
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

/*
 * AI açısından masanın özetini çıkarır.
 */
export function analyzeTable(
  state: GameState,
  seat: number,
): AITableAnalysis {
  const player =
    state.players.find(
      (item) =>
        item.seat === seat,
    );

  if (!player) {
    throw new Error(
      'Strateji analizi için oyuncu bulunamadı.',
    );
  }

  const ownTeam =
    player.team;

  const opponents =
    state.players.filter(
      (item) =>
        item.team !== ownTeam,
    );

  const teammatePlayers =
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
    teammatePlayers.filter(
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

  return {
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

    ownMeldPoints:
      teamMeldPoints(
        state,
        ownTeam,
      ),

    ownScoringCardPoints:
      teamScoringCardPoints(
        state,
        ownTeam,
      ),

    opponentMeldPoints:
      teamMeldPoints(
        state,
        ownTeam === 0
          ? 1
          : 0,
      ),

    opponentScoringCardPoints:
      teamScoringCardPoints(
        state,
        ownTeam === 0
          ? 1
          : 0,
      ),

    smallestOpponentHand,

    largestOpponentHand,

    hasFirstOpeningOpportunity:
      openedPlayers.length === 0,

    opponentMayFinishSoon:
      smallestOpponentHand <= 4,
  };
}

/*
 * AI şu anda kaç puanla açabilir?
 */
function currentOpeningPoints(
  player: Player,
): number {
  const melds =
    selectBestMelds(
      player.hand,
    );

  return melds.reduce(
    (total, meld) =>
      total +
      meldPoints(meld),
    0,
  );
}

/*
 * TEMPO stratejisi:
 *
 * İlk açan olmanın ve yerden kart alma hakkını
 * kazanmanın değerini hesaplar.
 */
function scoreTempo(
  state: GameState,
  player: Player,
  table: AITableAnalysis,
  stage: AIGameStage,
): number {
  let score = 0;

  const openingPoints =
    currentOpeningPoints(
      player,
    );

  if (
    table.hasFirstOpeningOpportunity
  ) {
    score += 45;
  } else {
    score -= 25;
  }

  if (
    openingPoints >=
      state.openThreshold
  ) {
    score += 35;

    /*
     * 51'e yakın bir açılış bile ilk açan olma
     * avantajı nedeniyle değerlidir.
     */
    score += Math.min(
      openingPoints -
        state.openThreshold,
      20,
    );
  } else {
    const missing =
      state.openThreshold -
      openingPoints;

    /*
     * Açılışa çok yakınsa tempo hâlâ değerlidir.
     */
    score += Math.max(
      0,
      24 - missing,
    );
  }

  if (stage === 'early') {
    score += 20;
  }

  if (stage === 'late') {
    score -= 20;
  }

  if (
    table.discardCount >= 4
  ) {
    /*
     * Yerde kart birikiyorsa ilk açan olmanın
     * getirisi yükselir.
     */
    score += Math.min(
      table.discardCount * 2,
      16,
    );
  }

  if (
    table.opponentMayFinishSoon
  ) {
    score += 18;
  }

  return score;
}

/*
 * PATLAMA stratejisi:
 *
 * İlk açma avantajı kaybolduğunda bekleyip tek turda
 * çok kart açmanın değerini hesaplar.
 */
function scorePatlama(
  state: GameState,
  player: Player,
  table: AITableAnalysis,
  stage: AIGameStage,
): number {
  let score = 0;

  const bestMelds =
    selectBestMelds(
      player.hand,
    );

  const openingPoints =
    bestMelds.reduce(
      (total, meld) =>
        total +
        meldPoints(meld),
      0,
    );

  const cardsUsed =
    bestMelds.reduce(
      (total, meld) =>
        total +
        meld.length,
      0,
    );

  const cardsRemaining =
    player.hand.length -
    cardsUsed;

  if (
    table.openedPlayerCount > 0
  ) {
    score += 30;
  }

  if (
    table.openedOpponentCount > 0
  ) {
    score += 18;
  }

  /*
   * İlk açma avantajı kalmadıysa bekleme stratejisi
   * daha anlamlı hâle gelir.
   */
  if (
    !table.hasFirstOpeningOpportunity
  ) {
    score += 22;
  }

  if (
    openingPoints >=
      state.openThreshold
  ) {
    score +=
      openingPoints * 0.45;

    /*
     * Açtıktan sonra el çok küçülüyorsa patlama
     * güçlüdür.
     */
    if (cardsRemaining <= 4) {
      score += 32;
    } else if (
      cardsRemaining <= 7
    ) {
      score += 18;
    }
  }

  /*
   * Elde çok kart olması, ileride bir anda çok kart
   * açma potansiyeli oluşturabilir.
   */
  if (
    player.hand.length >= 13
  ) {
    score += 14;
  }

  if (
    table.largestOpponentHand >= 12
  ) {
    /*
     * Rakibin eli büyüdüyse onu cezaya bırakma
     * ihtimali yükselir.
     */
    score += 20;
  }

  if (stage === 'mid') {
    score += 15;
  }

  if (stage === 'late') {
    score -= 22;
  }

  if (
    table.opponentMayFinishSoon
  ) {
    score -= 35;
  }

  return score;
}

/*
 * TUZAK stratejisi:
 *
 * Rakibin elini büyütmesine izin verip uygun anda
 * oyunu bitirerek onu yüksek cezayla bırakmayı hedefler.
 */
function scoreTuzak(
  player: Player,
  table: AITableAnalysis,
  stage: AIGameStage,
): number {
  let score = 0;

  if (
    table.openedOpponentCount === 0
  ) {
    score -= 30;
  }

  if (
    table.largestOpponentHand >= 14
  ) {
    score += 35;
  } else if (
    table.largestOpponentHand >= 11
  ) {
    score += 18;
  }

  /*
   * Kendi eli küçükse rakibi cezaya bırakmak daha
   * güvenli bir stratejidir.
   */
  if (
    player.hand.length <= 6
  ) {
    score += 30;
  } else if (
    player.hand.length <= 9
  ) {
    score += 14;
  }

  /*
   * Rakip masada çok puan toplamış ama eli hâlâ
   * büyükse tuzak için iyi bir adaydır.
   */
  if (
    table.opponentMeldPoints >= 60 &&
    table.largestOpponentHand >= 10
  ) {
    score += 20;
  }

  if (stage === 'mid') {
    score += 10;
  }

  if (stage === 'late') {
    score += 12;
  }

  if (
    table.opponentMayFinishSoon
  ) {
    /*
     * Rakip bitmeye çok yakınsa tuzak kurmak yerine
     * hızlanmak gerekir.
     */
    score -= 45;
  }

  return score;
}

function selectStrategy(
  scores: AIStrategyScores,
): AIStrategy {
  const entries: Array<
    [AIStrategy, number]
  > = [
    ['tempo', scores.tempo],
    ['patlama', scores.patlama],
    ['tuzak', scores.tuzak],
  ];

  entries.sort(
    (first, second) =>
      second[1] -
      first[1],
  );

  return entries[0][0];
}

function strategyConfidence(
  scores: AIStrategyScores,
): number {
  const values = [
    scores.tempo,
    scores.patlama,
    scores.tuzak,
  ].sort(
    (first, second) =>
      second - first,
  );

  const difference =
    values[0] -
    values[1];

  /*
   * En iyi iki strateji arasındaki fark arttıkça
   * güven yükselir.
   */
  return Math.max(
    45,
    Math.min(
      95,
      55 + difference,
    ),
  );
}

function strategyReasons(
  strategy: AIStrategy,
  table: AITableAnalysis,
): AIDecisionReason[] {
  const reasons:
    AIDecisionReason[] = [];

  if (strategy === 'tempo') {
    if (
      table.hasFirstOpeningOpportunity
    ) {
      reasons.push(
        'first-opening-advantage',
      );
    }

    if (
      table.discardCount > 0
    ) {
      reasons.push(
        'discard-pile-opportunity',
      );
    }
  }

  if (strategy === 'patlama') {
    reasons.push(
      'tempo-advantage-lost',
      'stronger-future-opening',
    );

    if (
      table.largestOpponentHand >= 11
    ) {
      reasons.push(
        'opponent-penalty-pressure',
      );
    }
  }

  if (strategy === 'tuzak') {
    reasons.push(
      'opponent-penalty-pressure',
    );
  }

  return reasons;
}

/*
 * AI'nın bu turdaki ana stratejisini seçer.
 */
export function chooseStrategy(
  state: GameState,
  seat: number,
): AITurnPlan {
  const player =
    state.players.find(
      (item) =>
        item.seat === seat,
    );

  if (!player) {
    throw new Error(
      'Strateji seçimi için oyuncu bulunamadı.',
    );
  }

  const stage =
    determineGameStage(
      state,
    );

  const table =
    analyzeTable(
      state,
      seat,
    );

  const strategyScores:
    AIStrategyScores = {
      tempo:
        scoreTempo(
          state,
          player,
          table,
          stage,
        ),

      patlama:
        scorePatlama(
          state,
          player,
          table,
          stage,
        ),

      tuzak:
        scoreTuzak(
          player,
          table,
          stage,
        ),
    };

  const strategy =
    selectStrategy(
      strategyScores,
    );

  return {
    seat,
    strategy,
    stage,

    confidence:
      strategyConfidence(
        strategyScores,
      ),

    strategyScores,

    candidateActions: [],

    reasons:
      strategyReasons(
        strategy,
        table,
      ),
  };
}