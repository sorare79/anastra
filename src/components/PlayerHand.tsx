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
): HandGeometry {
  const mobile =
    width < 700;

  /*
   * CardView size="lg" ölçüleri:
   * mobilde yaklaşık 64x96,
   * masaüstünde yaklaşık 80x112.
   */
  const cardWidth =
    mobile ? 64 : 80;

  const cardHeight =
    mobile ? 96 : 112;

  const horizontalPadding =
    mobile ? 12 : 20;

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
          (width - cardWidth) / 2,
        ),
      containerHeight:
        cardHeight + 42,
    };
  }

  /*
   * Kartın yaklaşık %45-55'i görünür.
   * Dar ekranda el otomatik sıkışır, fakat kartların
   * rank ve sembol bölümü görünür kalır.
   */
  const preferredStep =
    mobile ? 36 : 46;

  const minimumStep =
    mobile ? 27 : 33;

  const fitStep =
    (usableWidth - cardWidth) /
    (cardCount - 1);

  const step =
    Math.max(
      minimumStep,
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
        (width - totalWidth) / 2,
      ),
    containerHeight:
      cardHeight + 48,
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

  const geometry =
    useMemo(
      () =>
        calculateGeometry(
          containerWidth,
          orderedHand.length,
        ),
      [
        containerWidth,
        orderedHand.length,
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

    const centerX =
      localX -
      geometry.cardWidth / 2;

    const targetIndex =
      geometry.step > 0
        ? Math.max(
            0,
            Math.min(
              orderedHand.length - 1,
              Math.round(
                (
                  centerX -
                  geometry.startX
                ) /
                geometry.step,
              ),
            ),
          )
        : 0;

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

  const activeDrag =
    dragRef.current;

  return (
    <div
      ref={containerRef}
      className="video-hand-viewport"
      style={{
        height:
          geometry.containerHeight,
      }}
    >
      <div className="video-hand-shadow" />

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

          let x =
            geometry.startX +
            index *
              geometry.step;

          let y =
            fan.y;

          let rotate =
            fan.rotate;

          if (
            dragging &&
            activeDrag
          ) {
            x +=
              activeDrag.currentClientX -
              activeDrag.startClientX;

            y -= 30;
            rotate = 0;
          }

          if (
            selected &&
            !dragging
          ) {
            y -= 18;
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
                  dragging
                    ? 1.08
                    : 1,
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
                size="lg"
                selected={
                  selected
                }
                highlighted={
                  pending
                }
                disabled={
                  disabled
                }
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