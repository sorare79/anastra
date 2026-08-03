// Anastra AI - Ortak tip tanımları

import type {
  Card,
  GameState,
  Meld,
} from '../types';

/*
 * AI'nın ana stratejileri.
 *
 * tempo:
 * İlk açan olmaya çalışır.
 *
 * patlama:
 * İlk açma avantajı kaybolduğunda bekleyip
 * tek turda çok kart açmayı hedefler.
 *
 * tuzak:
 * Rakibin elini büyütmesine izin verip
 * uygun anda biterek rakibi yüksek cezayla bırakır.
 */
export type AIStrategy =
  | 'tempo'
  | 'patlama'
  | 'tuzak';

/*
 * Oyunun genel aşaması.
 */
export type AIGameStage =
  | 'early'
  | 'mid'
  | 'late';

/*
 * AI'nın oyuncular için tahmin ettiği oyun tarzı.
 * Öğrenme sistemi eklenene kadar çoğunlukla
 * unknown kullanılacaktır.
 */
export type AIPlayerStyle =
  | 'unknown'
  | 'fast'
  | 'aggressive'
  | 'greedy'
  | 'safe'
  | 'trap';

/*
 * AI'nın uygulayabileceği temel hamle türleri.
 */
export type AIActionType =
  | 'draw-deck'
  | 'draw-discard'
  | 'open-hand'
  | 'wait-to-open'
  | 'create-meld'
  | 'layoff-own'
  | 'close-opponent-set'
  | 'replace-opponent-run'
  | 'discard'
  | 'finish-turn';

/*
 * AI'nın planlayabileceği üst seviye hedefler.
 *
 * Goal Planner doğrudan kart seçmez.
 * Önce bu hedefleri üretir ve önceliklendirir.
 */
export type AIGoalType =
  | 'open-now'
  | 'wait-open'
  | 'take-discard'
  | 'draw-deck'
  | 'create-meld'
  | 'layoff-own'
  | 'close-opponent-set'
  | 'capture-run-card'
  | 'protect-high-cards'
  | 'reduce-hand'
  | 'discard-low-card'
  | 'finish-round';

/*
 * AI'nın karar nedenleri.
 *
 * Bunlar geliştirici ekranında ve log sisteminde
 * AI'nın neden o hamleyi seçtiğini açıklamak için
 * kullanılacaktır.
 */
export type AIDecisionReason =
  | 'first-opening-advantage'
  | 'tempo-advantage-lost'
  | 'stronger-future-opening'
  | 'immediate-score-gain'
  | 'future-meld-potential'
  | 'opponent-penalty-pressure'
  | 'required-discard-card'
  | 'close-opponent-set'
  | 'capture-opponent-run-card'
  | 'protect-high-card'
  | 'protect-meld-potential'
  | 'discard-low-value-card'
  | 'late-game-penalty-control'
  | 'discard-pile-opportunity'
  | 'discard-pile-too-risky'
  | 'reduce-hand-size'
  | 'finish-round-opportunity'
  | 'no-better-action';

/*
 * Strateji seçiminde hesaplanan ana puanlar.
 */
export interface AIStrategyScores {
  tempo: number;
  patlama: number;
  tuzak: number;
}

/*
 * Bir hamlenin veya planın ayrıntılı değerlendirmesi.
 *
 * Pozitif alanlar hamleyi güçlendirir.
 * Risk alanları toplamdan düşülür.
 */
export interface AIEvaluationScore {
  immediateScore: number;

  openingValue: number;

  futureMeldValue: number;

  tempoValue: number;

  explosionValue: number;

  trapValue: number;

  opponentDamage: number;

  discardPileValue: number;

  handReductionValue: number;

  penaltyRisk: number;

  discardRisk: number;

  total: number;
}

/*
 * Goal Planner tarafından üretilen tek bir hedef.
 */
export interface AIGoal {
  type: AIGoalType;

  /*
   * Küçük sayı daha yüksek önceliktir.
   * Örneğin priority: 1 en önemli hedeftir.
   */
  priority: number;

  /*
   * Hedefin stratejik değeri.
   */
  score: number;

  reasons: AIDecisionReason[];

  /*
   * Hedef belirli kartlarla ilgiliyse kullanılabilir.
   */
  cardIds?: string[];

  /*
   * Hedef belirli bir perle ilgiliyse kullanılabilir.
   */
  meldId?: string;

  /*
   * Yerden alma hedefinde seçilecek başlangıç indeksi.
   */
  discardIndex?: number;

  /*
   * Hedef motor üzerinde denenmişse oluşan durum.
   */
  resultingState?: GameState;
}

/*
 * Bir hamle adayının değerlendirme kaydı.
 */
export interface AIActionCandidate {
  type: AIActionType;

  score: AIEvaluationScore;

  reasons: AIDecisionReason[];

  cardIds?: string[];

  meldId?: string;

  discardIndex?: number;

  resultingState?: GameState;
}

/*
 * AI'nın bir tur için oluşturduğu ana plan.
 */
export interface AITurnPlan {
  seat: number;

  strategy: AIStrategy;

  stage: AIGameStage;

  confidence: number;

  strategyScores: AIStrategyScores;

  /*
   * Goal Planner'ın ürettiği sıralı hedefler.
   */
  goals?: AIGoal[];

  /*
   * Evaluator tarafından seçilen son hedef.
   */
  selectedGoal?: AIGoal;

  /*
   * Evaluator tarafından seçilen son hamle.
   */
  selectedAction?: AIActionCandidate;

  candidateActions: AIActionCandidate[];

  reasons: AIDecisionReason[];
}

/*
 * Masanın AI tarafından çıkarılan özeti.
 */
export interface AITableAnalysis {
  openedPlayerCount: number;

  openedOpponentCount: number;

  openedTeammateCount: number;

  discardCount: number;

  deckCount: number;

  ownHandCount: number;

  ownHandPenalty: number;

  ownMeldPoints: number;

  ownScoringCardPoints: number;

  opponentMeldPoints: number;

  opponentScoringCardPoints: number;

  smallestOpponentHand: number;

  largestOpponentHand: number;

  hasFirstOpeningOpportunity: boolean;

  opponentMayFinishSoon: boolean;
}

/*
 * Açılışın mevcut ve gelecekteki gücünü temsil eder.
 */
export interface AIOpeningAnalysis {
  canOpenNow: boolean;

  currentOpeningPoints: number;

  cardsUsedNow: number;

  cardsRemainingNow: number;

  futureOpeningPoints: number;

  futurePotentialGain: number;

  recommendedToOpen: boolean;

  reasons: AIDecisionReason[];

  melds: Card[][];
}

/*
 * Yerden kart alma seçeneğinin değerlendirmesi.
 */
export interface AIDiscardTakeAnalysis {
  startIndex: number;

  requiredCard: Card;

  cardsTaken: Card[];

  immediateScoreGain: number;

  futureMeldValue: number;

  extraCardRisk: number;

  penaltyRisk: number;

  total: number;

  usable: boolean;

  reasons: AIDecisionReason[];
}

/*
 * Bir pere işleme seçeneğinin değerlendirmesi.
 */
export interface AILayoffAnalysis {
  card: Card;

  meld: Meld;

  action:
    | 'layoff-own'
    | 'close-opponent-set'
    | 'replace-opponent-run';

  gainedCard?: Card;

  scoreGain: number;

  opponentDamage: number;

  total: number;

  resultingState?: GameState;

  reasons: AIDecisionReason[];
}

/*
 * AI'nın bir hedefi nasıl gerçekleştireceğine
 * dair planlanan yürütme bilgisi.
 */
export interface AIGoalExecution {
  goal: AIGoal;

  action?: AIActionCandidate;

  successful: boolean;

  resultingState?: GameState;

  message?: string;
}

/*
 * Geliştirici modunda gösterilecek açıklanabilir karar.
 */
export interface AIDecisionLog {
  turn: number;

  seat: number;

  strategy: AIStrategy;

  stage: AIGameStage;

  action: AIActionType;

  goal?: AIGoalType;

  confidence: number;

  reasons: AIDecisionReason[];

  evaluation: AIEvaluationScore;

  message: string;
}

/*
 * Öğrenen sistem için ileride kullanılacak deneyim kaydı.
 *
 * Şimdilik yalnızca veri modeli hazırlanmıştır.
 */
export interface AIExperience {
  stateKey: string;

  strategy: AIStrategy;

  goal?: AIGoalType;

  action: AIActionType;

  reward: number;

  visits: number;

  totalReward: number;

  createdAt: number;
}