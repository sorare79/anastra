// Anastra - Tek kart görünümü
import {
  motion,
} from 'motion/react';

import type {
  Card,
} from '../game/types';

import {
  isRedSuit,
  suitSymbol,
} from '../game/deck';

/*
 * Kartın deste/el/yer/per arasında geçerken kullandığı
 * paylaşılan animasyon kimliği. Aynı karta ait tüm
 * görünümler bu id'yi taşırsa framer-motion, kart bir
 * konteynerden diğerine geçtiğinde otomatik olarak "uçuş"
 * (shared layout) animasyonu üretir.
 */
export function cardFlightId(
  cardId: string,
): string {
  return `card-flight-${cardId}`;
}

const flightTransition = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 40,
  mass: 0.7,
};

interface CardViewProps {
  card: Card;

  selected?: boolean;

  highlighted?: boolean;

  disabled?: boolean;

  /*
   * Bu kart görünümünün uçuş animasyonuna katılıp
   * katılmayacağı. Aynı karta ait birden fazla görünüm
   * aynı anda ekranda olabileceği durumlarda (örn. per
   * önizleme penceresi) çakışmayı önlemek için false
   * geçilmelidir.
   */
  animated?: boolean;

  size?:
    | 'sm'
    | 'md'
    | 'lg';

  onClick?: () => void;
}

const sizeMap = {
  sm:
    'w-9 h-12 text-[10px] md:w-10 md:h-14 md:text-xs',

  md:
    'w-12 h-16 text-xs md:w-14 md:h-20 md:text-sm',

  lg:
    'w-16 h-24 text-sm md:w-20 md:h-28 md:text-base',
};

const centerSymbolMap = {
  sm:
    'text-base md:text-lg',

  md:
    'text-xl md:text-2xl',

  lg:
    'text-3xl md:text-4xl',
};

const cornerRankMap = {
  sm:
    'text-[9px] md:text-[10px]',

  md:
    'text-[10px] md:text-xs',

  lg:
    'text-xs md:text-sm',
};

export function CardView({
  card,
  selected,
  highlighted,
  disabled,
  animated = true,
  size = 'md',
  onClick,
}: CardViewProps) {
  const red =
    isRedSuit(
      card.suit,
    );

  const symbol =
    suitSymbol(
      card.suit,
    );

  const interactive =
    Boolean(
      onClick &&
      !disabled,
    );

  return (
    <motion.button
      layout={animated}
      layoutId={
        animated
          ? cardFlightId(card.id)
          : undefined
      }
      transition={flightTransition}
      initial={
        animated
          ? { opacity: 0, scale: 0.7 }
          : false
      }
      animate={{ opacity: 1, scale: 1 }}
      type="button"
      onClick={
        onClick
      }
      disabled={
        disabled
      }
      aria-pressed={
        selected
      }
      aria-label={
        `${card.rank} ${symbol}`
      }
      className={[
        'playing-card',
        'group',
        'relative',
        'isolate',
        'overflow-hidden',
        'select-none',
        'border',
        'p-1',
        'text-left',
        'outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-amber-300',
        'focus-visible:ring-offset-2',
        'focus-visible:ring-offset-emerald-950',
        sizeMap[size],

        red
          ? 'text-rose-600'
          : 'text-slate-900',

        selected
          ? 'is-selected'
          : '',

        highlighted
          ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-transparent'
          : 'border-slate-300/80',

        interactive
          ? 'cursor-pointer'
          : 'cursor-default',

        disabled
          ? 'opacity-65'
          : '',
      ].join(' ')}
      style={{
        background:
          'linear-gradient(145deg, #ffffff 0%, #f8fafc 56%, #eef2f7 100%)',
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[3px] rounded-[0.55rem] border border-white/80"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 top-0 h-1/3 rounded-t-[0.55rem] bg-gradient-to-b from-white/65 to-transparent"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -top-4 h-10 w-10 rounded-full bg-white/70 blur-xl transition-opacity duration-300 group-hover:opacity-100"
      />

      <div
        className={[
          'relative',
          'z-10',
          'flex',
          'flex-col',
          'items-start',
          'font-black',
          'leading-none',
          cornerRankMap[size],
        ].join(' ')}
      >
        <span>
          {card.rank}
        </span>

        <span className="mt-0.5">
          {symbol}
        </span>
      </div>

      <div
        className={[
          'absolute',
          'inset-0',
          'z-10',
          'grid',
          'place-items-center',
          'font-semibold',
          'leading-none',
          centerSymbolMap[size],
        ].join(' ')}
        aria-hidden="true"
      >
        <span
          className={[
            'drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]',
            red
              ? 'text-rose-600'
              : 'text-slate-800',
          ].join(' ')}
        >
          {symbol}
        </span>
      </div>

      <div
        className={[
          'relative',
          'z-10',
          'mt-auto',
          'flex',
          'rotate-180',
          'flex-col',
          'items-start',
          'self-end',
          'font-black',
          'leading-none',
          cornerRankMap[size],
        ].join(' ')}
      >
        <span>
          {card.rank}
        </span>

        <span className="mt-0.5">
          {symbol}
        </span>
      </div>

      {selected && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] bg-gradient-to-t from-amber-300/10 to-transparent"
        />
      )}

      {highlighted && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] bg-gradient-to-t from-emerald-300/10 to-transparent"
        />
      )}
    </motion.button>
  );
}

interface CardBackProps {
  size?:
    | 'sm'
    | 'md'
    | 'lg';
}

/*
 * Kapalı kart arka yüzü.
 *
 * Dışarıdan bakıldığında HTML kutusu yerine gerçek
 * baskılı iskambil kartı hissi vermesi için katmanlı
 * desen ve iç çerçeve kullanılır.
 */
export function CardBack({
  size = 'md',
}: CardBackProps) {
  return (
    <div
      className={[
        'playing-card',
        'relative',
        'isolate',
        'overflow-hidden',
        'border',
        'border-slate-950/60',
        'bg-slate-950',
        sizeMap[size],
      ].join(' ')}
      aria-label="Kapalı kart"
      role="img"
    >
      <div
        className="absolute inset-[3px] rounded-[0.52rem] border border-amber-100/25"
        style={{
          background:
            'linear-gradient(145deg, #253c9d 0%, #172970 48%, #101a4d 100%)',
        }}
      />

      <div
        className="absolute inset-[7px] rounded-[0.4rem] border border-white/15"
        style={{
          backgroundImage: [
            'linear-gradient(45deg, rgba(255,255,255,0.08) 25%, transparent 25%)',
            'linear-gradient(-45deg, rgba(255,255,255,0.08) 25%, transparent 25%)',
            'linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.08) 75%)',
            'linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.08) 75%)',
          ].join(','),
          backgroundSize:
            '8px 8px',
          backgroundPosition:
            '0 0, 0 4px, 4px -4px, -4px 0px',
        }}
      />

      <div className="absolute inset-0 grid place-items-center">
        <div className="grid aspect-square w-[42%] rotate-45 place-items-center rounded-md border border-amber-100/25 bg-white/5 shadow-inner">
          <span className="-rotate-45 font-black text-amber-100/75 drop-shadow">
            A
          </span>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent"
      />
    </div>
  );
}