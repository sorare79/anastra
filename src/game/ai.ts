// Anastra - Yapay zeka rakip mantığı
import type { Card, GameState } from './types';
import { selectBestMelds } from './meldFinder';
import { canAppendToMeld, meldPoints } from './rules';
import { rankToPenalty } from './deck';
import {
  discardCard,
  drawFromDeck,
  drawFromDiscard,
  layOff,
  openHand,
} from './engine';

// AI'ın tek bir turu oynaması: çekme -> aksiyon -> atma
// Adımları tek tek döndürerek animasyon/gecikme sağlanır
export type AIStep =
  | { kind: 'draw'; state: GameState }
  | { kind: 'open'; state: GameState }
  | { kind: 'layoff'; state: GameState }
  | { kind: 'discard'; state: GameState }
  | { kind: 'done'; state: GameState };

// AI çekme kararı
function decideDraw(state: GameState): GameState {
  const seat = state.currentSeat;
  const player = state.players.find((p) => p.seat === seat)!;

  // Yerdeki kart, açılmamışsa sadece açılmayı sağlıyorsa alınabilir
  const topDiscard = state.discard[state.discard.length - 1];

  if (topDiscard && !player.hasOpened) {
    // Yerdeki kartla açılış barajını geçebilir mi?
    const testHand = [...player.hand, topDiscard];
    const melds = selectBestMelds(testHand);
    const total = melds.reduce((s, m) => s + meldPoints(m), 0);
    const usesCard = melds.some((m) => m.some((c) => c.id === topDiscard.id));
    if (total >= state.openThreshold && usesCard) {
      return drawFromDiscard(state);
    }
  }

  if (topDiscard && player.hasOpened) {
    // Açılmışsa: yerdeki kart bir pere işlenebiliyorsa veya per yapıyorsa al
    const canUse =
      state.melds.some(
        (m) => m.ownerTeam === player.team && canAppendToMeld(m, topDiscard),
      );
    if (canUse) {
      return drawFromDiscard(state);
    }
  }

  return drawFromDeck(state);
}

// AI açılış kararı
function decideOpen(state: GameState): GameState {
  const seat = state.currentSeat;
  const player = state.players.find((p) => p.seat === seat)!;
  if (player.hasOpened) return state;

  const melds = selectBestMelds(player.hand);
  const total = melds.reduce((s, m) => s + meldPoints(m), 0);
  if (total >= state.openThreshold && melds.length > 0) {
    const ids = melds.map((m) => m.map((c) => c.id));
    const res = openHand(state, seat, ids);
    if (res.ok) return res.state;
  }
  return state;
}

// AI işleme kararı (açılmışsa elindeki kartları perlere ekle)
function decideLayoff(state: GameState): GameState {
  const seat = state.currentSeat;
  let cur = state;
  let changed = true;

  while (changed) {
    changed = false;
    const player = cur.players.find((p) => p.seat === seat)!;
    if (!player.hasOpened) break;

    for (const card of player.hand) {
      // En az 2 kart elde tutmaya çalış (atmak için), ama biterse bitir
      const meld = cur.melds.find((m) => canAppendToMeld(m, card));
      if (meld) {
        const res = layOff(cur, seat, card.id, meld.id);
        if (res.ok) {
          cur = res.state;
          changed = true;
          break;
        }
      }
    }
  }
  return cur;
}

// AI atma kararı: en yüksek cezalı, işe yaramayan kartı at
function decideDiscard(state: GameState): { state: GameState; finished: boolean } {
  const seat = state.currentSeat;
  const player = state.players.find((p) => p.seat === seat)!;

  if (player.hand.length === 0) {
    return { state, finished: true };
  }

  // Perlerde kullanılan kartları koru
  const usefulIds = new Set<string>();
  const melds = selectBestMelds(player.hand);
  melds.forEach((m) => m.forEach((c) => usefulIds.add(c.id)));

  // Atılabilecek adaylar: perlerde olmayanlar
  let candidates = player.hand.filter((c) => !usefulIds.has(c.id));
  if (candidates.length === 0) {
    // Hepsi perde; yine de bir tane atmak zorunda (en düşük değerli)
    candidates = [...player.hand];
  }

  // En yüksek ceza puanlı kartı at (elde risk azalt)
  candidates.sort((a, b) => rankToPenalty(b.rank) - rankToPenalty(a.rank));
  const toDiscard = candidates[0];

  const res = discardCard(state, seat, toDiscard.id);
  return { state: res.state, finished: res.state.phase !== 'draw' && res.state.currentSeat === seat };
}

// AI turunu adım adım üret (UI gecikmeli oynatabilsin diye)
export function* playAITurn(initial: GameState): Generator<AIStep, void, unknown> {
  let state = initial;
  const seat = state.currentSeat;

  // 1) Çekme
  if (state.phase === 'draw') {
    state = decideDraw(state);
    yield { kind: 'draw', state };
    if (state.phase === 'roundOver' || state.phase === 'gameOver') {
      yield { kind: 'done', state };
      return;
    }
  }

  // 2) Açılış
  const before = state.players.find((p) => p.seat === seat)!.hasOpened;
  state = decideOpen(state);
  const after = state.players.find((p) => p.seat === seat)!.hasOpened;
  if (!before && after) {
    yield { kind: 'open', state };
  }

  // 3) İşleme
  const meldsBefore = state.melds.reduce((s, m) => s + m.cards.length, 0);
  state = decideLayoff(state);
  const meldsAfter = state.melds.reduce((s, m) => s + m.cards.length, 0);
  if (meldsAfter > meldsBefore) {
    yield { kind: 'layoff', state };
  }

  // 4) Atma (tur biter)
  const dres = decideDiscard(state);
  state = dres.state;
  yield { kind: 'discard', state };
  yield { kind: 'done', state };
}

// Basit ipucu: insan oyuncu için en iyi açılış perlerini öner
export function suggestMelds(hand: Card[]): { melds: Card[][]; total: number } {
  const melds = selectBestMelds(hand);
  const total = melds.reduce((s, m) => s + meldPoints(m), 0);
  return { melds, total };
}
