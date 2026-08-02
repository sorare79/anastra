// Anastra - Per (meld) doğrulama ve puanlama kuralları
import type { Card, Meld, MeldType } from './types';
import { rankToPenalty } from './deck';

// Bir per içindeki kartların toplam puanı
export function meldPoints(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + c.points, 0);
}

// Aynı değerde grup (set) mi? En az 3 kart, aynı rank, farklı türler
export function isValidSet(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  const rank = cards[0].rank;
  if (!cards.every((c) => c.rank === rank)) return false;
  // Türler farklı olmalı (2 deste olduğu için aynı tür tekrar edemez)
  const suits = new Set(cards.map((c) => c.suit));
  return suits.size === cards.length;
}

// Sıralı diziliş (run) mı? En az 3 kart, aynı tür, ardışık
// As hem düşük (A-2-3) hem yüksek (Q-K-A) olabilir, ama sarma olmaz
export function isValidRun(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  const suit = cards[0].suit;
  if (!cards.every((c) => c.suit === suit)) return false;

  // Değerleri al
  const values = cards.map((c) => c.rankValue).sort((a, b) => a - b);

  // Tekrar eden değer olmamalı
  for (let i = 1; i < values.length; i++) {
    if (values[i] === values[i - 1]) return false;
  }

  // Normal ardışıklık kontrolü (A=14 yüksek)
  const isConsecutive = (vals: number[]): boolean => {
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] !== vals[i - 1] + 1) return false;
    }
    return true;
  };

  if (isConsecutive(values)) return true;

  // As düşük varyant: A(14) -> 1 dönüştür, tekrar dene
  if (values.includes(14)) {
    const low = cards
      .map((c) => (c.rankValue === 14 ? 1 : c.rankValue))
      .sort((a, b) => a - b);
    for (let i = 1; i < low.length; i++) {
      if (low[i] === low[i - 1]) return false;
    }
    if (isConsecutive(low)) return true;
  }

  return false;
}

// Kartlar geçerli bir per mi (set ya da run)?
export function getMeldType(cards: Card[]): MeldType | null {
  if (isValidSet(cards)) return 'set';
  if (isValidRun(cards)) return 'run';
  return null;
}

export function isValidMeld(cards: Card[]): boolean {
  return getMeldType(cards) !== null;
}

// Run için kartları doğru sıraya diz (görüntüleme amaçlı)
export function sortRun(cards: Card[]): Card[] {
  const sorted = [...cards].sort((a, b) => a.rankValue - b.rankValue);
  // As düşük varyant gerekiyorsa (A-2-3) As'ı başa al
  const values = sorted.map((c) => c.rankValue);
  if (values.includes(14) && values.includes(2) && !values.includes(13)) {
    const ace = sorted.find((c) => c.rankValue === 14)!;
    const rest = sorted.filter((c) => c.rankValue !== 14);
    return [ace, ...rest];
  }
  return sorted;
}

// Bir kart mevcut bir pere eklenebilir mi (işleme / lay-off)?
export function canAppendToMeld(meld: Meld, card: Card): boolean {
  if (meld.locked) return false;
  if (meld.type === 'set') {
    // Aynı rank, henüz kullanılmayan bir tür
    if (card.rank !== meld.cards[0].rank) return false;
    const suits = new Set(meld.cards.map((c) => c.suit));
    return !suits.has(card.suit);
  } else {
    // Run: başa ya da sona eklenebilir, geçerli kalmalı
    return (
      isValidRun([...meld.cards, card]) ||
      isValidRun([card, ...meld.cards])
    );
  }
}

// El açma barajını sağlayan per setinin toplam puanını hesapla
export function totalMeldsPoints(melds: Card[][]): number {
  return melds.reduce((sum, m) => sum + meldPoints(m), 0);
}

// Elde kalan kartların ceza puanı
export function handPenalty(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + rankToPenalty(c.rank), 0);
}
