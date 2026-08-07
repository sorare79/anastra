// Anastra - Oyun geçmişi ve öğrenme kayıt tipleri

import type {
  Card,
  MeldType,
} from '../types';

/*
 * Oyun sırasında kaydedilebilecek temel hareketler.
 */
export type GameActionType =
  | 'round-start'
  | 'draw-deck'
  | 'draw-discard'
  | 'open-hand'
  | 'create-meld'
  | 'layoff-own'
  | 'close-opponent-set'
  | 'replace-opponent-run'
  | 'discard'
  | 'round-end';

/*
 * Bir oyuncunun yaptığı tek bir hamlenin kaydı.
 */
export interface GameActionRecord {
  id: string;

  roundNumber: number;

  turnNumber: number;

  seat: number;

  team: number;

  playerName: string;

  action: GameActionType;

  createdAt: number;

  /*
   * Hamlede kullanılan veya etkilenen kartlar.
   */
  cardIds: string[];

  cards: Card[];

  /*
   * İlgili per varsa kullanılır.
   */
  meldId?: string;

  meldType?: MeldType;

  /*
   * Yerden alma bilgileri.
   */
  discardStartIndex?: number;

  cardsTakenCount?: number;

  /*
   * Açılış ve puan bilgileri.
   */
  pointsGained?: number;

  openingPoints?: number;

  /*
   * Hamle sonrası oyuncunun eli.
   */
  handCountBefore: number;

  handCountAfter: number;

  handPenaltyBefore: number;

  handPenaltyAfter: number;

  /*
   * Hamlenin özel sonuçları.
   */
  requiredCardUsed?: boolean;

  opponentMeldLocked?: boolean;

  roundEnded?: boolean;

  /*
   * Daha sonra AI analizi için kullanılacak
   * serbest ek bilgiler.
   */
  metadata?: Record<
    string,
    string | number | boolean | null
  >;
}

/*
 * Tek bir elin başından sonuna kadar kaydı.
 */
export interface RoundRecord {
  id: string;

  roundNumber: number;

  dealerSeat: number;

  startingSeat: number;

  startedAt: number;

  endedAt?: number;

  actions: GameActionRecord[];

  winnerSeat?: number;

  winnerTeam?: number;

  endReason?: 'finished' | 'deck';

  roundScores?: [number, number];

  teamScoresAfter?: [number, number];
}

/*
 * Bütün oyunun kaydı.
 */
export interface GameRecord {
  id: string;

  startedAt: number;

  endedAt?: number;

  targetScore: number;

  rounds: RoundRecord[];

  winnerTeam?: number;

  finalTeamScores?: [number, number];

  version: number;
}

/*
 * Daha sonra insan oyuncuları analiz etmek için
 * kullanılacak temel profil özeti.
 */
export interface PlayerLearningProfile {
  playerKey: string;

  gamesPlayed: number;

  gamesWon: number;

  roundsPlayed: number;

  totalActions: number;

  earlyDiscards: Record<
    string,
    number
  >;

  strategyObservations: {
    opensEarly: number;

    waitsForLargeOpening: number;

    takesManyDiscardCards: number;

    protectsHighCards: number;

    closesOpponentMelds: number;
  };

  updatedAt: number;
}