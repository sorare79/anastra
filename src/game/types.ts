// Anastra oyunu - Tip tanımları

// Kart türleri (suit)
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

// Kart değeri: 2-10, J, Q, K, A
export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A';

// Tek bir kart
export interface Card {
  id: string;        // benzersiz kimlik (2 deste olduğu için)
  suit: Suit;
  rank: Rank;
  rankValue: number; // sıralama için 2..14 (A=14)
  points: number;    // puan değeri (J/Q/K=10, A=11)
}

// Per (meld) türü
export type MeldType = 'run' | 'set';

// Masaya açılmış per
export interface Meld {
  id: string;
  type: MeldType;
  cards: Card[];
  ownerTeam: number;  // 0 veya 1
  ownerSeat: number;  // hangi oyuncu açtı
  locked: boolean;    // işlendi mi (kapandı mı)
}

// Oyuncu
export interface Player {
  seat: number;       // 0..3
  name: string;
  team: number;       // 0 veya 1
  isHuman: boolean;
  hand: Card[];
  hasOpened: boolean; // elini açtı mı (51 barajı)
}

// Oyun aşaması
export type Phase =
  | 'dealing'      // dağıtım
  | 'draw'         // aktif oyuncu kart çekmeli
  | 'action'       // per açma / işleme / atma
  | 'roundOver'    // el bitti
  | 'gameOver';    // oyun bitti (hedef sayıya ulaşıldı)

// Oyun durumu
export interface GameState {
  players: Player[];
  deck: Card[];
  discard: Card[];
  melds: Meld[];
  currentSeat: number;
  dealerSeat: number;
  phase: Phase;
  openThreshold: number;
  teamScores: [number, number];
  targetScore: number;
  roundScores: [number, number];
  log: string[];
  drawnThisTurn: boolean;
  tookFromDiscard: boolean;

  // Bu tur çekilen veya yerden alınması zorunlu kart
  lastDrawnCardId: string | null;

  // Yerden alınan grubun kullanılması zorunlu olan ilk kartı
  requiredDiscardCardId: string | null;

  // Yerden aynı anda alınan kartların kimlikleri
  takenDiscardCardIds: string[];

  winnerTeam: number | null;
  roundNumber: number;
}
