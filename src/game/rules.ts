// Anastra - Per doğrulama, sıralama ve puanlama kuralları
import type {
  Card,
  Meld,
  MeldType,
} from './types';

import {
  rankToPenalty,
} from './deck';

/*
 * GERİYE DÖNÜK UYUMLULUK
 *
 * Anastra'da As düşük kart olarak kullanılamaz.
 * Bu fonksiyon eski kodlarda içe aktarılmış olabilir;
 * build bozulmaması için korunur fakat her zaman false döner.
 *
 * A-2-3 geçersizdir.
 */
export function isAceLowThreeRun(
  _cards: Card[],
): boolean {
  return false;
}

/*
 * Bir perin toplam puanı.
 *
 * As her durumda 11 puandır.
 *
 * Örnekler:
 * Q-K-A = 10 + 10 + 11 = 31
 * A-A-A = 11 + 11 + 11 = 33
 */
export function meldPoints(
  cards: Card[],
): number {
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

  const rank =
    cards[0].rank;

  if (
    !cards.every(
      (card) =>
        card.rank === rank,
    )
  ) {
    return false;
  }

  const suits =
    new Set(
      cards.map(
        (card) =>
          card.suit,
      ),
    );

  return (
    suits.size ===
    cards.length
  );
}

/*
 * Aynı suit içinde ardışık seri.
 *
 * Anastra'da As yalnızca yüksek karttır.
 *
 * Geçerli:
 * 2-3-4
 * 10-J-Q
 * J-Q-K
 * Q-K-A
 *
 * Geçersiz:
 * A-2-3
 * A-2-3-4
 * K-A-2
 *
 * Rank sırası:
 * 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A
 */
export function isValidRun(
  cards: Card[],
): boolean {
  if (cards.length < 3) {
    return false;
  }

  const suit =
    cards[0].suit;

  if (
    !cards.every(
      (card) =>
        card.suit === suit,
    )
  ) {
    return false;
  }

  const values =
    cards
      .map(
        (card) =>
          card.rankValue,
      )
      .sort(
        (first, second) =>
          first - second,
      );

  /*
   * Aynı rank değerinden iki kart seri içinde
   * birlikte kullanılamaz.
   */
  for (
    let index = 1;
    index < values.length;
    index += 1
  ) {
    if (
      values[index] ===
      values[index - 1]
    ) {
      return false;
    }
  }

  /*
   * Yalnızca doğal yüksek sıra kabul edilir.
   * As'ın rankValue değeri 14 olduğu için
   * Q-K-A doğal olarak geçerli olur.
   */
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
  return (
    getMeldType(cards) !==
    null
  );
}

/*
 * Seriyi ekranda doğru sıraya dizer.
 *
 * As her zaman yüksek olduğu için rankValue sırası
 * doğrudan yeterlidir:
 *
 * Q-K-A
 */
export function sortRun(
  cards: Card[],
): Card[] {
  return [...cards].sort(
    (first, second) =>
      first.rankValue -
      second.rankValue,
  );
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

    const suits =
      new Set(
        meld.cards.map(
          (meldCard) =>
            meldCard.suit,
        ),
      );

    return (
      !suits.has(
        card.suit,
      )
    );
  }

  /*
   * Seri için yeni kart eklendiğinde bütün seri
   * yüksek-As kuralıyla yeniden doğrulanır.
   */
  return isValidRun([
    ...meld.cards,
    card,
  ]);
}

/*
 * Birden fazla perin toplam açılış puanı.
 *
 * As her durumda 11 puandır.
 */
export function totalMeldsPoints(
  melds: Card[][],
): number {
  return melds.reduce(
    (total, meld) =>
      total +
      meldPoints(meld),
    0,
  );
}

/*
 * Elde kalan kartların ceza puanı.
 *
 * As elde kaldığında 11 puandır.
 */
export function handPenalty(
  cards: Card[],
): number {
  return cards.reduce(
    (total, card) =>
      total +
      rankToPenalty(
        card.rank,
      ),
    0,
  );
}