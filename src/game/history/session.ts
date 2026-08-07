// Anastra - Aktif oyun geçmişi oturum yöneticisi

import type {
  GameState,
} from '../types';

import {
  appendActionToRound,
  appendRoundToGame,
  createActionRecord,
  createGameRecord,
  createRoundRecord,
  finishGameRecord,
  finishRoundRecord,
} from './recorder';

import {
  archiveActiveGame,
  clearActiveGameRecord,
  loadActiveGameRecord,
  saveActiveGameRecord,
} from './storage';

import type {
  CreateActionRecordOptions,
} from './recorder';

import type {
  GameActionRecord,
  GameRecord,
  RoundRecord,
} from './types';

/*
 * Bu dosya History sisteminin ana yöneticisidir.
 *
 * Görevleri:
 * - Yeni oyun kaydı başlatmak
 * - Yeni el kaydı başlatmak
 * - Gerçekleşen hamleleri aktif ele eklemek
 * - Eli ve oyunu tamamlamak
 * - Kayıtları localStorage'a göndermek
 *
 * Oyun kurallarıyla ilgili karar vermez.
 */

let activeGame: GameRecord | null = null;
let activeRound: RoundRecord | null = null;

// --------------------------------------------------
// AKTİF KAYITLARA ERİŞİM
// --------------------------------------------------

export function getActiveGameRecord():
  GameRecord | null {
  return activeGame;
}

export function getActiveRoundRecord():
  RoundRecord | null {
  return activeRound;
}

/*
 * Tarayıcıda yarım kalmış bir kayıt bulunuyorsa
 * belleğe geri yükler.
 */
export function restoreHistorySession():
  GameRecord | null {
  const storedGame =
    loadActiveGameRecord();

  if (!storedGame) {
    activeGame = null;
    activeRound = null;

    return null;
  }

  activeGame =
    storedGame;

  activeRound =
    storedGame.rounds.length > 0
      ? storedGame.rounds[
          storedGame.rounds.length - 1
        ]
      : null;

  return activeGame;
}

// --------------------------------------------------
// YENİ OYUN VE EL
// --------------------------------------------------

export function startHistoryGame(
  state: GameState,
): GameRecord {
  activeGame =
    createGameRecord(state);

  activeRound =
    createRoundRecord(state);

  activeGame =
    appendRoundToGame(
      activeGame,
      activeRound,
    );

  saveActiveGameRecord(
    activeGame,
  );

  return activeGame;
}

/*
 * Aynı oyun içinde yeni bir el başlatır.
 */
export function startHistoryRound(
  state: GameState,
): RoundRecord {
  if (!activeGame) {
    startHistoryGame(state);

    if (!activeRound) {
      throw new Error(
        'Yeni el kaydı oluşturulamadı.',
      );
    }

    return activeRound;
  }

  activeRound =
    createRoundRecord(state);

  activeGame =
    appendRoundToGame(
      activeGame,
      activeRound,
    );

  saveActiveGameRecord(
    activeGame,
  );

  return activeRound;
}

// --------------------------------------------------
// HAMLE KAYDI
// --------------------------------------------------

export type RecordHistoryActionOptions =
  Omit<
    CreateActionRecordOptions,
    'stateBefore' | 'stateAfter'
  >;

/*
 * Gerçekleşen bir hamleyi aktif el kaydına ekler.
 */
export function recordHistoryAction(
  stateBefore: GameState,
  stateAfter: GameState,
  options: RecordHistoryActionOptions,
): GameActionRecord | null {
  /*
   * History henüz başlatılmadıysa mevcut durumdan
   * otomatik olarak başlatılır.
   */
  if (!activeGame) {
    startHistoryGame(
      stateBefore,
    );
  }

  if (!activeRound) {
    startHistoryRound(
      stateBefore,
    );
  }

  if (
    !activeGame ||
    !activeRound
  ) {
    return null;
  }

  const action =
    createActionRecord({
      ...options,

      stateBefore,
      stateAfter,
    });

  activeRound =
    appendActionToRound(
      activeRound,
      action,
    );

  /*
   * Aktif oyundaki mevcut el kaydını güncelle.
   */
  activeGame = {
    ...activeGame,

    rounds:
      activeGame.rounds.map(
        (round) =>
          round.id ===
          activeRound?.id
            ? activeRound
            : round,
      ),
  };

  saveActiveGameRecord(
    activeGame,
  );

  return action;
}

// --------------------------------------------------
// EL SONU
// --------------------------------------------------

export function completeHistoryRound(
  state: GameState,
  options: {
    endReason:
      | 'finished'
      | 'deck';

    winnerSeat?: number;

    winnerTeam?: number;
  },
): RoundRecord | null {
  if (
    !activeGame ||
    !activeRound
  ) {
    return null;
  }

  activeRound =
    finishRoundRecord(
      activeRound,
      state,
      options,
    );

  activeGame = {
    ...activeGame,

    rounds:
      activeGame.rounds.map(
        (round) =>
          round.id ===
          activeRound?.id
            ? activeRound
            : round,
      ),
  };

  saveActiveGameRecord(
    activeGame,
  );

  return activeRound;
}

// --------------------------------------------------
// OYUN SONU
// --------------------------------------------------

export function completeHistoryGame(
  state: GameState,
): GameRecord | null {
  if (!activeGame) {
    return null;
  }

  activeGame =
    finishGameRecord(
      activeGame,
      state,
    );

  archiveActiveGame(
    activeGame,
  );

  const completedGame =
    activeGame;

  activeGame = null;
  activeRound = null;

  return completedGame;
}

/*
 * Yeni oyuna başlanırken yarım kalan kayıt bilinçli
 * şekilde silinmek istenirse kullanılır.
 */
export function resetHistorySession(): void {
  activeGame = null;
  activeRound = null;

  clearActiveGameRecord();
}