// Anastra - Elden bütün geçerli perleri bulma ve en iyi kombinasyonu seçme
import type { Card } from './types';
import { isValidMeld, meldPoints } from './rules';

function meldKey(cards: Card[]): string {
  return cards
    .map((card) => card.id)
    .sort()
    .join('|');
}

/*
 * Verilen kart listesinin bütün alt kümelerini üretir.
 * Perler en az 3 kart olduğu için yalnızca 3 ve üzeri
 * büyüklükteki gruplar kontrol edilir.
 */
function generateCombinations(
  cards: Card[],
  minimumSize = 3,
): Card[][] {
  const combinations: Card[][] = [];
  const current: Card[] = [];

  function search(index: number): void {
    if (index === cards.length) {
      if (current.length >= minimumSize) {
        combinations.push([...current]);
      }
      return;
    }

    // Kartı seçmeden ilerle.
    search(index + 1);

    // Kartı seçerek ilerle.
    current.push(cards[index]);
    search(index + 1);
    current.pop();
  }

  search(0);
  return combinations;
}

/*
 * Eldeki bütün geçerli perleri bulur.
 *
 * Bu sürüm:
 * - Uzun bir serinin bütün geçerli alt serilerini bulur.
 * - İki destedeki farklı fiziksel kartları hesaba katar.
 * - Set ve run seçeneklerinin tamamını değerlendirir.
 */
export function findMelds(hand: Card[]): Card[][] {
  const melds: Card[][] = [];
  const seen = new Set<string>();

  /*
   * Eller normalde 13-20 kart civarında olur.
   * Tüm elin alt kümelerini doğrudan denemek yerine
   * önce mantıklı aday gruplarına ayırıyoruz.
   */

  // -----------------------------------------
  // SET ADAYLARI
  // Aynı rank değerindeki kartlar
  // -----------------------------------------

  const cardsByRank = new Map<string, Card[]>();

  for (const card of hand) {
    const group = cardsByRank.get(card.rank) ?? [];
    group.push(card);
    cardsByRank.set(card.rank, group);
  }

  for (const cards of cardsByRank.values()) {
    if (cards.length < 3) {
      continue;
    }

    for (const combination of generateCombinations(cards)) {
      if (!isValidMeld(combination)) {
        continue;
      }

      const key = meldKey(combination);

      if (!seen.has(key)) {
        seen.add(key);
        melds.push(combination);
      }
    }
  }

  // -----------------------------------------
  // RUN ADAYLARI
  // Aynı suit içindeki kartlar
  // -----------------------------------------

  const cardsBySuit = new Map<string, Card[]>();

  for (const card of hand) {
    const group = cardsBySuit.get(card.suit) ?? [];
    group.push(card);
    cardsBySuit.set(card.suit, group);
  }

  for (const cards of cardsBySuit.values()) {
    if (cards.length < 3) {
      continue;
    }

    /*
     * Aynı suit içindeki bütün kombinasyonları dener.
     * Örneğin 3-4-5-6 için:
     *
     * 3-4-5
     * 4-5-6
     * 3-4-5-6
     *
     * seçeneklerini ayrı ayrı bulur.
     */
    for (const combination of generateCombinations(cards)) {
      if (!isValidMeld(combination)) {
        continue;
      }

      const key = meldKey(combination);

      if (!seen.has(key)) {
        seen.add(key);
        melds.push(combination);
      }
    }
  }

  return melds;
}

interface MeldCandidate {
  cards: Card[];
  points: number;
  mask: bigint;
}

/*
 * Çakışmayan perler arasından en iyi kombinasyonu seçer.
 *
 * Öncelik sırası:
 * 1. Masaya indirilen toplam kart sayısı
 * 2. Toplam per puanı
 * 3. Per sayısı
 */
export function selectBestMelds(hand: Card[]): Card[][] {
  const allMelds = findMelds(hand);

  if (allMelds.length === 0) {
    return [];
  }

  const cardIndexes = new Map<string, number>();

  hand.forEach((card, index) => {
    cardIndexes.set(card.id, index);
  });

  const candidates: MeldCandidate[] = allMelds.map((cards) => {
    let mask = 0n;

    for (const card of cards) {
      const index = cardIndexes.get(card.id);

      if (index !== undefined) {
        mask |= 1n << BigInt(index);
      }
    }

    return {
      cards,
      points: meldPoints(cards),
      mask,
    };
  });

  /*
   * Daha güçlü adayların önce denenmesi,
   * aramanın daha erken iyi bir çözüm bulmasını sağlar.
   */
  candidates.sort((a, b) => {
    if (b.cards.length !== a.cards.length) {
      return b.cards.length - a.cards.length;
    }

    return b.points - a.points;
  });

  let bestMelds: Card[][] = [];
  let bestCardCount = -1;
  let bestPoints = -1;

  function search(
    index: number,
    usedMask: bigint,
    chosen: Card[][],
    cardCount: number,
    points: number,
  ): void {
    if (index >= candidates.length) {
      const isBetter =
        cardCount > bestCardCount ||
        (cardCount === bestCardCount && points > bestPoints) ||
        (
          cardCount === bestCardCount &&
          points === bestPoints &&
          chosen.length > bestMelds.length
        );

      if (isBetter) {
        bestCardCount = cardCount;
        bestPoints = points;
        bestMelds = chosen.map((meld) => [...meld]);
      }

      return;
    }

    // Bu peri kullanmadan devam et.
    search(
      index + 1,
      usedMask,
      chosen,
      cardCount,
      points,
    );

    const candidate = candidates[index];

    // Bu per daha önce kullanılan kartlarla çakışıyorsa kullanılamaz.
    if ((candidate.mask & usedMask) !== 0n) {
      return;
    }

    chosen.push(candidate.cards);

    search(
      index + 1,
      usedMask | candidate.mask,
      chosen,
      cardCount + candidate.cards.length,
      points + candidate.points,
    );

    chosen.pop();
  }

  search(0, 0n, [], 0, 0);

  return bestMelds;
}

/*
 * Belirli bir kartın mutlaka kullanıldığı en iyi
 * per kombinasyonunu bulur.
 *
 * Yerden alınan son kartla açılış kontrolü için kullanılır.
 */
export function selectBestMeldsUsingCard(
  hand: Card[],
  requiredCardId: string,
): Card[][] {
  const allMelds = findMelds(hand);
  const cardIndexes = new Map<string, number>();

  hand.forEach((card, index) => {
    cardIndexes.set(card.id, index);
  });

  const requiredIndex = cardIndexes.get(requiredCardId);

  if (requiredIndex === undefined) {
    return [];
  }

  const requiredMask = 1n << BigInt(requiredIndex);

  const candidates: MeldCandidate[] = allMelds.map((cards) => {
    let mask = 0n;

    for (const card of cards) {
      const index = cardIndexes.get(card.id);

      if (index !== undefined) {
        mask |= 1n << BigInt(index);
      }
    }

    return {
      cards,
      points: meldPoints(cards),
      mask,
    };
  });

  let bestMelds: Card[][] = [];
  let bestPoints = -1;
  let bestCardCount = -1;

  function search(
    index: number,
    usedMask: bigint,
    chosen: Card[][],
    points: number,
    cardCount: number,
  ): void {
    if (index >= candidates.length) {
      const requiredUsed =
        (usedMask & requiredMask) !== 0n;

      if (!requiredUsed) {
        return;
      }

      const isBetter =
        points > bestPoints ||
        (points === bestPoints && cardCount > bestCardCount);

      if (isBetter) {
        bestPoints = points;
        bestCardCount = cardCount;
        bestMelds = chosen.map((meld) => [...meld]);
      }

      return;
    }

    search(
      index + 1,
      usedMask,
      chosen,
      points,
      cardCount,
    );

    const candidate = candidates[index];

    if ((candidate.mask & usedMask) !== 0n) {
      return;
    }

    chosen.push(candidate.cards);

    search(
      index + 1,
      usedMask | candidate.mask,
      chosen,
      points + candidate.points,
      cardCount + candidate.cards.length,
    );

    chosen.pop();
  }

  search(0, 0n, [], 0, 0);

  return bestMelds;
}