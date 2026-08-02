// Anastra - Oyun motoru: durum geçişleri (immutable)
import type { Card, GameState, Meld, Player } from './types';
import { createDoubleDeck, shuffle, suitName } from './deck';
import {
  canAppendToMeld,
  getMeldType,
  handPenalty,
  meldPoints,
  sortRun,
} from './rules';

let meldCounter = 0;

function nextMeldId(): string {
  meldCounter += 1;
  return `meld-${meldCounter}-${Date.now()}`;
}

export const PLAYER_NAMES = ['Sen', 'Ayşe', 'Ortak', 'Mehmet'];

export function seatTeam(seat: number): number {
  return seat % 2;
}

export interface NewGameOptions {
  targetScore: number;
  dealerSeat?: number;
  teamScores?: [number, number];
  roundNumber?: number;
}

export interface DiscardTakeOption {
  startIndex: number;
  requiredCard: Card;
  cards: Card[];
}

// --------------------------------------------------
// YENİ EL
// --------------------------------------------------

export function createRound(opts: NewGameOptions): GameState {
  const dealerSeat = opts.dealerSeat ?? 0;
  const deck = shuffle(createDoubleDeck());

  const players: Player[] = PLAYER_NAMES.map((name, seat) => ({
    seat,
    name,
    team: seatTeam(seat),
    isHuman: seat === 0,
    hand: [],
    hasOpened: false,
  }));

  for (let i = 0; i < 13; i += 1) {
    for (let seat = 0; seat < 4; seat += 1) {
      const card = deck.pop();

      if (card) {
        players[seat].hand.push(card);
      }
    }
  }

  const startSeat = (dealerSeat + 1) % 4;

  const state: GameState = {
    players,
    deck,
    discard: [],
    melds: [],
    currentSeat: startSeat,
    dealerSeat,
    phase: 'draw',
    openThreshold: 52,
    teamScores: opts.teamScores ?? [0, 0],
    targetScore: opts.targetScore,
    roundScores: [0, 0],
    log: [
      `Yeni el başladı. ${players[startSeat].name} oyuna başlıyor.`,
    ],
    drawnThisTurn: false,
    tookFromDiscard: false,
    lastDrawnCardId: null,
    requiredDiscardCardId: null,
    takenDiscardCardIds: [],
    winnerTeam: null,
    roundNumber: opts.roundNumber ?? 1,
  };

  return sortPlayerHand(state, 0);
}

// --------------------------------------------------
// YARDIMCI FONKSİYONLAR
// --------------------------------------------------

export function sortPlayerHand(
  state: GameState,
  seat: number,
): GameState {
  const suitOrder = [
    'hearts',
    'spades',
    'diamonds',
    'clubs',
  ];

  const players = state.players.map((player) => {
    if (player.seat !== seat) {
      return player;
    }

    const hand = [...player.hand].sort((a, b) => {
      if (a.suit !== b.suit) {
        return (
          suitOrder.indexOf(a.suit) -
          suitOrder.indexOf(b.suit)
        );
      }

      return a.rankValue - b.rankValue;
    });

    return {
      ...player,
      hand,
    };
  });

  return {
    ...state,
    players,
  };
}

function addLog(state: GameState, message: string): string[] {
  return [...state.log.slice(-40), message];
}

function cardLabel(card: Card): string {
  return `${suitName(card.suit)} ${card.rank}`;
}

// --------------------------------------------------
// KAPALI DESTEDEN ÇEKME
// --------------------------------------------------

export function drawFromDeck(state: GameState): GameState {
  if (state.phase !== 'draw' || state.drawnThisTurn) {
    return state;
  }

  if (state.deck.length === 0) {
    return endRound(state, 'deck');
  }

  const deck = [...state.deck];
  const card = deck.pop();

  if (!card) {
    return endRound(state, 'deck');
  }

  const players = state.players.map((player) =>
    player.seat === state.currentSeat
      ? {
          ...player,
          hand: [...player.hand, card],
        }
      : player,
  );

  let next: GameState = {
    ...state,
    deck,
    players,
    phase: 'action',
    drawnThisTurn: true,
    tookFromDiscard: false,
    lastDrawnCardId: card.id,
    requiredDiscardCardId: null,
    takenDiscardCardIds: [],
    log: addLog(
      state,
      `${state.players[state.currentSeat].name} desteden kart çekti.`,
    ),
  };

  next = sortPlayerHand(next, state.currentSeat);

  return next;
}

// --------------------------------------------------
// YERDEN ALINABİLECEK KARTLARI BULMA
// --------------------------------------------------

export function getDiscardTakeOption(
  state: GameState,
  seat: number,
  selectedIndex?: number,
): DiscardTakeOption | null {
  const player = state.players.find(
    (item) => item.seat === seat,
  );

  if (!player || state.discard.length === 0) {
    return null;
  }

  /*
   * Elini açmamış oyuncu yalnızca rakibin
   * son attığı kartı alabilir.
   *
   * Kartla gerçekten açılıp açılmadığı openHand()
   * fonksiyonunda kontrol edilir.
   */
  if (!player.hasOpened) {
    const topIndex = state.discard.length - 1;
    const topCard = state.discard[topIndex];

    return {
      startIndex: topIndex,
      requiredCard: topCard,
      cards: [topCard],
    };
  }

  /*
   * İnsan oyuncu yerdeki bir kartı doğrudan seçtiyse,
   * o kartın mevcut bir pere işlenebilir olması gerekir.
   */
  if (selectedIndex !== undefined) {
    if (
      selectedIndex < 0 ||
      selectedIndex >= state.discard.length
    ) {
      return null;
    }

    const selectedCard = state.discard[selectedIndex];

    const canUseSelectedCard = state.melds.some((meld) =>
      canAppendToMeld(meld, selectedCard),
    );

    if (!canUseSelectedCard) {
      return null;
    }

    return {
      startIndex: selectedIndex,
      requiredCard: selectedCard,
      cards: state.discard.slice(selectedIndex),
    };
  }

  /*
   * AI seçim indeksi göndermediğinde, işlenebilen
   * en alttaki kart otomatik olarak bulunur.
   */
  for (
    let index = 0;
    index < state.discard.length;
    index += 1
  ) {
    const candidate = state.discard[index];

    const canUseCandidate = state.melds.some((meld) =>
      canAppendToMeld(meld, candidate),
    );

    if (canUseCandidate) {
      return {
        startIndex: index,
        requiredCard: candidate,
        cards: state.discard.slice(index),
      };
    }
  }

  return null;
}

export function canTakeDiscard(
  state: GameState,
  seat: number,
  selectedIndex?: number,
): boolean {
  if (state.phase !== 'draw' || state.drawnThisTurn) {
    return false;
  }

  return (
    getDiscardTakeOption(
      state,
      seat,
      selectedIndex,
    ) !== null
  );
}

// --------------------------------------------------
// YERDEN KART ALMA
// --------------------------------------------------

export function drawFromDiscard(
  state: GameState,
  selectedIndex?: number,
): GameState {
  if (state.phase !== 'draw' || state.drawnThisTurn) {
    return state;
  }

  const seat = state.currentSeat;

  const option = getDiscardTakeOption(
    state,
    seat,
    selectedIndex,
  );

  if (!option) {
    return {
      ...state,
      log: addLog(
        state,
        'Seçilen kart yerden alınamadı.',
      ),
    };
  }

  /*
   * Seçilen kartın altındaki kartlar yerde kalır.
   * Seçilen kart ve üzerindeki kartlar oyuncuya geçer.
   */
  const discard = state.discard.slice(
    0,
    option.startIndex,
  );

  const takenCards = option.cards;

  const players = state.players.map((player) =>
    player.seat === seat
      ? {
          ...player,
          hand: [
            ...player.hand,
            ...takenCards,
          ],
        }
      : player,
  );

  const playerHadOpened =
    state.players[seat].hasOpened;

  let next: GameState = {
    ...state,
    discard,
    players,
    phase: 'action',
    drawnThisTurn: true,
    tookFromDiscard: true,
    lastDrawnCardId: option.requiredCard.id,
    requiredDiscardCardId: option.requiredCard.id,
    takenDiscardCardIds: takenCards.map(
      (card) => card.id,
    ),
    log: addLog(
      state,
      playerHadOpened
        ? `${state.players[seat].name} yerden ${takenCards.length} kart aldı. ${cardLabel(option.requiredCard)} kartını işlemek zorunda.`
        : `${state.players[seat].name} rakibin attığı ${cardLabel(option.requiredCard)} kartını aldı. Bu kartla elini açmak zorunda.`,
    ),
  };

  next = sortPlayerHand(next, seat);

  return next;
}

// --------------------------------------------------
// EL AÇMA
// --------------------------------------------------

export function openHand(
  state: GameState,
  seat: number,
  meldCardIds: string[][],
): {
  ok: boolean;
  state: GameState;
  error?: string;
} {
  const player = state.players.find(
    (item) => item.seat === seat,
  );

  if (!player) {
    return {
      ok: false,
      state,
      error: 'Oyuncu bulunamadı.',
    };
  }

  if (player.hasOpened) {
    return {
      ok: false,
      state,
      error: 'Zaten elini açmışsın.',
    };
  }

  if (
    state.currentSeat !== seat ||
    state.phase !== 'action'
  ) {
    return {
      ok: false,
      state,
      error: 'Sıra sende değil.',
    };
  }

  const handMap = new Map(
    player.hand.map((card) => [card.id, card]),
  );

  const meldGroups: Card[][] = [];
  const selectedIds = new Set<string>();

  for (const ids of meldCardIds) {
    if (ids.length === 0) {
      return {
        ok: false,
        state,
        error: 'Boş per seçilemez.',
      };
    }

    const cards: Card[] = [];

    for (const id of ids) {
      if (selectedIds.has(id)) {
        return {
          ok: false,
          state,
          error:
            'Aynı kart birden fazla perde kullanılamaz.',
        };
      }

      const card = handMap.get(id);

      if (!card) {
        return {
          ok: false,
          state,
          error: 'Geçersiz kart seçimi.',
        };
      }

      selectedIds.add(id);
      cards.push(card);
    }

    const type = getMeldType(cards);

    if (!type) {
      return {
        ok: false,
        state,
        error:
          'Geçersiz per. En az 3 karttan oluşan seri veya grup seçmelisin.',
      };
    }

    meldGroups.push(cards);
  }

  if (meldGroups.length === 0) {
    return {
      ok: false,
      state,
      error: 'En az bir per açmalısın.',
    };
  }

  const usedIds = new Set(
    meldGroups
      .flat()
      .map((card) => card.id),
  );

  /*
   * Rakibin son attığı kart alınmışsa bu kart
   * açılış perlerinden birinde kullanılmalıdır.
   */
  if (
    state.requiredDiscardCardId &&
    !usedIds.has(state.requiredDiscardCardId)
  ) {
    const requiredCard = player.hand.find(
      (card) =>
        card.id === state.requiredDiscardCardId,
    );

    return {
      ok: false,
      state,
      error: requiredCard
        ? `Yerden aldığın ${cardLabel(requiredCard)} kartını açılış perlerinden birinde kullanmalısın.`
        : 'Yerden aldığın kartı açılış perlerinden birinde kullanmalısın.',
    };
  }

  const total = meldGroups.reduce(
    (sum, meld) => sum + meldPoints(meld),
    0,
  );

  const required = state.openThreshold;

  if (total < required) {
    return {
      ok: false,
      state,
      error:
        `Açılış için en az ${required} puan gerekli. ` +
        `Seçilen perlerin toplamı ${total}.`,
    };
  }

  const newMelds: Meld[] = meldGroups.map((cards) => {
    const type = getMeldType(cards);

    if (!type) {
      throw new Error(
        'Geçerli perin türü bulunamadı.',
      );
    }

    return {
      id: nextMeldId(),
      type,
      cards:
        type === 'run'
          ? sortRun(cards)
          : [...cards],
      ownerTeam: player.team,
      ownerSeat: seat,
      locked: false,
    };
  });

  const players = state.players.map((item) =>
    item.seat === seat
      ? {
          ...item,
          hasOpened: true,
          hand: item.hand.filter(
            (card) => !usedIds.has(card.id),
          ),
        }
      : item,
  );

  const newThreshold = Math.max(
    state.openThreshold,
    total + 1,
  );

  const next: GameState = {
    ...state,
    players,
    melds: [
      ...state.melds,
      ...newMelds,
    ],
    openThreshold: newThreshold,
    requiredDiscardCardId: null,
    takenDiscardCardIds: [],
    log: addLog(
      state,
      `${player.name} ${total} puanla elini açtı! Yeni baraj: ${newThreshold}.`,
    ),
  };

  return {
    ok: true,
    state: next,
  };
}

// --------------------------------------------------
// İŞLEME
// --------------------------------------------------

export function layOff(
  state: GameState,
  seat: number,
  cardId: string,
  meldId: string,
): {
  ok: boolean;
  state: GameState;
  error?: string;
} {
  const player = state.players.find(
    (item) => item.seat === seat,
  );

  if (!player) {
    return {
      ok: false,
      state,
      error: 'Oyuncu bulunamadı.',
    };
  }

  if (!player.hasOpened) {
    return {
      ok: false,
      state,
      error: 'Önce elini açmalısın.',
    };
  }

  if (
    state.currentSeat !== seat ||
    state.phase !== 'action'
  ) {
    return {
      ok: false,
      state,
      error: 'Sıra sende değil.',
    };
  }

  const card = player.hand.find(
    (item) => item.id === cardId,
  );

  if (!card) {
    return {
      ok: false,
      state,
      error: 'Kart bulunamadı.',
    };
  }

  const meld = state.melds.find(
    (item) => item.id === meldId,
  );

  if (!meld) {
    return {
      ok: false,
      state,
      error: 'Per bulunamadı.',
    };
  }

  if (!canAppendToMeld(meld, card)) {
    return {
      ok: false,
      state,
      error: 'Bu kart bu pere eklenemez.',
    };
  }

  const newCards =
    meld.type === 'run'
      ? sortRun([
          ...meld.cards,
          card,
        ])
      : [
          ...meld.cards,
          card,
        ];

  const melds = state.melds.map((item) =>
    item.id === meldId
      ? {
          ...item,
          cards: newCards,
        }
      : item,
  );

  const players = state.players.map((item) =>
    item.seat === seat
      ? {
          ...item,
          hand: item.hand.filter(
            (handCard) =>
              handCard.id !== cardId,
          ),
        }
      : item,
  );

  const usedRequiredDiscardCard =
    state.requiredDiscardCardId === card.id;

  return {
    ok: true,
    state: {
      ...state,
      melds,
      players,
      requiredDiscardCardId:
        usedRequiredDiscardCard
          ? null
          : state.requiredDiscardCardId,
      takenDiscardCardIds:
        usedRequiredDiscardCard
          ? []
          : state.takenDiscardCardIds,
      log: addLog(
        state,
        `${player.name} ${cardLabel(card)} kartını işledi.`,
      ),
    },
  };
}

// --------------------------------------------------
// KART ATMA
// --------------------------------------------------

export function discardCard(
  state: GameState,
  seat: number,
  cardId: string,
): {
  ok: boolean;
  state: GameState;
  error?: string;
} {
  const player = state.players.find(
    (item) => item.seat === seat,
  );

  if (!player) {
    return {
      ok: false,
      state,
      error: 'Oyuncu bulunamadı.',
    };
  }

  if (
    state.currentSeat !== seat ||
    state.phase !== 'action'
  ) {
    return {
      ok: false,
      state,
      error: 'Sıra sende değil.',
    };
  }

  if (!state.drawnThisTurn) {
    return {
      ok: false,
      state,
      error: 'Önce kart çekmelisin.',
    };
  }

  if (state.requiredDiscardCardId) {
    const requiredCard = player.hand.find(
      (card) =>
        card.id === state.requiredDiscardCardId,
    );

    return {
      ok: false,
      state,
      error: requiredCard
        ? player.hasOpened
          ? `Önce yerden aldığın ${cardLabel(requiredCard)} kartını mevcut bir pere işlemelisin.`
          : `Önce yerden aldığın ${cardLabel(requiredCard)} kartını kullanarak elini açmalısın.`
        : 'Önce yerden aldığın zorunlu kartı kullanmalısın.',
    };
  }

  const card = player.hand.find(
    (item) => item.id === cardId,
  );

  if (!card) {
    return {
      ok: false,
      state,
      error: 'Kart bulunamadı.',
    };
  }

  const players = state.players.map((item) =>
    item.seat === seat
      ? {
          ...item,
          hand: item.hand.filter(
            (handCard) =>
              handCard.id !== cardId,
          ),
        }
      : item,
  );

  const discard = [
    ...state.discard,
    card,
  ];

  let next: GameState = {
    ...state,
    players,
    discard,
    log: addLog(
      state,
      `${player.name} ${cardLabel(card)} attı.`,
    ),
  };

  const updatedPlayer = next.players.find(
    (item) => item.seat === seat,
  );

  if (
    updatedPlayer &&
    updatedPlayer.hand.length === 0 &&
    updatedPlayer.hasOpened
  ) {
    return {
      ok: true,
      state: endRound(
        next,
        'finished',
        seat,
      ),
    };
  }

  next = advanceTurn(next);

  return {
    ok: true,
    state: next,
  };
}

// --------------------------------------------------
// TUR İLERLETME
// --------------------------------------------------

export function advanceTurn(
  state: GameState,
): GameState {
  if (state.deck.length === 0) {
    return endRound(state, 'deck');
  }

  const nextSeat =
    (state.currentSeat + 1) % 4;

  return {
    ...state,
    currentSeat: nextSeat,
    phase: 'draw',
    drawnThisTurn: false,
    tookFromDiscard: false,
    lastDrawnCardId: null,
    requiredDiscardCardId: null,
    takenDiscardCardIds: [],
  };
}

// --------------------------------------------------
// EL BİTİŞİ VE PUANLAMA
// --------------------------------------------------

export function endRound(
  state: GameState,
  reason: 'deck' | 'finished',
  finisherSeat?: number,
): GameState {
  const teamMeldPoints: [number, number] = [0, 0];

  for (const meld of state.melds) {
    teamMeldPoints[meld.ownerTeam] +=
      meldPoints(meld.cards);
  }

  const teamPenalty: [number, number] = [0, 0];

  for (const player of state.players) {
    teamPenalty[player.team] +=
      handPenalty(player.hand);
  }

  const roundScores: [number, number] = [
    teamMeldPoints[0] - teamPenalty[0],
    teamMeldPoints[1] - teamPenalty[1],
  ];

  if (
    reason === 'finished' &&
    finisherSeat !== undefined
  ) {
    const team = seatTeam(finisherSeat);
    roundScores[team] += 25;
  }

  const teamScores: [number, number] = [
    state.teamScores[0] + roundScores[0],
    state.teamScores[1] + roundScores[1],
  ];

  let winnerTeam: number | null = null;
  let phase: GameState['phase'] = 'roundOver';

  if (
    teamScores[0] >= state.targetScore ||
    teamScores[1] >= state.targetScore
  ) {
    if (teamScores[0] !== teamScores[1]) {
      winnerTeam =
        teamScores[0] > teamScores[1]
          ? 0
          : 1;

      phase = 'gameOver';
    }
  }

  const reasonMessage =
    reason === 'deck'
      ? 'Deste bitti, el sona erdi.'
      : finisherSeat !== undefined
        ? `${state.players[finisherSeat].name} elini bitirdi!`
        : 'Bir oyuncu elini bitirdi!';

  return {
    ...state,
    phase,
    roundScores,
    teamScores,
    winnerTeam,
    requiredDiscardCardId: null,
    takenDiscardCardIds: [],
    log: addLog(
      state,
      `${reasonMessage} ` +
        `Takım 1: ${roundScores[0]}, ` +
        `Takım 2: ${roundScores[1]} puan.`,
    ),
  };
}