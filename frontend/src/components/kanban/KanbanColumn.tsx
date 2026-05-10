import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { KanbanColumn as KanbanColumnType, Card } from '../../types';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  column: KanbanColumnType;
  onAddCard: (columnId: number) => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (cardId: number) => void;
  onEditColumn: (column: KanbanColumnType) => void;
  onDeleteColumn: (columnId: number) => void;
}

function KanbanColumn({
  column,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onEditColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: `column-${column.id}` });

  const cards = column.cards || [];
  const sortableIds = cards.map((c) => `card-${c.id}`);

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: '280px',
        maxWidth: '320px',
        backgroundColor: column.isDoneColumn ? '#e8f5e9' : '#f5f5f5',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        border: column.isDoneColumn ? '2px solid #4caf50' : '1px solid #e0e0e0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <h3 style={{ margin: 0, fontSize: '15px' }}>{column.title}</h3>
          {column.isDoneColumn && (
            <span style={{ fontSize: '12px', color: '#388e3c', fontWeight: 600 }}>✓ Done</span>
          )}
          <span style={{ fontSize: '12px', color: '#999' }}>({cards.length})</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onEditColumn(column)}
            style={{
              padding: '2px 6px',
              fontSize: '11px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
          >
            ✎
          </button>
          <button
            onClick={() => onDeleteColumn(column.id)}
            style={{
              padding: '2px 6px',
              fontSize: '11px',
              border: '1px solid #e53935',
              borderRadius: '3px',
              backgroundColor: '#fff',
              color: '#e53935',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div style={{ flex: 1, minHeight: '60px' }}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
            />
          ))}
        </div>
      </SortableContext>

      <button
        onClick={() => onAddCard(column.id)}
        style={{
          marginTop: '8px',
          padding: '6px',
          border: '1px dashed #bbb',
          borderRadius: '4px',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          color: '#666',
          fontSize: '13px',
        }}
      >
        + Adicionar Cartão
      </button>
    </div>
  );
}

export default KanbanColumn;
