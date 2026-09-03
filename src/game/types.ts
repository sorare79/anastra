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

  /*
   * Peri açan oyuncunun koltuğu.
   *
   * Skor defterinde puanı
   * doğru oyuncunun sütununa
   * yazabilmek için kullanılır.
   */
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
 * Oyun sonunda sahibine
 * puan kazandırır.
 */
export interface ScoringCard {
  id: string;

  card: Card;

  ownerTeam: number;

  /*
   * Kartı kazanan oyuncu.
   *
   * Skor defterinde alınan puanı
   * oyuncu bazında göstermek için
   * kullanılır.
   */
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

/*
 * ==================================================
 * SKOR DEFTERİ
 * ==================================================
 *
 * Her el/tur bittiğinde skor defterine
 * bir kayıt eklenir.
 *
 * Sütun sırası:
 *
 * 0 = Sen
 * 1 = Eda
 * 2 = Ege
 * 3 = Duru
 *
 * Takımlar:
 *
 * Takım 1 = seat 0 + seat 2
 * Takım 2 = seat 1 + seat 3
 *
 * Not:
 * Arayüz oyuncuları takım sırasına göre
 * istediğimiz sütunlara yerleştirebilir.
 */
export interface RoundScoreRecord {
  /*
   * Kaçıncı el/tur olduğu.
   */
  roundNumber: number;

  /*
   * Her oyuncunun o turda
   * kazandığı pozitif puan.
   *
   * Örnek:
   * [70, 60, 80, 0]
   */
  playerPoints: [
    number,
    number,
    number,
    number,
  ];

  /*
   * Her oyuncunun o tur sonunda
   * elinde kalan kartlardan gelen cezası.
   *
   * Burada değerler pozitif tutulur.
   *
   * Örnek:
   * 20 ceza = 20
   *
   * Defter arayüzünde kırmızı olarak
   * "20" şeklinde gösterilebilir.
   */
  playerPenalties: [
    number,
    number,
    number,
    number,
  ];

  /*
   * O turun net takım puanları.
   *
   * Formül:
   *
   * takım oyuncularının aldığı puanlar
   * -
   * takım oyuncularının cezaları
   */
  teamRoundScores: [
    number,
    number,
  ];

  /*
   * Bu tur tamamlandıktan sonraki
   * genel takım toplamları.
   *
   * Skor defterinin en altında
   * gösterilecek değerler.
   */
  teamTotals: [
    number,
    number,
  ];
}

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

  /*
   * Bu elde 51 barajını geçerek
   * elini ilk açan oyuncunun koltuğu.
   *
   * Henüz kimse açmadıysa null.
   * Yeni elde tekrar null olur.
   */
  firstOpenedSeat: number | null;

  /*
   * Eli bitiren oyuncunun koltuğu.
   *
   * Oyuncu son kartını atarak
   * eli bitirdiğinde set edilir.
   *
   * Deste bittiği için el sona ererse
   * null kalır.
   */
  roundFinisherSeat: number | null;

  currentSeat: number;

  dealerSeat: number;

  phase: Phase;

  /*
   * Her zaman 51.
   */
  openThreshold: number;

  /*
   * Oyunun genel takım skorları.
   */
  teamScores: [
    number,
    number,
  ];

  /*
   * Sadece mevcut / son elin
   * net takım puanları.
   */
  roundScores: [
    number,
    number,
  ];

  /*
   * Skor defterinde geçmiş elleri
   * alt alta göstermek için tutulur.
   *
   * Her el bittiğinde buraya
   * bir RoundScoreRecord eklenir.
   */
  scoreHistory: RoundScoreRecord[];

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
  requiredDiscardCardId:
    string | null;

  /*
   * Yerden birlikte alınan
   * tüm kartlar.
   */
  takenDiscardCardIds:
    string[];

  winnerTeam:
    number | null;
}
