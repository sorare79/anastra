interface VerticalPlayerPanelProps {
  name: string;
  status: string;
  processedCount: number;
}

export function VerticalPlayerPanel({
  name,
  status,
  processedCount,
}: VerticalPlayerPanelProps) {
  return (
    <div className="vertical-player-panel">

      <div className="vertical-avatar">
        {name.charAt(0)}
      </div>

      <div className="vertical-name">
        {name}
      </div>

      <div className="vertical-status">
        ● {status}
      </div>

      <div className="vertical-divider" />

      <div className="vertical-card" />

      <div className="vertical-count">
        × {processedCount}
      </div>

      <div className="vertical-text">
        İşlenmiş
      </div>

      <div className="vertical-text">
        Kartlar
      </div>

    </div>
  );
}