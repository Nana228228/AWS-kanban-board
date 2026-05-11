import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { useKanban } from '../../hooks/useKanban';
import KanbanColumn from './KanbanColumn';
import ColumnForm from './ColumnForm';
import CardForm from './CardForm';
import type { KanbanColumn as KanbanColumnType, Card } from '../../types';

function KanbanBoard() {
  const { id } = useParams<{ id: string }>();
  const boardId = Number(id);
  const {
    board,
    loading,
    error,
    addColumn,
    updateColumn,
    deleteColumn,
    markAsDoneColumn,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    reorderCards,
  } = useKanban(boardId);

  const [showColumnForm, setShowColumnForm] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumnType | null>(null);
  const [addingCardColumnId, setAddingCardColumnId] = useState<number | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active || !over || !board?.columns) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (!activeId.startsWith('card-')) return;

    const cardId = Number(activeId.replace('card-', ''));

    // Find source column
    let sourceColumn: KanbanColumnType | undefined;
    for (const col of board.columns) {
      if (col.cards?.some((c) => c.id === cardId)) {
        sourceColumn = col;
        break;
      }
    }
    if (!sourceColumn) return;

    // Determine target column
    let targetColumnId: number;
    if (overId.startsWith('column-')) {
      targetColumnId = Number(overId.replace('column-', ''));
    } else if (overId.startsWith('card-')) {
      const overCardId = Number(overId.replace('card-', ''));
      const targetCol = board.columns.find((col) =>
        col.cards?.some((c) => c.id === overCardId)
      );
      if (!targetCol) return;
      targetColumnId = targetCol.id;
    } else {
      return;
    }

    if (sourceColumn.id === targetColumnId) {
      // Reorder within same column
      const cards = sourceColumn.cards || [];
      const orderedIds = cards.map((c) => c.id);
      const oldIndex = orderedIds.indexOf(cardId);
      
      if (overId.startsWith('card-')) {
        const overCardId = Number(overId.replace('card-', ''));
        const newIndex = orderedIds.indexOf(overCardId);
        if (oldIndex !== newIndex) {
          orderedIds.splice(oldIndex, 1);
          orderedIds.splice(newIndex, 0, cardId);
          await reorderCards(sourceColumn.id, orderedIds);
        }
      }
    } else {
      // Move to different column
      let position: number | undefined;
      if (overId.startsWith('card-')) {
        const overCardId = Number(overId.replace('card-', ''));
        const targetCol = board.columns.find((col) => col.id === targetColumnId);
        const targetCards = targetCol?.cards || [];
        position = targetCards.findIndex((c) => c.id === overCardId);
      }
      await moveCard(cardId, targetColumnId, position);
    }
  };

  const handleColumnSubmit = async (data: { title: string; isDoneColumn: boolean }) => {
    if (editingColumn) {
      await updateColumn(editingColumn.id, { title: data.title });
      if (data.isDoneColumn !== editingColumn.isDoneColumn) {
        await markAsDoneColumn(editingColumn.id, data.isDoneColumn);
      }
      setEditingColumn(null);
    } else {
      await addColumn({ title: data.title });
      setShowColumnForm(false);
    }
  };

  const handleCardSubmit = async (data: { title: string; description?: string; storyPoints?: number }) => {
    if (editingCard) {
      await updateCard(editingCard.id, data);
      setEditingCard(null);
    } else if (addingCardColumnId) {
      await addCard(addingCardColumnId, data);
      setAddingCardColumnId(null);
    }
  };

  const handleDeleteColumn = async (columnId: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta coluna e todos os seus cartões?')) {
      await deleteColumn(columnId);
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este cartão?')) {
      await deleteCard(cardId);
    }
  };

  if (loading) {
    return <p>Carregando quadro...</p>;
  }

  if (!board) {
    return <p>Quadro não encontrado.</p>;
  }

  const columns = board.columns || [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <Link
          to={`/projects/${board.projectId}/boards`}
          style={{ textDecoration: 'none', color: '#1976d2' }}
        >
          ← Voltar
        </Link>
        <h2 style={{ margin: 0 }}>{board.title}</h2>
        <Link
          to={`/boards/${board.id}/burndown`}
          style={{ textDecoration: 'none', color: '#1976d2', fontSize: '14px' }}
        >
          📊 Relatório
        </Link>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '12px' }}>{error}</p>}

      <div style={{ marginBottom: '12px' }}>
        <button
          onClick={() => setShowColumnForm(true)}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#1976d2',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          + Nova Coluna
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onAddCard={(colId) => setAddingCardColumnId(colId)}
              onEditCard={(card) => setEditingCard(card)}
              onDeleteCard={handleDeleteCard}
              onEditColumn={(col) => setEditingColumn(col)}
              onDeleteColumn={handleDeleteColumn}
            />
          ))}
        </div>
      </DndContext>

      {showColumnForm && (
        <ColumnForm
          onSubmit={handleColumnSubmit}
          onCancel={() => setShowColumnForm(false)}
        />
      )}

      {editingColumn && (
        <ColumnForm
          column={editingColumn}
          onSubmit={handleColumnSubmit}
          onCancel={() => setEditingColumn(null)}
        />
      )}

      {addingCardColumnId && (
        <CardForm
          onSubmit={handleCardSubmit}
          onCancel={() => setAddingCardColumnId(null)}
        />
      )}

      {editingCard && (
        <CardForm
          card={editingCard}
          onSubmit={handleCardSubmit}
          onCancel={() => setEditingCard(null)}
        />
      )}
    </div>
  );
}

export default KanbanBoard;
