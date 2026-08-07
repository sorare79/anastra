interface HorizontalPlayerPanelProps {
  name: string;
  status: string;
  processedCount: number;
}

export function HorizontalPlayerPanel({
  name,
  status,
  processedCount,
}: HorizontalPlayerPanelProps) {
  return (
    <div className="horizontal-player-panel">

      <div className="player-avatar">
        {name.charAt(0)}
      </div>

      <div className="player-info">

        <div className="player-name">
          {name}
        </div>

        <div className="player-status">
          ● {status}
        </div>

      </div>

      <div className="player-separator" />

      <div className="processed-area">

        <div className="processed-card" />

        <div className="processed-info">

          <strong>
            × {processedCount}
          </strong>

          <span>
            İşlenmiş Kartlar
          </span>

        </div>

      </div>

    </div>
  );
}