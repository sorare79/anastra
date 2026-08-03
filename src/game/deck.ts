// Anastra - Deste oluşturma, karıştırma ve kart değerleri
import type { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = [
  'hearts',
  'diamonds',
  'clubs',
  'spades',
];

export const RANKS: Rank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
];

/*
 * Kartın sıralama değeri.
 *
 * Seri kontrolünde:
 * 2 = 2
 * ...
 * K = 13
 * A = 14
 *
 * A-2-3 özel durumu rules.ts içinde ayrıca değerlendirilir.
 */
export function rankToValue(rank: Rank): number {
  switch (rank) {
    case 'J':
      return 11;

    case 'Q':
      return 12;

    case 'K':
      return 13;

    case 'A':
      return 14;

    default:
      return Number.parseInt(rank, 10);
  }
}

/*
 * Kartın normal puanı.
 *
 * Sayı kartları kendi değeri kadardır.
 * J, Q ve K = 10
 * A = 11
 *
 * Önemli:
 * A yalnızca A-2-3 serisinin puanı hesaplanırken 1 sayılır.
 * Kartın temel puanı her zaman 11 olarak kalır.
 */
export function rankToPoints(rank: Rank): number {
  switch (rank) {
    case 'J':
    case 'Q':
    case 'K':
      return 10;

    case 'A':
      return 11;

    default:
      return Number.parseInt(rank, 10);
  }
}

/*
 * Elde kalan kartların ceza puanı.
 *
 * Yeni kesin kural:
 * A = 11 ceza puanı.
 *
 * A elde tek başına kalıyorsa veya herhangi bir perin
 * dışında kalıyorsa hiçbir zaman 1 sayılmaz.
 */
export function rankToPenalty(rank: Rank): number {
  return rankToPoints(rank);
}

/*
 * İki standart deste oluşturur.
 *
 * 52 + 52 = 104 kart
 * Joker kullanılmaz.
 */
export function createDoubleDeck(): Card[] {
  const cards: Card[] = [];

  for (let deckIndex = 0; deckIndex < 2; deckIndex += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${suit}-${rank}-${deckIndex}`,
          suit,
          rank,
          rankValue: rankToValue(rank),
          points: rankToPoints(rank),
        });
      }
    }
  }

  return cards;
}

/*
 * Fisher-Yates karıştırma algoritması.
 *
 * Gönderilen diziyi değiştirmez;
 * yeni ve karıştırılmış bir dizi döndürür.
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1),
    );

    [
      result[index],
      result[randomIndex],
    ] = [
      result[randomIndex],
      result[index],
    ];
  }

  return result;
}

export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts':
      return '♥';

    case 'diamonds':
      return '♦';

    case 'clubs':
      return '♣';

    case 'spades':
      return '♠';
  }
}

export function suitName(suit: Suit): string {
  switch (suit) {
    case 'hearts':
      return 'Kupa';

    case 'diamonds':
      return 'Karo';

    case 'clubs':
      return 'Sinek';

    case 'spades':
      return 'Maça';
  }
}

export function isRedSuit(suit: Suit): boolean {
  return (
    suit === 'hearts' ||
    suit === 'diamonds'
  );
}