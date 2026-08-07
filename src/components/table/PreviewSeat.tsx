interface PreviewSeatProps {
  name: string;

  position:
    | 'left'
    | 'right';

  /*
   * Şimdilik gerçek perler yerine
   * deneme kutuları kullanıyoruz.
   */
  meldCount?: number;
}

export function PreviewSeat({
  name,
  position,
  meldCount = 12,
}: PreviewSeatProps) {
  const melds = Array.from(
    {
      length: meldCount,
    },
    (_, index) => index + 1,
  );

  /*
   * 1–5: tek sütun
   * 6–10: iki sütun
   * 11–15: üç sütun
   * 16+: dört sütun ve biraz küçülme
   */
  const columnCount =
    meldCount <= 5
      ? 1
      : meldCount <= 10
        ? 2
        : meldCount <= 15
          ? 3
          : 4;

  return (
    <section
      className={[
        'preview-smart-seat',
        `preview-smart-seat-${position}`,
        meldCount > 15
          ? 'is-compact'
          : '',
      ].join(' ')}
    >
      <header className="preview-smart-seat-header">
        <strong>{name}</strong>

        <span>
          {meldCount} per
        </span>
      </header>

      <div
        className="preview-smart-meld-grid"
        style={{
          gridTemplateColumns:
            `repeat(${columnCount}, minmax(0, 1fr))`,
        }}
      >
        {melds.map(
          (meldNumber) => (
            <div
              key={meldNumber}
              className="preview-smart-meld"
            >
              <span>10♠</span>
              <span>9♠</span>
              <span className="preview-smart-hidden">
                3
              </span>
              <span>3♠</span>
              <span>2♠</span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}