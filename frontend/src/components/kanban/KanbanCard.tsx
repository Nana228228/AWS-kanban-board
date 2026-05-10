import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../../types';

interface KanbanCardProps {
  card: Card;
  onEdit: (card: Card) => void;
  onDelete: (cardId: number) => void;
}

function KanbanCard({ card, onEdit, onDelete }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `card-${card.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '10px',
    marginBottom: '8px',
    backgroundColor: '#fff',
    cursor: 'grab',
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.08)',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontWeight: 500, fontSize: '14px', flex: 1 }}>{card.title}</span>
        {card.storyPoints > 0 && (
          <span
            style={{
              backgroundColor: '#e3f2fd',
              color: '#1565c0',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 600,
              marginLeft: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            {card.storyPoints} SP
          </span>
        )}
      </div>
      <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(card);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            padding: '2px 8px',
            fontSize: '11px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            backgroundColor: '#fff',
            cursor: 'pointer',
          }}
        >
          Editar
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            padding: '2px 8px',
            fontSize: '11px',
            border: '1px solid #e53935',
            borderRadius: '3px',
            backgroundColor: '#fff',
            color: '#e53935',
            cursor: 'pointer',
          }}
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

export default KanbanCard;
