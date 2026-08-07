interface PreviewPlayerPanelProps {
  name: string;
  status: string;
  processedCount: number;
}

export function PreviewPlayerPanel({
  name,
  status,
  processedCount,
}: PreviewPlayerPanelProps) {
  return (
    <div className="reference-player-panel">

      <div className="reference-player-avatar">
        {name.charAt(0)}
      </div>

      <div className="reference-player-main">
        <div className="reference-player-name">
          {name}
        </div>

        <div className="reference-player-status">
          ● {status}
        </div>
      </div>

      <div className="reference-divider" />

      <div className="reference-processed">

        <div className="reference-card-back" />

        <div className="reference-counter">

          <strong>× {processedCount}</strong>

          <span>
            İşlenmiş Kartlar
          </span>

        </div>

      </div>

    </div>
  );
}