import {
  HorizontalPlayerPanel,
} from './HorizontalPlayerPanel';

import {
  VerticalPlayerPanel,
} from './VerticalPlayerPanel';

export function GameTablePreview() {
  return (
    <main className="reference-preview-page">
      <section className="reference-table">
        <div className="reference-top-player">
          <HorizontalPlayerPanel
            name="EGE (AI)"
            status="Düşünüyor..."
            processedCount={2}
          />
        </div>

        <div className="reference-top-melds" />

        <div className="reference-left-player">
          <VerticalPlayerPanel
            name="EDA (AI)"
            status="Açtı"
            processedCount={3}
          />
        </div>

        <div className="reference-left-melds" />

        <div className="reference-right-player">
          <VerticalPlayerPanel
            name="MERT (AI)"
            status="Düşünüyor..."
            processedCount={3}
          />
        </div>

        <div className="reference-right-melds" />

        <div className="reference-center">
          <div className="reference-deck-area">
            <div className="reference-deck" />
            <span>DESTE</span>
          </div>

          <div className="reference-discard-area">
            <div className="reference-discard" />
            <span>YER</span>
            <small>Tek tıkla aç</small>
          </div>
        </div>

        <div className="reference-bottom-melds" />

        <div className="reference-bottom-player">
          <HorizontalPlayerPanel
            name="SEN"
            status="Açtı"
            processedCount={4}
          />
        </div>

        <div className="reference-hand" />

        <div className="reference-left-buttons">
          <button type="button">
            MENÜ
          </button>

          <button type="button">
            GEÇ
          </button>

          <button type="button">
            İPUCU
          </button>
        </div>

        <div className="reference-right-buttons">
          <button type="button">
            KART ÇEK
          </button>

          <button type="button">
            YERDEN AL
          </button>

          <button type="button">
            PER AÇ
          </button>

          <button type="button">
            KART AT
          </button>
        </div>
      </section>
    </main>
  );
}