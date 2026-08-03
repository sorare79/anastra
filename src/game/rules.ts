// Anastra - Per doğrulama, sıralama ve puanlama kuralları
import type {
  Card,
  Meld,
  MeldType,
} from './types';
import { rankToPenalty } from './deck';

/*
 * Kart grubu tam olarak A-2-3 serisi mi?
 *
 * Aynı suit olmalıdır.
 * Tam olarak üç karttan oluşmalıdır.
 * Rank değerleri A, 2 ve 3 olmalıdır.
 */
export function isAceLowThreeRun(
  cards: Card[],
): boolean {
  if (cards.length !== 3) {
    return false;
  }

  const suit = cards[0].suit;

  if (
    !cards.every(
      (card) => card.suit === suit,
    )
  ) {
    return false;
  }

  const ranks = new Set(
    cards.map((card) => card.rank),
  );

  return (
    ranks.size === 3 &&
    ranks.has('A') &&
    ranks.has('2') &&
    ranks.has('3')
  );
}

/*
 * Bir perin toplam puanı.
 *
 * Normal durumda kartların points değerleri kullanılır:
 * A = 11
 * K, Q, J = 10
 *
 * Tek özel durum:
 * A-2-3 serisinde A = 1 sayılır.
 *
 * A-2-3:
 * 1 + 2 + 3 = 6
 *
 * Q-K-A:
 * 10 + 10 + 11 = 31
 */
export function meldPoints(cards: Card[]): number {
  if (isAceLowThreeRun(cards)) {
    return cards.reduce(
      (total, card) => {
        if (card.rank === 'A') {
          return total + 1;
        }

        return total + card.points;
      },
      0,
    );
  }

  return cards.reduce(
    (total, card) =>
      total + card.points,
    0,
  );
}

/*
 * Aynı değerdeki kartlardan oluşan grup.
 *
 * Kurallar:
 * - En az 3 kart olmalı.
 * - Rank değerleri aynı olmalı.
 * - Suit değerleri farklı olmalı.
 *
 * İki deste bulunduğu için aynı rank ve aynı suit
 * kartından iki tane olabilir; fakat ikisi aynı set
 * içinde birlikte kullanılamaz.
 */
export function isValidSet(
  cards: Card[],
): boolean {
  if (cards.length < 3) {
    return false;
  }

  const rank = cards[0].rank;

  if (
    !cards.every(
      (card) => card.rank === rank,
    )
  ) {
    return false;
  }

  const suits = new Set(
    cards.map((card) => card.suit),
  );

  return suits.size === cards.length;
}

/*
 * Aynı suit içinde ardışık seri.
 *
 * A iki şekilde kullanılabilir:
 *
 * Düşük:
 * A-2-3
 *
 * Yüksek:
 * Q-K-A
 *
 * Sarma yapılamaz:
 * K-A-2 geçersizdir.
 */
export function isValidRun(
  cards: Card[],
): boolean {
  if (cards.length < 3) {
    return false;
  }

  const suit = cards[0].suit;

  if (
    !cards.every(
      (card) => card.suit === suit,
    )
  ) {
    return false;
  }

  const normalValues = cards
    .map((card) => card.rankValue)
    .sort((a, b) => a - b);

  /*
   * Aynı rank değerinden iki tane seri içinde
   * birlikte kullanılamaz.
   */
  for (
    let index = 1;
    index < normalValues.length;
    index += 1
  ) {
    if (
      normalValues[index] ===
      normalValues[index - 1]
    ) {
      return false;
    }
  }

  const isConsecutive = (
    values: number[],
  ): boolean => {
    for (
      let index = 1;
      index < values.length;
      index += 1
    ) {
      if (
        values[index] !==
        values[index - 1] + 1
      ) {
        return false;
      }
    }

    return true;
  };

  /*
   * Normal sıra:
   * 2-3-4
   * 10-J-Q
   * Q-K-A
   */
  if (isConsecutive(normalValues)) {
    return true;
  }

  /*
   * A düşük kullanılıyorsa 14 yerine 1 kabul edilir.
   *
   * Bu kontrol A-2-3 serisini geçerli yapar.
   * Ayrıca uzun düşük As serilerini destekler:
   * A-2-3-4
   *
   * Puan özel kuralı ise yalnızca tam A-2-3
   * grubunda uygulanmaktadır.
   */
  if (normalValues.includes(14)) {
    const lowAceValues = cards
      .map((card) =>
        card.rank === 'A'
          ? 1
          : card.rankValue,
      )
      .sort((a, b) => a - b);

    for (
      let index = 1;
      index < lowAceValues.length;
      index += 1
    ) {
      if (
        lowAceValues[index] ===
        lowAceValues[index - 1]
      ) {
        return false;
      }
    }

    return isConsecutive(
      lowAceValues,
    );
  }

  return false;
}

export function getMeldType(
  cards: Card[],
): MeldType | null {
  if (isValidSet(cards)) {
    return 'set';
  }

  if (isValidRun(cards)) {
    return 'run';
  }

  return null;
}

export function isValidMeld(
  cards: Card[],
): boolean {
  return getMeldType(cards) !== null;
}

/*
 * Seriyi ekranda doğru sıraya dizer.
 *
 * A düşük kullanılıyorsa:
 * A-2-3
 *
 * A yüksek kullanılıyorsa:
 * Q-K-A
 */
export function sortRun(
  cards: Card[],
): Card[] {
  const sorted = [...cards].sort(
    (a, b) =>
      a.rankValue - b.rankValue,
  );

  const hasAce = sorted.some(
    (card) => card.rank === 'A',
  );

  const hasTwo = sorted.some(
    (card) => card.rank === '2',
  );

  const hasKing = sorted.some(
    (card) => card.rank === 'K',
  );

  /*
   * A ile 2 bulunuyor, fakat K bulunmuyorsa
   * As düşük kabul edilir ve başa alınır.
   */
  if (
    hasAce &&
    hasTwo &&
    !hasKing
  ) {
    const ace = sorted.find(
      (card) => card.rank === 'A',
    );

    if (!ace) {
      return sorted;
    }

    const otherCards = sorted.filter(
      (card) => card.id !== ace.id,
    );

    return [
      ace,
      ...otherCards,
    ];
  }

  return sorted;
}

/*
 * Kart mevcut bir pere eklenebilir mi?
 */
export function canAppendToMeld(
  meld: Meld,
  card: Card,
): boolean {
  if (meld.locked) {
    return false;
  }

  if (meld.type === 'set') {
    if (
      card.rank !==
      meld.cards[0].rank
    ) {
      return false;
    }

    const suits = new Set(
      meld.cards.map(
        (meldCard) =>
          meldCard.suit,
      ),
    );

    return !suits.has(card.suit);
  }

  /*
   * Seri için yeni kart eklendiğinde bütün seri
   * yeniden doğrulanır.
   */
  return isValidRun([
    ...meld.cards,
    card,
  ]);
}

/*
 * Birden fazla perin toplam açılış puanı.
 *
 * Her per meldPoints() üzerinden hesaplandığı için
 * A-2-3 özel puanı otomatik uygulanır.
 */
export function totalMeldsPoints(
  melds: Card[][],
): number {
  return melds.reduce(
    (total, meld) =>
      total + meldPoints(meld),
    0,
  );
}

/*
 * Elde kalan kartların ceza puanı.
 *
 * A elde kaldığında 11 puandır.
 * Burada A-2-3 istisnası uygulanmaz; çünkü kartlar
 * masaya geçerli bir per olarak açılmamıştır.
 */
export function handPenalty(
  cards: Card[],
): number {
  return cards.reduce(
    (total, card) =>
      total +
      rankToPenalty(card.rank),
    0,
  );
}