// Anastra - İnsan oyuncunun eli ve seçim yönetimi
import type { Card } from '../game/types';
import { CardView } from './CardView';

interface PlayerHandProps {
  hand: Card[];
  selectedIds: Set<string>;
  highlightIds?: Set<string>;
  lastDrawnId?: string | null;
  disabled?: boolean;
  onToggle: (cardId: string) => void;
}

export function PlayerHand({
  hand,
  selectedIds,
  highlightIds,
  lastDrawnId,
  disabled,
  onToggle,
}: PlayerHandProps) {
  return (
    <div className="flex flex-wrap justify-center gap-1 md:gap-1.5 py-2">
      {hand.map((card) => (
        <CardView
          key={card.id}
          card={card}
          size="md"
          selected={selectedIds.has(card.id)}
          highlighted={
            highlightIds?.has(card.id) || card.id === lastDrawnId
          }
          disabled={disabled}
          onClick={() => onToggle(card.id)}
        />
      ))}
    </div>
  );
}
