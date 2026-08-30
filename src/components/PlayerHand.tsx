// Anastra - Videodaki gibi elde kart tutuşu ve özel sürükle-bırak
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  motion,
} from 'motion/react';

import type {
  Card,
} from '../game/types';

import {
  CardView,
} from './CardView';

interface PlayerHandProps {
  hand: Card[];
  selectedIds: Set<string>;
  highlightIds?: Set<string>;
  lastDrawnId?: string | null;
  disabled?: boolean;
  onToggle: (cardId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

interface HandGeometry {
  cardWidth: number;
  cardHeight: number;
  step: number;
  startX: number;
  containerHeight: number;
}

interface DragState {
  cardId: string;
  pointerId: number;
  startClientX: number;
  currentClientX: number;
  startIndex: number;
  currentIndex: number;
  grabOffsetX: number;
  moved: boolean;
}

function sameOrder(
  first: Card[],
  second: Card[],
): boolean {
  return (
    first.length === second.length &&
    first.every(
      (card, index) =>
        card.id === second[index]?.id,
    )
  );
}

function moveCard(
  cards: Card[],
  fromIndex: number,
  toIndex: number,
): Card[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= cards.length ||
    toIndex >= cards.length
  ) {
    return cards;
  }

  const next = [...cards];
  const [card] = next.splice(fromIndex, 1);

  if (!card) {
    return cards;
  }

  next.splice(toIndex, 0, card);
  return next;
}

function calculateGeometry(
  width: number,
  cardCount: number,
  compactMode: 'desktop' | 'portrait' | 'landscape',
): HandGeometry {
  const portrait =
    compactMode === 'portrait';

  const landscape =
    compactMode === 'landscape';

  const compact =
    portrait || landscape;

  /*
   * Mobilde CardView size="sm" kullanıyoruz.
   * Geometri ile gerçek kart boyutu aynı tutulduğu için
   * sürükleme hassasiyeti bozulmaz.
   */
  const cardWidth =
    portrait
      ? 70
      : landscape
        ? 68
        : 84;

  const cardHeight =
    portrait
      ? 104
      : landscape
        ? 100
        : 118;

  const horizontalPadding =
    compact
      ? 6
      : 20;

  const usableWidth =
    Math.max(
      cardWidth,
      width -
        horizontalPadding * 2,
    );

  if (cardCount <= 1) {
    return {
      cardWidth,
      cardHeight,
      step: 0,
      startX:
        Math.max(
          horizontalPadding,
          (width - cardWidth) / 2 -
            (compact ? 0 : 36),
        ),
      containerHeight:
        cardHeight +
        (compact ? 22 : 42),
    };
  }

  const preferredStep =
    portrait
      ? 38
      : landscape
        ? 40
        : 48;

  const fitStep =
    (usableWidth - cardWidth) /
    (cardCount - 1);

  /*
   * Mobilde "minimum step" yüzünden elin ekran dışına taşmasına
   * izin vermiyoruz. 13+ kartta adım gerektiği kadar daralabilir.
   */
  const step =
    compact
      ? Math.max(
          12,
          Math.min(
            preferredStep,
            fitStep,
          ),
        )
      : Math.max(
          34,
          Math.min(
            preferredStep,
            fitStep,
          ),
        );

  const totalWidth =
    cardWidth +
    step *
      (cardCount - 1);

  return {
    cardWidth,
    cardHeight,
    step,
    startX:
      Math.max(
        horizontalPadding,
        (width - totalWidth) / 2 -
          (compact ? 0 : 36),
      ),
    containerHeight:
      cardHeight +
      (compact ? 24 : 48),
  };
}

function fanTransform(
  index: number,
  total: number,
): {
  y: number;
  rotate: number;
} {
  const center =
    (total - 1) / 2;

  const offset =
    index - center;

  /*
   * Ortadaki kartlar yukarıda, dış kartlar aşağıda.
   * Bu geometri gerçek elde tutulan kart hissini verir.
   */
  const normalized =
    center > 0
      ? Math.abs(offset) / center
      : 0;

  const y =
    Math.round(
      normalized *
        normalized *
        17,
    );

  const rotation =
    Math.max(
      -10,
      Math.min(
        10,
        offset *
          (
            total <= 9
              ? 2.1
              : total <= 13
                ? 1.5
                : 1.05
          ),
      ),
    );

  return {
    y,
    rotate: rotation,
  };
}

export function PlayerHand({
  hand,
  selectedIds,
  highlightIds,
  lastDrawnId,
  disabled,
  onToggle,
  onReorder,
}: PlayerHandProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const dragRef =
    useRef<DragState | null>(
      null,
    );

  const [
    orderedHand,
    setOrderedHand,
  ] = useState<Card[]>(hand);

  const [
    containerWidth,
    setContainerWidth,
  ] = useState(0);

  const [
    compactMode,
    setCompactMode,
  ] = useState<
    'desktop' | 'portrait' | 'landscape'
  >('desktop');

  const [
    dragVersion,
    setDragVersion,
  ] = useState(0);

  const handKey =
    useMemo(
      () =>
        hand
          .map(
            (card) => card.id,
          )
          .join('|'),
      [hand],
    );

  useEffect(() => {
    if (
      !sameOrder(
        orderedHand,
        hand,
      )
    ) {
      setOrderedHand(hand);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handKey]);

  useEffect(() => {
    const element =
      containerRef.current;

    if (!element) {
      return;
    }

    const updateWidth = () => {
      setContainerWidth(
        element.clientWidth,
      );
    };

    updateWidth();

    const observer =
      new ResizeObserver(
        updateWidth,
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const updateCompactMode = () => {
      const width =
        window.innerWidth;

      const height =
        window.innerHeight;

      if (
        width <= 760 &&
        height >= width
      ) {
        setCompactMode('portrait');
        return;
      }

      if (
        width <= 1000 &&
        width > height
      ) {
        setCompactMode('landscape');
        return;
      }

      setCompactMode('desktop');
    };

    updateCompactMode();

    window.addEventListener(
      'resize',
      updateCompactMode,
    );

    window.addEventListener(
      'orientationchange',
      updateCompactMode,
    );

    return () => {
      window.removeEventListener(
        'resize',
        updateCompactMode,
      );

      window.removeEventListener(
        'orientationchange',
        updateCompactMode,
      );
    };
  }, []);

  const geometry =
    useMemo(
      () =>
        calculateGeometry(
          containerWidth,
          orderedHand.length,
          compactMode,
        ),
      [
        containerWidth,
        orderedHand.length,
        compactMode,
      ],
    );

  const beginPointer = (
    event:
      React.PointerEvent<HTMLDivElement>,
    cardId: string,
    index: number,
  ) => {
    if (disabled) {
      return;
    }

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const rect =
      container.getBoundingClientRect();

    const localX =
      event.clientX -
      rect.left;

    const cardLeft =
      geometry.startX +
      index *
        geometry.step;

    dragRef.current = {
      cardId,
      pointerId:
        event.pointerId,
      startClientX:
        event.clientX,
      currentClientX:
        event.clientX,
      startIndex:
        index,
      currentIndex:
        index,
      grabOffsetX:
        localX - cardLeft,
      moved:
        false,
    };

    setDragVersion(
      (value) =>
        value + 1,
    );
  };

  const movePointer = (
    event:
      React.PointerEvent<HTMLDivElement>,
  ) => {
    const drag =
      dragRef.current;

    const container =
      containerRef.current;

    if (
      !drag ||
      !container ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    drag.currentClientX =
      event.clientX;

    if (
      Math.abs(
        event.clientX -
          drag.startClientX,
      ) > 6
    ) {
      drag.moved = true;
    }

    const rect =
      container.getBoundingClientRect();

    const localX =
      event.clientX -
      rect.left;

    const draggedLeft =
      localX -
      drag.grabOffsetX;

    const draggedCenter =
      draggedLeft +
      geometry.cardWidth / 2;

    let targetIndex = 0;

    if (geometry.step > 0) {
      if (
        compactMode !== 'desktop' &&
        orderedHand.length > 13
      ) {
        const dragFirstRowCount =
          Math.ceil(
            (orderedHand.length + 1) / 2,
          );

        const inSecondRow =
          drag.startIndex >= dragFirstRowCount;

        const rowStartIndex =
          inSecondRow
            ? dragFirstRowCount
            : 0;

        const rowCount =
          inSecondRow
            ? orderedHand.length - dragFirstRowCount
            : dragFirstRowCount;

        const rowTotalWidth =
          geometry.cardWidth +
          geometry.step *
            Math.max(0, rowCount - 1);

        const rowStartX =
          Math.max(
            6,
            (container.clientWidth - rowTotalWidth) / 2,
          );

        const rowTargetIndex =
          Math.max(
            0,
            Math.min(
              rowCount - 1,
              Math.round(
                (
                  draggedCenter -
                  rowStartX -
                  geometry.cardWidth / 2
                ) /
                  geometry.step,
              ),
            ),
          );

        targetIndex =
          rowStartIndex + rowTargetIndex;
      } else {
        targetIndex =
          Math.max(
            0,
            Math.min(
              orderedHand.length - 1,
              Math.round(
                (
                  draggedCenter -
                  geometry.startX -
                  geometry.cardWidth / 2
                ) /
                  geometry.step,
              ),
            ),
          );
      }
    }

    if (
      targetIndex !==
      drag.currentIndex
    ) {
      setOrderedHand(
        (previous) => {
          const actualIndex =
            previous.findIndex(
              (card) =>
                card.id ===
                drag.cardId,
            );

          if (
            actualIndex < 0
          ) {
            return previous;
          }

          return moveCard(
            previous,
            actualIndex,
            targetIndex,
          );
        },
      );

      drag.currentIndex =
        targetIndex;
    }

    setDragVersion(
      (value) =>
        value + 1,
    );
  };

  const finishPointer = (
    event:
      React.PointerEvent<HTMLDivElement>,
  ) => {
    const drag =
      dragRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }

    const finalIndex =
      orderedHand.findIndex(
        (card) =>
          card.id ===
          drag.cardId,
      );

    if (
      drag.moved &&
      finalIndex >= 0 &&
      finalIndex !==
        drag.startIndex
    ) {
      onReorder(
        drag.startIndex,
        finalIndex,
      );
    } else if (
      !drag.moved
    ) {
      onToggle(
        drag.cardId,
      );
    }

    dragRef.current =
      null;

    setDragVersion(
      (value) =>
        value + 1,
    );
  };

  const cancelPointer = (
    event:
      React.PointerEvent<HTMLDivElement>,
  ) => {
    const drag =
      dragRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    setOrderedHand(hand);
    dragRef.current = null;

    setDragVersion(
      (value) =>
        value + 1,
    );
  };

  const compact =
    compactMode !== 'desktop';

  /*
   * Mobilde elde 13'ten fazla kart varsa eli iki sıraya böleriz.
   * Masaüstü görünümü aynen tek sıra kalır.
   */
  const twoRowMobile =
    compact &&
    orderedHand.length > 13;

  /*
   * İki sıralı mobil elde üst sıra biraz daha geniş tutulur.
   * Örnek:
   * 14 kart -> üstte 8, altta 6
   * 15 kart -> üstte 8, altta 7
   * 16 kart -> üstte 9, altta 7
   */
  const firstRowCount =
    twoRowMobile
      ? Math.ceil(
          (orderedHand.length + 1) / 2,
        )
      : orderedHand.length;

  const secondRowCount =
    twoRowMobile
      ? orderedHand.length - firstRowCount
      : 0;

  const secondRowYOffset =
    twoRowMobile
      ? Math.round(geometry.cardHeight * 0.72)
      : 0;

  const cardSize =
    'lg';

  /*
   * Eli büyükten küçüğe sıralar:
   * A-K-Q-J-10-9-8-7-6-5-4-3-2
   *
   * Aynı değerdeki kartların kendi aralarındaki mevcut
   * sırası korunur. Sıralama yalnızca görsel el sırasıdır.
   */
  const sortDescending = () => {
    const targetOrder =
      [...orderedHand].sort(
        (first, second) =>
          second.rankValue -
          first.rankValue,
      );

    let working =
      [...orderedHand];

    targetOrder.forEach(
      (targetCard, targetIndex) => {
        const currentIndex =
          working.findIndex(
            (card) =>
              card.id ===
              targetCard.id,
          );

        if (
          currentIndex < 0 ||
          currentIndex === targetIndex
        ) {
          return;
        }

        working =
          moveCard(
            working,
            currentIndex,
            targetIndex,
          );

        /*
         * useAnastra içindeki reorderHand stateRef'i
         * her çağrıda güncellediği için peş peşe taşıma
         * işlemleri güvenle uygulanabilir.
         */
        onReorder(
          currentIndex,
          targetIndex,
        );
      },
    );

    setOrderedHand(
      working,
    );
  };

  const activeDrag =
    dragRef.current;

  return (
    <div
      ref={containerRef}
      className="video-hand-viewport"
      style={{
        height:
          geometry.containerHeight +
          (twoRowMobile
            ? secondRowYOffset
            : 0),
        transform:
          compact
            ? 'translateY(-4px)'
            : 'translateY(-18px)',
      }}
    >
      <div className="video-hand-shadow" />

      <button
        type="button"
        className="hand-sort-button"
        onClick={sortDescending}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        title="Kartları A'dan 2'ye büyükten küçüğe sırala"
        aria-label="Kartları büyükten küçüğe sırala"
      >
        Sırala
      </button>

      {orderedHand.map(
        (
          card,
          index,
        ) => {
          const selected =
            selectedIds.has(
              card.id,
            );

          const pending =
            highlightIds?.has(
              card.id,
            ) ?? false;

          const lastDrawn =
            card.id ===
            lastDrawnId;

          const fan =
            fanTransform(
              index,
              orderedHand.length,
            );

          const dragging =
            activeDrag?.cardId ===
            card.id;

          const inSecondRow =
            twoRowMobile &&
            index >= firstRowCount;

          const rowIndex =
            inSecondRow
              ? index - firstRowCount
              : index;

          const rowCount =
            inSecondRow
              ? secondRowCount
              : firstRowCount;

          const rowTotalWidth =
            geometry.cardWidth +
            geometry.step *
              Math.max(
                0,
                rowCount - 1,
              );

          const rowStartX =
            twoRowMobile
              ? Math.max(
                  6,
                  (containerWidth - rowTotalWidth) / 2,
                )
              : geometry.startX;

          const rowFan =
            twoRowMobile
              ? fanTransform(
                  rowIndex,
                  rowCount,
                )
              : fan;

          let x =
            rowStartX +
            rowIndex *
              geometry.step;

          let y =
            compact
              ? Math.round(
                  rowFan.y * 0.58,
                )
              : rowFan.y;

          if (twoRowMobile && !inSecondRow) {
            y -= secondRowYOffset;
          }

          let rotate =
            rowFan.rotate;

          if (
            dragging &&
            activeDrag
          ) {
            const container =
              containerRef.current;

            if (container) {
              const rect =
                container.getBoundingClientRect();

              x =
                activeDrag.currentClientX -
                rect.left -
                activeDrag.grabOffsetX;
            }

            y -= compact ? 10 : 24;
            rotate = 0;
          }

          if (
            selected &&
            !dragging
          ) {
            y -= compact ? 8 : 18;
          }

          return (
            <motion.div
              key={card.id}
              className={[
                'video-hand-card',
                dragging
                  ? 'is-dragging'
                  : '',
                lastDrawn
                  ? 'is-new-card'
                  : '',
              ].join(' ')}
              animate={{
                x,
                y,
                rotate,
                scale:
                  compact
                    ? dragging
                      ? 1.05
                      : 1
                    : dragging
                      ? 1.11
                      : 1.07,
              }}
              transition={
                dragging
                  ? {
                      duration: 0,
                    }
                  : {
                      type:
                        'spring',
                      stiffness:
                        620,
                      damping:
                        46,
                      mass:
                        0.58,
                    }
              }
              style={{
                width:
                  geometry.cardWidth,
                height:
                  geometry.cardHeight,
                zIndex:
                  dragging
                    ? 1000
                    : selected
                      ? 500
                      : inSecondRow
                        ? 200 + rowIndex
                        : index + 1,
              }}
              onPointerDown={(
                event,
              ) =>
                beginPointer(
                  event,
                  card.id,
                  index,
                )
              }
              onPointerMove={
                movePointer
              }
              onPointerUp={
                finishPointer
              }
              onPointerCancel={
                cancelPointer
              }
              onContextMenu={(
                event,
              ) =>
                event.preventDefault()
              }
              data-drag-version={
                dragVersion
              }
            >
              <CardView
                card={card}
                size={cardSize}
                selected={
                  selected
                }
                highlighted={
                  pending
                }
                disabled={
                  disabled
                }
                animated={false}
              />
            </motion.div>
          );
        },
      )}

      {!disabled &&
        hand.length > 1 && (
          <div className="video-hand-hint">
            Kartı tutup sağa veya sola taşı
          </div>
        )}
    </div>
  );
}