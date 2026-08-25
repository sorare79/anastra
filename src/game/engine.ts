// Anastra - Oyun motoru
import type {
  Card,
  GameState,
  Meld,
  Player,
  RoundScoreRecord,
} from './types';

import {
  createDoubleDeck,
  shuffle,
  suitName,
} from './deck';

import {
  canAppendToMeld,
  getMeldType,
  handPenalty,
  meldPoints,
  sortRun,
} from './rules';

let meldCounter = 0;
let scoringCardCounter = 0;

function nextMeldId(): string {
  meldCounter += 1;
  return 'meld-' + meldCounter + '-' + Date.now();
}

function nextScoringCardId(): string {
  scoringCardCounter += 1;
  return (
    'scoring-card-' +
    scoringCardCounter +
    '-' +
    Date.now()
  );
}

export const PLAYER_NAMES = [
  'Sen',
  'Eda',
  'Ege',
  'Duru',
];

export function seatTeam(seat: number): number {
  return seat % 2;
}

export interface NewGameOptions {
  targetScore: number;
  dealerSeat?: number;
  teamScores?: [number, number];
  roundNumber?: number;
  scoreHistory?: RoundScoreRecord[];
}

export interface DiscardTakeOption {
  startIndex: number;
  requiredCard: Card;
  cards: Card[];
}

export interface EngineResult {
  ok: boolean;
  state: GameState;
  error?: string;
}

// --------------------------------------------------
// YENİ EL
// --------------------------------------------------

export function createRound(
  options: NewGameOptions,
): GameState {
  const dealerSeat = options.dealerSeat ?? 0;
  const deck = shuffle(createDoubleDeck());

  const players: Player[] = PLAYER_NAMES.map(
    (name, seat) => ({
      seat,
      name,
      team: seatTeam(seat),
      isHuman: seat === 0,
      hand: [],
      hasOpened: false,
    }),
  );

  for (let cardIndex = 0; cardIndex < 13; cardIndex += 1) {
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
    scoringCards: [],
    currentSeat: startSeat,
    dealerSeat,
    phase: 'draw',

    // Açılış barajı her zaman sabit 51.
    openThreshold: 51,

    teamScores: options.teamScores ?? [0, 0],
    targetScore: options.targetScore,
    roundScores: [0, 0],
    scoreHistory: options.scoreHistory ?? [],

    log: [
      'Yeni el başladı. ' +
        players[startSeat].name +
        ' oyuna başlıyor.',
    ],

    drawnThisTurn: false,
    tookFromDiscard: false,
    lastDrawnCardId: null,
    requiredDiscardCardId: null,
    takenDiscardCardIds: [],
    winnerTeam: null,
    roundNumber: options.roundNumber ?? 1,
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

    const hand = [...player.hand].sort((first, second) => {
      if (first.suit !== second.suit) {
        return (
          suitOrder.indexOf(first.suit) -
          suitOrder.indexOf(second.suit)
        );
      }

      return first.rankValue - second.rankValue;
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

/*
 * Oyuncunun elindeki kartların sırasını değiştirir.
 *
 * Bu fonksiyon yalnızca görsel dizilişi değiştirir.
 * Kart eklemez, silmez ve oyun kurallarını etkilemez.
 *
 * Sürükle-bırak sistemi bu fonksiyonu kullanacaktır.
 */
export function reorderPlayerHand(
  state: GameState,
  seat: number,
  fromIndex: number,
  toIndex: number,
): GameState {
  if (fromIndex === toIndex) {
    return state;
  }

  const players = state.players.map((player) => {
    if (player.seat !== seat) {
      return player;
    }

    const hand = [...player.hand];

    if (
      fromIndex < 0 ||
      fromIndex >= hand.length ||
      toIndex < 0 ||
      toIndex >= hand.length
    ) {
      return player;
    }

    const [card] = hand.splice(fromIndex, 1);

    if (!card) {
      return player;
    }

    hand.splice(toIndex, 0, card);

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

function addLog(
  state: GameState,
  message: string,
): string[] {
  return [
    ...state.log.slice(-40),
    message,
  ];
}

function cardLabel(card: Card): string {
  return suitName(card.suit) + ' ' + card.rank;
}

function getPlayer(
  state: GameState,
  seat: number,
): Player | undefined {
  return state.players.find(
    (player) => player.seat === seat,
  );
}


/*
 * Anastra'da As yalnızca yüksek karttır.
 *
 * Kart sırası:
 * 2-3-4-5-6-7-8-9-10-J-Q-K-A
 *
 * Card.rankValue içinde As = 14 olduğu için
 * ek bir düşük-As dönüşümüne gerek yoktur.
 */
function sortedRunCards(
  cards: Card[],
): Card[] {
  return [...cards].sort(
    (first, second) =>
      first.rankValue -
      second.rankValue,
  );
}

/*
 * Rakibin perine işleme kontrolü.
 *
 * SET:
 * - Aynı rank yeterlidir.
 * - İki deste bulunduğu için aynı suit tekrarına
 *   izin verilir.
 *
 * RUN:
 * - Kart aynı suit olmalıdır.
 * - Kart serinin yalnızca düşük veya yüksek ucuna
 *   bir basamak eklenebilmelidir.
 * - Seri daha önce uç değiştirme işlemi görmüş olsa
 *   bile açık kalır ve uçtan işlenebilir.
 */
export function canCloseOpponentMeld(
  meld: Meld,
  card: Card,
): boolean {
  if (meld.locked) {
    return false;
  }

 if (meld.type === 'set') {
  // Rank aynı olmalı.
  if (
    card.rank !==
    meld.cards[0].rank
  ) {
    return false;
  }

  // Aynı suit ikinci kez kullanılamaz.
  const usedSuits = new Set(
    meld.cards.map(
      (meldCard) =>
        meldCard.suit,
    ),
  );

  return !usedSuits.has(
    card.suit,
  );
}
  if (
    meld.cards.length === 0 ||
    card.suit !==
      meld.cards[0].suit
  ) {
    return false;
  }

  const ordered =
    sortedRunCards(
      meld.cards,
    );

  const firstValue =
    ordered[0].rankValue;

  const lastValue =
    ordered[
      ordered.length - 1
    ].rankValue;

  const cardValue =
    card.rankValue;

  return (
    cardValue ===
      firstValue - 1 ||
    cardValue ===
      lastValue + 1
  );
}

/*
 * Arayüz ve motorun aynı işleme kontrolünü kullanması için
 * dışa aktarılan ortak yardımcı fonksiyon.
 */
export function canLayOffToMeld(
  state: GameState,
  seat: number,
  card: Card,
  meld: Meld,
): boolean {
  const player = getPlayer(state, seat);

  if (!player || meld.locked) {
    return false;
  }

  /*
   * KENDİ TAKIMININ PERİ
   *
   * SET:
   * Mevcut canAppendToMeld() kuralı aynen korunur.
   *
   * RUN:
   * Rakip daha önce serinin ucunu değiştirmiş olabilir.
   * Örneğin 7-8-9 serisine rakip 10 işlediğinde masa
   * üzerinde 7-8-10 kalabilir. Bu per artık klasik
   * isValidRun() kontrolünden geçmez; buna rağmen açık
   * uçlardan işlenmeye devam edebilmelidir.
   *
   * Bu nedenle run için bütün seriyi yeniden doğrulamak
   * yerine yalnızca:
   * - aynı suit
   * - düşük veya yüksek uca tam bir basamak ekleme
   * şartlarını kontrol ediyoruz.
   */
  if (meld.ownerTeam === player.team) {
    if (meld.type === 'run') {
      if (
        meld.cards.length === 0 ||
        card.suit !== meld.cards[0].suit
      ) {
        return false;
      }

      const ordered =
        sortedRunCards(
          meld.cards,
        );

      const firstValue =
        ordered[0].rankValue;

      const lastValue =
        ordered[
          ordered.length - 1
        ].rankValue;

      const cardValue =
        card.rankValue;

      return (
        cardValue ===
          firstValue - 1 ||
        cardValue ===
          lastValue + 1
      );
    }

    return canAppendToMeld(
      meld,
      card,
    );
  }

  return canCloseOpponentMeld(
    meld,
    card,
  );
}

// --------------------------------------------------
// KAPALI DESTEDEN ÇEKME
// --------------------------------------------------

export function drawFromDeck(
  state: GameState,
): GameState {
  if (
    state.phase !== 'draw' ||
    state.drawnThisTurn
  ) {
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

  let nextState: GameState = {
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
      state.players[state.currentSeat].name +
        ' desteden kart çekti.',
    ),
  };

  /*
   * İnsan oyuncu kartlarını elle sıralayabildiği için
   * yeni kart çekildiğinde mevcut düzen korunur ve
   * çekilen kart elin sonuna eklenir.
   *
   * AI oyuncularının eli ise otomatik sıralanabilir.
   */
  if (state.currentSeat !== 0) {
    nextState = sortPlayerHand(
      nextState,
      state.currentSeat,
    );
  }

  return nextState;
}

// --------------------------------------------------
// YERDEN KART ALMA
// --------------------------------------------------

export function getDiscardTakeOption(
  state: GameState,
  seat: number,
  selectedIndex?: number,
): DiscardTakeOption | null {
  const player = getPlayer(state, seat);

  if (
    !player ||
    state.discard.length === 0
  ) {
    return null;
  }

  /*
   * El açmamış oyuncu yalnızca en üstteki,
   * yani rakibin son attığı kartı alabilir.
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
   * Elini açmış oyuncu yerdeki istediği kartı seçebilir.
   * Seçilen kart ve onun üstündeki bütün kartlar alınır.
   *
   * Seçilen ilk kart daha sonra:
   * - mevcut bir pere işlenmeli veya
   * - yeni bir perin içinde kullanılmalıdır.
   *
   * Kullanamazsa "Yerden Almayı İptal Et" ile geri döner.
   */
  if (selectedIndex !== undefined) {
    if (
      selectedIndex < 0 ||
      selectedIndex >= state.discard.length
    ) {
      return null;
    }

    const selectedCard = state.discard[selectedIndex];

    return {
      startIndex: selectedIndex,
      requiredCard: selectedCard,
      cards: state.discard.slice(selectedIndex),
    };
  }

  /*
   * AI henüz ayrıntılı seçim yapmıyorsa,
   * en üst kartı almayı dener.
   */
  const topIndex = state.discard.length - 1;
  const topCard = state.discard[topIndex];

  return {
    startIndex: topIndex,
    requiredCard: topCard,
    cards: [topCard],
  };
}

export function canTakeDiscard(
  state: GameState,
  seat: number,
  selectedIndex?: number,
): boolean {
  if (
    state.phase !== 'draw' ||
    state.drawnThisTurn
  ) {
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

export function drawFromDiscard(
  state: GameState,
  selectedIndex?: number,
): GameState {
  if (
    state.phase !== 'draw' ||
    state.drawnThisTurn
  ) {
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

  const player = getPlayer(state, seat);
  const hadOpened = player?.hasOpened ?? false;

  const message = hadOpened
    ? state.players[seat].name +
      ' yerden ' +
      takenCards.length +
      ' kart aldı. ' +
      cardLabel(option.requiredCard) +
      ' kartını işlemeli veya yeni bir perde kullanmalı.'
    : state.players[seat].name +
      ' rakibin attığı ' +
      cardLabel(option.requiredCard) +
      ' kartını aldı. Bu kartla 51 puanlık açılış yapmalı.';

  let nextState: GameState = {
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
    log: addLog(state, message),
  };

  /*
   * İnsan oyuncu yerden kart aldığında manuel el sırası
   * korunur. Alınan kartlar mevcut elin sonuna eklenir.
   *
   * AI oyuncularında otomatik sıralama devam eder.
   */
  if (seat !== 0) {
    nextState = sortPlayerHand(
      nextState,
      seat,
    );
  }

  return nextState;
}

// --------------------------------------------------
// EL AÇMA VE YENİ PER OLUŞTURMA
// --------------------------------------------------

/*
 * Bu fonksiyon iki amaçla kullanılır:
 *
 * 1. Oyuncu henüz açılmadıysa:
 *    Seçilen perlerin toplamı en az 51 olmalıdır.
 *
 * 2. Oyuncu daha önce açıldıysa:
 *    Seçilen kartlarla yeni bir veya birden fazla
 *    geçerli per oluşturabilir. Yeniden 51 şartı aranmaz.
 */
export function openHand(
  state: GameState,
  seat: number,
  meldCardIds: string[][],
): EngineResult {
  const player = getPlayer(state, seat);

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

  const handMap = new Map<string, Card>();

  for (const card of player.hand) {
    handMap.set(card.id, card);
  }

  const meldGroups: Card[][] = [];
  const selectedIds = new Set<string>();

  for (const ids of meldCardIds) {
    if (ids.length < 3) {
      return {
        ok: false,
        state,
        error:
          'Her per en az 3 karttan oluşmalıdır.',
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

    const meldType = getMeldType(cards);

    if (!meldType) {
      return {
        ok: false,
        state,
        error:
          'Seçilen kartlar geçerli bir seri veya grup oluşturmuyor.',
      };
    }

    meldGroups.push(cards);
  }

  if (meldGroups.length === 0) {
    return {
      ok: false,
      state,
      error: 'En az bir per seçmelisin.',
    };
  }

  const usedIds = new Set<string>();

  for (const group of meldGroups) {
    for (const card of group) {
      usedIds.add(card.id);
    }
  }

  /*
   * Tur kart atılarak bitmelidir.
   * Per açma / yeni per oluşturma işlemi oyuncunun
   * elindeki bütün kartları tüketemez.
   */
  const remainingHandCount =
    player.hand.length - usedIds.size;

  if (remainingHandCount === 0) {
    return {
      ok: false,
      state,
      error:
        'Per açtıktan sonra atacak en az bir kartın kalmalıdır.',
    };
  }

  /*
   * Yerden alınan zorunlu kart varsa,
   * bu kart yeni oluşturulan perlerden birinde
   * mutlaka kullanılmalıdır.
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
        ? 'Yerden aldığın ' +
          cardLabel(requiredCard) +
          ' kartını mevcut bir pere işlemeli veya yeni perin içinde kullanmalısın.'
        : 'Yerden aldığın zorunlu kartı kullanmalısın.',
    };
  }

  const total = meldGroups.reduce(
    (sum, meld) => sum + meldPoints(meld),
    0,
  );

  /*
   * Oyuncu ilk kez açılıyorsa 51 şartı vardır.
   * Daha önce açılmışsa yeni per için baraj aranmaz.
   */
  if (
    !player.hasOpened &&
    total < state.openThreshold
  ) {
    return {
      ok: false,
      state,
      error:
        'Açılış için en az ' +
        state.openThreshold +
        ' puan gerekli. Seçilen perlerin toplamı ' +
        total +
        '.',
    };
  }

  const newMelds: Meld[] = meldGroups.map((cards) => {
    const meldType = getMeldType(cards);

    if (!meldType) {
      throw new Error(
        'Geçerli perin türü bulunamadı.',
      );
    }

    return {
      id: nextMeldId(),
      type: meldType,
      cards:
        meldType === 'run'
          ? sortRun(cards)
          : [...cards],
      ownerTeam: player.team,
      ownerSeat: seat,

      /*
       * Dört farklı suitten oluşan set tamamlanmıştır.
       * Masaya doğrudan dört kart olarak açılırsa
       * otomatik kapanır ve tekrar işlenemez.
       * Seriler kart sayısından dolayı kapanmaz.
       */
      locked:
        meldType === 'set' &&
        cards.length === 4,
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

  const actionMessage = player.hasOpened
    ? player.name +
      ' yeni per açtı. Toplam per puanı: ' +
      total +
      '.'
    : player.name +
      ' ' +
      total +
      ' puanla elini açtı.';

  return {
    ok: true,
    state: {
      ...state,
      players,
      melds: [
        ...state.melds,
        ...newMelds,
      ],
      openThreshold: 51,
      requiredDiscardCardId: null,
      takenDiscardCardIds: [],
      log: addLog(
        state,
        actionMessage,
      ),
    },
  };
}

// --------------------------------------------------
// PERE İŞLEME VE RAKİP PERİNİ KAPATMA
// --------------------------------------------------

export function layOff(
  state: GameState,
  seat: number,
  cardId: string,
  meldId: string,
): EngineResult {
  const player = getPlayer(state, seat);

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

  if (meld.locked) {
    return {
      ok: false,
      state,
      error: 'Bu per kapalıdır ve tekrar işlenemez.',
    };
  }

  if (!canLayOffToMeld(state, seat, card, meld)) {
    return {
      ok: false,
      state,
      error:
        meld.ownerTeam === player.team
          ? 'Bu kart kendi takımının perine eklenemez.'
          : 'Bu kart rakibin perini kapatamaz.',
    };
  }

  /*
   * Tur kart atılarak bitmelidir.
   * Son eldeki kart pere işlenemez; oyuncunun
   * atmak için en az bir kartı kalmalıdır.
   */
  if (player.hand.length === 1) {
    return {
      ok: false,
      state,
      error:
        'Pere işledikten sonra atacak en az bir kartın kalmalıdır.',
    };
  }

  const players = state.players.map((item) =>
    item.seat === seat
      ? {
          ...item,
          hand: item.hand.filter(
            (handCard) => handCard.id !== cardId,
          ),
        }
      : item,
  );

  const usedRequiredCard =
    state.requiredDiscardCardId === card.id;

  /*
   * Kendi takımının perine normal işleme.
   */
  if (meld.ownerTeam === player.team) {
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

            /*
             * Kendi takımının üçlü setine dördüncü
             * farklı suit kart işlendiğinde set tamamlanır,
             * otomatik kapanır ve tekrar işlenemez.
             * Run türündeki perler açık kalır.
             */
            locked:
              item.type === 'set' &&
              newCards.length === 4,
          }
        : item,
    );

    return {
      ok: true,
      state: {
        ...state,
        melds,
        players,
        requiredDiscardCardId:
          usedRequiredCard
            ? null
            : state.requiredDiscardCardId,
        takenDiscardCardIds:
          usedRequiredCard
            ? []
            : state.takenDiscardCardIds,
        log: addLog(
          state,
          player.name +
            ' ' +
            cardLabel(card) +
            ' kartını kendi takımının perine işledi.',
        ),
      },
    };
  }

  /*
   * RAKİBİN SETİ:
   *
   * - Rakibin seti locked = true olur.
   * - İşlenen kart sete eklenmez.
   * - İşlenen kart işleyen takımın kapalı puan
   *   kartı olur.
   */
  if (meld.type === 'set') {
    const melds =
      state.melds.map((item) =>
        item.id === meldId
          ? {
              ...item,
              locked: true,
            }
          : item,
      );

    const scoringCards = [
      ...state.scoringCards,
      {
        id: nextScoringCardId(),
        card,
        ownerTeam: player.team,
        ownerSeat: seat,
        sourceMeldId: meld.id,
        faceDown: true,
      },
    ];

    return {
      ok: true,
      state: {
        ...state,
        melds,
        players,
        scoringCards,
        requiredDiscardCardId:
          usedRequiredCard
            ? null
            : state.requiredDiscardCardId,
        takenDiscardCardIds:
          usedRequiredCard
            ? []
            : state.takenDiscardCardIds,
        log: addLog(
          state,
          player.name +
            ' ' +
            cardLabel(card) +
            ' kartıyla rakibin grubunu kapattı. İşlediği kartın puanı kendi takımına yazılacak.',
        ),
      },
    };
  }

  /*
   * RAKİBİN SERİSİ:
   *
   * 7-8-9 serisine 10 işlenirse:
   * - 10 rakibin serisine girer.
   * - Aynı uçtaki eski 9 seriden çıkar.
   * - 9, işleyen takımın kapalı puan kartı olur.
   * - Rakipte 7-8-10 kalır.
   * - Seri kilitlenmez.
   *
   * 7-8-9 serisine 6 işlenirse:
   * - Rakipte 6-8-9 kalır.
   * - 7, işleyen takımın kapalı puan kartı olur.
   */
  const ordered =
    sortedRunCards(
      meld.cards,
    );

  const firstCard =
    ordered[0];

  const lastCard =
    ordered[
      ordered.length - 1
    ];

  const firstValue =
    firstCard.rankValue;

  const lastValue =
    lastCard.rankValue;

  const incomingValue =
    card.rankValue;

  let capturedCard: Card;

  if (
    incomingValue ===
    firstValue - 1
  ) {
    capturedCard =
      firstCard;
  } else if (
    incomingValue ===
    lastValue + 1
  ) {
    capturedCard =
      lastCard;
  } else {
    return {
      ok: false,
      state,
      error:
        'Kart rakip serisinin geçerli bir ucuna işlenemedi.',
    };
  }

  const replacementCards =
    meld.cards.map(
      (meldCard) =>
        meldCard.id ===
        capturedCard.id
          ? card
          : meldCard,
    );

  const melds =
    state.melds.map((item) =>
      item.id === meldId
        ? {
            ...item,
            locked: false,
            cards:
              sortedRunCards(
                replacementCards,
              ),
          }
        : item,
    );

  const scoringCards = [
    ...state.scoringCards,
    {
      id: nextScoringCardId(),
      card: capturedCard,
      ownerTeam: player.team,
      ownerSeat: seat,
      sourceMeldId: meld.id,
      faceDown: true,
    },
  ];

  return {
    ok: true,
    state: {
      ...state,
      melds,
      players,
      scoringCards,
      requiredDiscardCardId:
        usedRequiredCard
          ? null
          : state.requiredDiscardCardId,
      takenDiscardCardIds:
        usedRequiredCard
          ? []
          : state.takenDiscardCardIds,
      log: addLog(
        state,
        player.name +
          ' ' +
          cardLabel(card) +
          ' kartını rakibin serisine işledi ve ' +
          cardLabel(
            capturedCard,
          ) +
          ' kartını kapalı puan kartı olarak aldı.',
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
): EngineResult {
  const player = getPlayer(state, seat);

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
        ? 'Önce yerden aldığın ' +
          cardLabel(requiredCard) +
          ' kartını işlemeli veya yeni bir perde kullanmalısın.'
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

  let nextState: GameState = {
    ...state,
    players,
    discard,
    log: addLog(
      state,
      player.name +
        ' ' +
        cardLabel(card) +
        ' attı.',
    ),
  };

  const updatedPlayer = getPlayer(
    nextState,
    seat,
  );

  if (
    updatedPlayer &&
    updatedPlayer.hand.length === 0 &&
    updatedPlayer.hasOpened
  ) {
    return {
      ok: true,
      state: endRound(
        nextState,
        'finished',
        seat,
      ),
    };
  }

  nextState = advanceTurn(nextState);

  return {
    ok: true,
    state: nextState,
  };
}

// --------------------------------------------------
// TUR İLERLETME
// --------------------------------------------------

export function advanceTurn(
  state: GameState,
): GameState {
  if (state.deck.length === 0) {
    return endRound(
      state,
      'deck',
    );
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
// EL SONU VE PUANLAMA
// --------------------------------------------------

export function endRound(
  state: GameState,
  reason: 'deck' | 'finished',
  finisherSeat?: number,
): GameState {
  // Skor defteri oyuncu bazında tutulur.
  const playerPoints: [number, number, number, number] = [0, 0, 0, 0];
  const playerPenalties: [number, number, number, number] = [0, 0, 0, 0];

  // Açılan perlerin puanı, peri açan oyuncuya yazılır.
  for (const meld of state.melds) {
    if (meld.ownerSeat >= 0 && meld.ownerSeat < 4) {
      playerPoints[meld.ownerSeat] += meldPoints(meld.cards);
    }
  }

  // Rakip perinden kazanılan kapalı kart puanı, kazanan oyuncuya yazılır.
  for (const scoringCard of state.scoringCards) {
    if (scoringCard.ownerSeat >= 0 && scoringCard.ownerSeat < 4) {
      playerPoints[scoringCard.ownerSeat] += scoringCard.card.points;
    }
  }

  // Her oyuncunun elde kalan kartları kendi cezasıdır.
  for (const player of state.players) {
    if (player.seat >= 0 && player.seat < 4) {
      playerPenalties[player.seat] = handPenalty(player.hand);
    }
  }

  // Takım 1 = seat 0 + seat 2, Takım 2 = seat 1 + seat 3.
  const roundScores: [number, number] = [
    playerPoints[0] + playerPoints[2] -
      playerPenalties[0] - playerPenalties[2],
    playerPoints[1] + playerPoints[3] -
      playerPenalties[1] - playerPenalties[3],
  ];

  // El bitirme bonusu YOK.
  const teamScores: [number, number] = [
    state.teamScores[0] + roundScores[0],
    state.teamScores[1] + roundScores[1],
  ];

  const roundRecord: RoundScoreRecord = {
    roundNumber: state.roundNumber,
    playerPoints: [
      playerPoints[0],
      playerPoints[1],
      playerPoints[2],
      playerPoints[3],
    ],
    playerPenalties: [
      playerPenalties[0],
      playerPenalties[1],
      playerPenalties[2],
      playerPenalties[3],
    ],
    teamRoundScores: [roundScores[0], roundScores[1]],
    teamTotals: [teamScores[0], teamScores[1]],
  };

  const scoreHistory: RoundScoreRecord[] = [
    ...state.scoreHistory,
    roundRecord,
  ];

  let winnerTeam: number | null = null;
  let phase: GameState['phase'] = 'roundOver';

  if (
    teamScores[0] >= state.targetScore ||
    teamScores[1] >= state.targetScore
  ) {
    if (teamScores[0] !== teamScores[1]) {
      winnerTeam = teamScores[0] > teamScores[1] ? 0 : 1;
      phase = 'gameOver';
    }
  }

  let reasonMessage = 'Bir oyuncu elini bitirdi.';

  if (reason === 'deck') {
    reasonMessage = 'Deste bitti, el sona erdi.';
  } else if (finisherSeat !== undefined) {
    reasonMessage =
      state.players[finisherSeat].name + ' elini bitirdi.';
  }

  return {
    ...state,
    phase,
    roundScores,
    teamScores,
    scoreHistory,
    winnerTeam,
    openThreshold: 51,
    requiredDiscardCardId: null,
    takenDiscardCardIds: [],
    log: addLog(
      state,
      reasonMessage +
        ' Bizim Takım : ' +
        roundScores[0] +
        ', Diger Takım: ' +
        roundScores[1] +
        ' puan.',
    ),
  };
}