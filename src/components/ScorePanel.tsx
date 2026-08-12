// Anastra - Skor paneli, olay günlüğü ve skor defteri

import {
  useEffect,
  useState,
} from 'react';

import type {
  CSSProperties,
} from 'react';

import { createPortal } from 'react-dom';

import type {
  GameState,
} from '../game/types';

interface ScorePanelProps {
  state: GameState;
  onShowRules: () => void;
  onNewGame: () => void;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,

  width: '100vw',
  height: '100vh',

  zIndex: 999999,

  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  padding: 24,

  background:
    'rgba(0, 0, 0, 0.78)',

  backdropFilter:
    'blur(4px)',

  overflow: 'auto',
};

const paperStyle: CSSProperties = {
  position: 'relative',

  width:
    'min(820px, calc(100vw - 60px))',

  maxHeight:
    'calc(100vh - 60px)',

  overflowY: 'auto',

  padding:
    '46px 40px 34px 64px',

  color: '#243c68',

  backgroundColor:
    '#f7f1df',

  backgroundImage:
    `repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 31px,
      rgba(79, 130, 170, 0.20) 32px,
      transparent 33px
    )`,

  borderRadius: 5,

  boxShadow:
    '0 28px 90px rgba(0,0,0,0.72)',

  fontFamily:
    '"Comic Sans MS", "Segoe Print", cursive',
};

const fourColumns: CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(4, minmax(0, 1fr))',
};

const twoColumns: CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    '1fr 1fr',
};

export function ScorePanel({
  state,
  onShowRules,
  onNewGame,
}: ScorePanelProps) {
  const [
    showScoreBook,
    setShowScoreBook,
  ] = useState(false);

  useEffect(() => {
    if (
      state.phase === 'roundOver' ||
      state.phase === 'gameOver'
    ) {
      setShowScoreBook(true);
    }
  }, [state.phase]);

  /*
   * GERÇEK TAKIM DÜZENİ
   *
   * Takım 1:
   * Sen = seat 0
   * Ege = seat 2
   *
   * Takım 2:
   * Eda = seat 1
   * Duru = seat 3
   */

  const columns = [
    {
      seat: 0,
      name:
        state.players[0]?.name ??
        'Sen',
    },

    {
      seat: 2,
      name:
        state.players[2]?.name ??
        'Ege',
    },

    {
      seat: 1,
      name:
        state.players[1]?.name ??
        'Eda',
    },

    {
      seat: 3,
      name:
        state.players[3]?.name ??
        'Duru',
    },
  ];

  return (
    <>
      {/* =====================================
          NORMAL SKOR PANELİ
      ====================================== */}

      <div className="flex flex-col gap-2 text-white">

        <button
          type="button"
          onClick={() =>
            setShowScoreBook(true)
          }
          style={{
            width: '100%',
            padding: 0,
            border: 0,
            background:
              'transparent',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          <div className="flex gap-2">

            <div className="flex-1 rounded-lg bg-sky-500/20 border border-sky-400/30 p-2 text-center">
              <div className="text-[10px] text-sky-300">
                Takım 1
                <br />
                (Sen+Ortak)
              </div>

              <div className="text-xl font-bold">
                {state.teamScores[0]}
              </div>
            </div>

            <div className="flex-1 rounded-lg bg-rose-500/20 border border-rose-400/30 p-2 text-center">
              <div className="text-[10px] text-rose-300">
                Takım 2
              </div>

              <div className="text-xl font-bold">
                {state.teamScores[1]}
              </div>
            </div>

          </div>

          <div
            style={{
              marginTop: 4,
              textAlign: 'center',
              fontSize: 11,
              opacity: 0.75,
            }}
          >
            Skor defteri
          </div>
        </button>

        <div className="flex items-center justify-between text-[11px] text-white/70 px-1">
          <span>
            Hedef: {state.targetScore}
          </span>

          <span>
            El: {state.roundNumber}
          </span>

          <span>
            Baraj: {state.openThreshold}
          </span>
        </div>

        <div className="flex gap-2">

          <button
            onClick={onShowRules}
            className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 py-1.5 text-xs transition-colors"
          >
            Kurallar
          </button>

          <button
            onClick={onNewGame}
            className="flex-1 rounded-lg bg-white/10 hover:bg-white/20 py-1.5 text-xs transition-colors"
          >
            Yeni Oyun
          </button>

        </div>

        <div className="rounded-lg bg-black/30 p-2 h-24 overflow-y-auto text-[11px] text-white/60 space-y-0.5">

          {state.log
            .slice(-8)
            .reverse()
            .map(
              (
                line,
                index,
              ) => (
                <div key={index}>
                  {line}
                </div>
              ),
            )}

        </div>
      </div>

      {/* =====================================
          SKOR DEFTERİ MODALI
      ====================================== */}

      {showScoreBook &&
        createPortal(
        <div
          style={overlayStyle}
          onClick={() =>
            setShowScoreBook(false)
          }
        >

          <div
            style={paperStyle}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* SOLDAN KIRMIZI DEFTER ÇİZGİSİ */}

            <div
              style={{
                position: 'absolute',

                top: 0,
                bottom: 0,

                left: 43,

                width: 2,

                background:
                  'rgba(190, 66, 66, 0.42)',

                pointerEvents:
                  'none',
              }}
            />

            {/* KAPAT */}

            <button
              type="button"
              onClick={() =>
                setShowScoreBook(false)
              }
              style={{
                position:
                  'absolute',

                top: 12,
                right: 14,

                width: 38,
                height: 38,

                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',

                border:
                  '1px solid rgba(0,0,0,.2)',

                borderRadius: 8,

                background:
                  'rgba(255,255,255,.55)',

                color: '#222',

                fontSize: 27,

                cursor: 'pointer',

                zIndex: 10,
              }}
            >
              ×
            </button>

            {/* BAŞLIK */}

            <div
              style={{
                textAlign:
                  'center',

                fontSize: 27,

                fontWeight: 700,

                color: '#222',

                marginBottom:
                  22,

                letterSpacing: 1,
              }}
            >
              SKOR DEFTERİ
            </div>

            {/* OYUNCULAR */}

            <div
              style={{
                ...fourColumns,

                borderTop:
                  '2px solid rgba(40,50,60,.7)',

                borderBottom:
                  '2px solid rgba(40,50,60,.7)',
              }}
            >

              {columns.map(
                (
                  column,
                  index,
                ) => (
                  <div
                    key={
                      column.seat
                    }
                    style={{
                      minHeight:
                        52,

                      display:
                        'flex',

                      alignItems:
                        'center',

                      justifyContent:
                        'center',

                      padding: 8,

                      fontSize:
                        18,

                      fontWeight:
                        700,

                      color:
                        index < 2
                          ? '#1f5597'
                          : '#8c3940',

                      borderRight:
                        index === 1
                          ? '3px solid rgba(40,50,60,.65)'
                          : index === 3
                            ? 'none'
                            : '1px solid rgba(40,50,60,.35)',
                    }}
                  >
                    {column.name}
                  </div>
                ),
              )}

            </div>

            {/* TAKIM İSİMLERİ */}

            <div
              style={{
                ...twoColumns,

                color:
                  'rgba(30,30,30,.65)',

                fontFamily:
                  'Arial, sans-serif',

                fontWeight:
                  700,

                fontSize: 11,

                textAlign:
                  'center',

                letterSpacing:
                  1,

                marginBottom:
                  5,
              }}
            >

              <div
                style={{
                  padding: 6,

                  borderRight:
                    '3px solid rgba(40,50,60,.55)',
                }}
              >
                TAKIM 1
              </div>

              <div
                style={{
                  padding: 6,
                }}
              >
                TAKIM 2
              </div>

            </div>

            {/* =================================
                TURLAR
            ================================== */}

            {state.scoreHistory.length ===
            0 ? (

              <div
                style={{
                  padding:
                    '70px 20px',

                  textAlign:
                    'center',

                  color:
                    'rgba(30,30,30,.48)',

                  fontSize: 17,
                }}
              >
                Henüz tamamlanmış
                bir el yok.
              </div>

            ) : (

              state.scoreHistory.map(
                (round) => (

                  <div
                    key={
                      round.roundNumber
                    }
                    style={{
                      position:
                        'relative',

                      padding:
                        '8px 0 10px',

                      borderBottom:
                        '1px solid rgba(45,55,65,.35)',
                    }}
                  >

                    <div
                      style={{
                        fontFamily:
                          'Arial, sans-serif',

                        fontSize:
                          11,

                        fontWeight:
                          700,

                        color:
                          'rgba(25,25,25,.62)',

                        marginBottom:
                          3,
                      }}
                    >
                      {
                        round.roundNumber
                      }
                      . TUR
                    </div>

                    {/* PUAN */}

                    <div
                      style={
                        fourColumns
                      }
                    >

                      {columns.map(
                        (
                          column,
                          index,
                        ) => (

                          <div
                            key={
                              'p-' +
                              column.seat
                            }
                            style={{
                              minHeight:
                                36,

                              display:
                                'flex',

                              alignItems:
                                'center',

                              justifyContent:
                                'center',

                              fontSize:
                                22,

                              fontWeight:
                                700,

                              color:
                                '#20569a',

                              borderRight:
                                index === 1
                                  ? '3px solid rgba(40,50,60,.55)'
                                  : index === 3
                                    ? 'none'
                                    : '1px solid rgba(40,50,60,.22)',
                            }}
                          >
                            {
                              round
                                .playerPoints[
                                column
                                  .seat
                              ]
                            }
                          </div>

                        ),
                      )}

                    </div>

                    {/* CEZA */}

                    <div
                      style={
                        fourColumns
                      }
                    >

                      {columns.map(
                        (
                          column,
                          index,
                        ) => (

                          <div
                            key={
                              'c-' +
                              column.seat
                            }
                            style={{
                              minHeight:
                                33,

                              display:
                                'flex',

                              alignItems:
                                'center',

                              justifyContent:
                                'center',

                              fontSize:
                                19,

                              fontWeight:
                                700,

                              color:
                                '#b13939',

                              borderRight:
                                index === 1
                                  ? '3px solid rgba(40,50,60,.55)'
                                  : index === 3
                                    ? 'none'
                                    : '1px solid rgba(40,50,60,.22)',
                            }}
                          >
                            {
                              round
                                .playerPenalties[
                                column
                                  .seat
                              ]
                            }
                          </div>

                        ),
                      )}

                    </div>

                  </div>

                ),
              )

            )}

            {/* =================================
                GENEL TAKIM TOPLAMLARI
            ================================== */}

            <div
              style={{
                ...twoColumns,

                marginTop: 20,

                borderTop:
                  '4px double rgba(35,45,55,.72)',
              }}
            >

              {/* TAKIM 1 */}

              <div
                style={{
                  minHeight: 100,

                  display: 'flex',

                  flexDirection:
                    'column',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  borderRight:
                    '3px solid rgba(40,50,60,.6)',
                }}
              >

                <div
                  style={{
                    color:
                      '#222',

                    fontFamily:
                      'Arial, sans-serif',

                    fontSize: 12,

                    fontWeight:
                      700,
                  }}
                >
                  TAKIM 1 TOPLAMI
                </div>

                <div
                  style={{
                    fontSize: 39,

                    fontWeight:
                      700,

                    color:
                      '#20569a',

                    lineHeight: 1.2,

                    borderBottom:
                      '3px double #20569a',
                  }}
                >
                  {
                    state
                      .teamScores[0]
                  }
                </div>

              </div>

              {/* TAKIM 2 */}

              <div
                style={{
                  minHeight: 100,

                  display: 'flex',

                  flexDirection:
                    'column',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',
                }}
              >

                <div
                  style={{
                    color:
                      '#222',

                    fontFamily:
                      'Arial, sans-serif',

                    fontSize: 12,

                    fontWeight:
                      700,
                  }}
                >
                  TAKIM 2 TOPLAMI
                </div>

                <div
                  style={{
                    fontSize: 39,

                    fontWeight:
                      700,

                    color:
                      '#8d393f',

                    lineHeight: 1.2,

                    borderBottom:
                      '3px double #8d393f',
                  }}
                >
                  {
                    state
                      .teamScores[1]
                  }
                </div>

              </div>

            </div>

            <div
              style={{
                marginTop: 14,

                textAlign:
                  'center',

                fontFamily:
                  'Arial, sans-serif',

                fontSize: 10,

                color:
                  'rgba(20,20,20,.48)',
              }}
            >
              Puanlar mavi •
              Cezalar kırmızı
            </div>

          </div>
        </div>,
          document.body,
        )}
    </>
  );
}