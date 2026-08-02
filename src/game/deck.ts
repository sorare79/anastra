// Anastra - Deste oluşturma ve karıştırma
import type { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export const RANKS: Rank[] = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
];

// Kart değeri (sıralama): 2..10 kendi değeri, J=11, Q=12, K=13, A=14
export function rankToValue(rank: Rank): number {
  switch (rank) {
    case 'J': return 11;
    case 'Q': return 12;
    case 'K': return 13;
    case 'A': return 14;
    default: return parseInt(rank, 10);
  }
}

// Puan değeri: sayılar kendi değeri, J/Q/K = 10, A = 11
export function rankToPoints(rank: Rank): number {
  switch (rank) {
    case 'J':
    case 'Q':
    case 'K':
      return 10;
    case 'A':
      return 11;
    default:
      return parseInt(rank, 10);
  }
}

// Ceza puanı: A = 15, diğerleri normal puanı
export function rankToPenalty(rank: Rank): number {
  if (rank === 'A') return 15;
  return rankToPoints(rank);
}

// 2 deste = 104 kart oluştur (jokersiz)
export function createDoubleDeck(): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < 2; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${suit}-${rank}-${d}`,
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

// Fisher-Yates karıştırma
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Kart sembolü ve rengi
export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
}

export function suitName(suit: Suit): string {
  switch (suit) {
    case 'hearts': return 'Kupa';
    case 'diamonds': return 'Karo';
    case 'clubs': return 'Sinek';
    case 'spades': return 'Maça';
  }
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}
