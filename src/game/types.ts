// Anastra - Ortak tip tanımları

export type Suit =
  | 'hearts'
  | 'diamonds'
  | 'clubs'
  | 'spades';

export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export interface Card {
  id: string;

  suit: Suit;

  rank: Rank;

  /*
   * Seri sıralaması için
   *
   * A = 14
   * K = 13
   * ...
   * 2 = 2
   *
   * A-2-3 özel durumu rules.ts içinde kontrol edilir.
   */
  rankValue: number;

  /*
   * Normal kart puanı
   *
   * A = 11
   * K,Q,J = 10
   * Sayılar kendi değeri
   */
  points: number;
}

export type MeldType =
  | 'set'
  | 'run';

export interface Meld {
  id: string;

  type: MeldType;

  cards: Card[];

  /*
   * Bu peri açan takım.
   *
   * Per kapansa bile
   * puan bu takıma yazılır.
   */
  ownerTeam: number;

  ownerSeat: number;

  /*
   * Rakip işlediğinde
   * true olur.
   *
   * locked perlere
   * tekrar işlenemez.
   */
  locked: boolean;
}

/*
 * Rakip perine işlediğimiz
 * kart burada tutulur.
 *
 * Bu kart artık elde değildir.
 * Hiçbir perde değildir.
 * Sadece oyun sonunda
 * sahibine puan kazandırır.
 */
export interface ScoringCard {
  id: string;

  card: Card;

  ownerTeam: number;

  ownerSeat: number;

  /*
   * Hangi per kapatılırken
   * kazanıldı.
   */
  sourceMeldId: string;

  /*
   * Görsel amaçlı.
   * Her zaman true olacak.
   */
  faceDown: boolean;
}

export interface Player {
  seat: number;

  team: number;

  name: string;

  isHuman: boolean;

  hand: Card[];

  hasOpened: boolean;
}

export type Phase =
  | 'draw'
  | 'action'
  | 'roundOver'
  | 'gameOver';

export interface GameState {
  players: Player[];

  deck: Card[];

  discard: Card[];

  /*
   * Masadaki açık perler.
   */
  melds: Meld[];

  /*
   * Rakip perlerine işlenen
   * ve bize puan yazacak
   * kapalı kartlar.
   */
  scoringCards: ScoringCard[];

  currentSeat: number;

  dealerSeat: number;

  phase: Phase;

  /*
   * Her zaman 51.
   */
  openThreshold: number;

  teamScores: [number, number];

  roundScores: [number, number];

  targetScore: number;

  roundNumber: number;

  log: string[];

  drawnThisTurn: boolean;

  tookFromDiscard: boolean;

  lastDrawnCardId: string | null;

  /*
   * Yerden alınan ve
   * aynı tur kullanılmak
   * zorunda olan ilk kart.
   */
  requiredDiscardCardId: string | null;

  /*
   * Yerden birlikte alınan
   * tüm kartlar.
   */
  takenDiscardCardIds: string[];

  winnerTeam: number | null;
}