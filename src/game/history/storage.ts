// Anastra - Oyun geçmişini tarayıcıda saklama sistemi

import type {
  GameRecord,
  RoundRecord,
} from './types';

const GAME_RECORDS_STORAGE_KEY =
  'anastra-game-records-v1';

const ACTIVE_GAME_STORAGE_KEY =
  'anastra-active-game-v1';

const MAX_STORED_GAMES = 200;

/*
 * localStorage yalnızca tarayıcı ortamında vardır.
 * Build sırasında veya farklı ortamlarda hata oluşmaması
 * için önce erişilebilir olup olmadığını kontrol ediyoruz.
 */
function hasStorage(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined'
  );
}

function safeParse<T>(
  value: string | null,
  fallback: T,
): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function safeSet(
  key: string,
  value: unknown,
): boolean {
  if (!hasStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(value),
    );

    return true;
  } catch {
    return false;
  }
}

function safeRemove(
  key: string,
): boolean {
  if (!hasStorage()) {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/*
 * Kaydedilmiş bütün tamamlanmış oyunları getirir.
 *
 * En yeni oyun listenin başında tutulur.
 */
export function loadGameRecords(): GameRecord[] {
  if (!hasStorage()) {
    return [];
  }

  const records = safeParse<GameRecord[]>(
    window.localStorage.getItem(
      GAME_RECORDS_STORAGE_KEY,
    ),
    [],
  );

  if (!Array.isArray(records)) {
    return [];
  }

  return records;
}

/*
 * Tamamlanmış bir oyunu kalıcı geçmişe ekler.
 *
 * Aynı id daha önce varsa güncellenir.
 * Tarayıcı hafızasının gereksiz büyümemesi için
 * yalnızca en yeni 200 oyun tutulur.
 */
export function saveGameRecord(
  game: GameRecord,
): boolean {
  const records =
    loadGameRecords();

  const withoutCurrent =
    records.filter(
      (item) =>
        item.id !== game.id,
    );

  const nextRecords = [
    game,
    ...withoutCurrent,
  ]
    .sort(
      (first, second) =>
        second.startedAt -
        first.startedAt,
    )
    .slice(
      0,
      MAX_STORED_GAMES,
    );

  return safeSet(
    GAME_RECORDS_STORAGE_KEY,
    nextRecords,
  );
}

/*
 * Belirli bir oyun kaydını getirir.
 */
export function loadGameRecord(
  gameId: string,
): GameRecord | null {
  return (
    loadGameRecords().find(
      (game) =>
        game.id === gameId,
    ) ?? null
  );
}

/*
 * Belirli bir oyun kaydını siler.
 */
export function deleteGameRecord(
  gameId: string,
): boolean {
  const records =
    loadGameRecords();

  const nextRecords =
    records.filter(
      (game) =>
        game.id !== gameId,
    );

  return safeSet(
    GAME_RECORDS_STORAGE_KEY,
    nextRecords,
  );
}

/*
 * Tamamlanmış bütün oyun geçmişini siler.
 */
export function clearGameRecords(): boolean {
  return safeRemove(
    GAME_RECORDS_STORAGE_KEY,
  );
}

/*
 * Devam eden oyunu geçici olarak saklar.
 *
 * Sayfa yenilense bile kayıt sistemi aynı oyundan
 * devam edebilir. Bu kayıt tamamlanmış oyun listesine
 * otomatik olarak eklenmez.
 */
export function saveActiveGameRecord(
  game: GameRecord,
): boolean {
  return safeSet(
    ACTIVE_GAME_STORAGE_KEY,
    game,
  );
}

/*
 * Devam eden oyun kaydını getirir.
 */
export function loadActiveGameRecord():
  GameRecord | null {
  if (!hasStorage()) {
    return null;
  }

  return safeParse<GameRecord | null>(
    window.localStorage.getItem(
      ACTIVE_GAME_STORAGE_KEY,
    ),
    null,
  );
}

/*
 * Devam eden oyun kaydını siler.
 */
export function clearActiveGameRecord(): boolean {
  return safeRemove(
    ACTIVE_GAME_STORAGE_KEY,
  );
}

/*
 * Devam eden oyunun son elini günceller.
 *
 * Round aynı id ile kayıtlıysa değiştirilir,
 * yoksa oyun kaydına eklenir.
 */
export function saveRoundToActiveGame(
  round: RoundRecord,
): GameRecord | null {
  const activeGame =
    loadActiveGameRecord();

  if (!activeGame) {
    return null;
  }

  const roundExists =
    activeGame.rounds.some(
      (item) =>
        item.id === round.id,
    );

  const rounds = roundExists
    ? activeGame.rounds.map(
        (item) =>
          item.id === round.id
            ? round
            : item,
      )
    : [
        ...activeGame.rounds,
        round,
      ];

  const updatedGame: GameRecord = {
    ...activeGame,
    rounds,
  };

  saveActiveGameRecord(
    updatedGame,
  );

  return updatedGame;
}

/*
 * Aktif oyunu tamamlanmış oyun listesine taşır.
 */
export function archiveActiveGame(
  finishedGame?: GameRecord,
): GameRecord | null {
  const game =
    finishedGame ??
    loadActiveGameRecord();

  if (!game) {
    return null;
  }

  saveGameRecord(game);
  clearActiveGameRecord();

  return game;
}

/*
 * Kayıtlı oyun sayısını döndürür.
 */
export function getStoredGameCount(): number {
  return loadGameRecords().length;
}

/*
 * Öğrenme ve istatistik sistemi için bütün el
 * kayıtlarını tek liste halinde döndürür.
 */
export function loadAllRoundRecords():
  RoundRecord[] {
  return loadGameRecords()
    .flatMap(
      (game) =>
        game.rounds,
    )
    .sort(
      (first, second) =>
        first.startedAt -
        second.startedAt,
    );
}