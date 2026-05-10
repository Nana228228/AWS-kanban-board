import { useState, useEffect, useCallback } from 'react';
import type { Board, KanbanColumn, Card } from '../types';
import * as api from '../services/api';

interface UseKanbanReturn {
  board: Board | null;
  loading: boolean;
  error: string | null;
  fetchBoard: () => Promise<void>;
  addColumn: (data: { title: string }) => Promise<void>;
  updateColumn: (id: number, data: { title: string }) => Promise<void>;
  deleteColumn: (id: number) => Promise<void>;
  markAsDoneColumn: (id: number, isDoneColumn: boolean) => Promise<void>;
  addCard: (columnId: number, data: { title: string; description?: string; storyPoints?: number }) => Promise<void>;
  updateCard: (id: number, data: { title?: string; description?: string; storyPoints?: number }) => Promise<void>;
  deleteCard: (id: number) => Promise<void>;
  moveCard: (cardId: number, targetColumnId: number, position?: number) => Promise<void>;
  reorderCards: (columnId: number, orderedIds: number[]) => Promise<void>;
}

export function useKanban(boardId: number): UseKanbanReturn {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBoard(boardId);
      setBoard(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar quadro';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  const addColumn = useCallback(
    async (data: { title: string }) => {
      setError(null);
      try {
        await api.createColumn(boardId, data);
        await fetchBoard();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Erro ao criar coluna';
        setError(message);
        throw err;
      }
    },
    [boardId, fetchBoard]
  );

  const updateColumn = useCallback(
    async (id: number, data: { title: string }) => {
      setError(null);
      try {
        await api.updateColumn(id, data);
        await fetchBoard();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Erro ao atualizar coluna';
        setError(message);
        throw err;
      }
    },
    [fetchBoard]
  );

  const deleteColumn = useCallback(
    async (id: number) => {
      setError(null);
      try {
        await api.deleteColumn(id);
        await fetchBoard();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Erro ao excluir coluna';
        setError(message);
        throw err;
      }
    },
    [fetchBoard]
  );

  const markAsDoneColumn = useCallback(
    async (id: number, isDoneColumn: boolean) => {
      setError(null);
      try {
        await api.markAsDoneColumn(id, { isDoneColumn });
        await fetchBoard();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Erro ao marcar coluna de conclusão';
        setError(message);
        throw err;
      }
    },
    [fetchBoard]
  );

  const addCard = useCallback(
    async (columnId: number, data: { title: string; description?: string; storyPoints?: number }) => {
      setError(null);
      try {
        await api.createCard(columnId, data);
        await fetchBoard();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Erro ao criar cartão';
        setError(message);
        throw err;
      }
    },
    [fetchBoard]
  );

  const updateCard = useCallback(
    async (id: number, data: { title?: string; description?: string; storyPoints?: number }) => {
      setError(null);
      try {
        await api.updateCard(id, data);
        await fetchBoard();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Erro ao atualizar cartão';
        setError(message);
        throw err;
      }
    },
    [fetchBoard]
  );

  const deleteCard = useCallback(
    async (id: number) => {
      setError(null);
      try {
        await api.deleteCard(id);
        await fetchBoard();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Erro ao excluir cartão';
        setError(message);
        throw err;
      }
    },
    [fetchBoard]
  );

  const moveCardFn = useCallback(
    async (cardId: number, targetColumnId: number, position?: number) => {
      setError(null);
      try {
        await api.moveCard(cardId, { targetColumnId, position });
        await fetchBoard();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Erro ao mover cartão';
        setError(message);
        throw err;
      }
    },
    [fetchBoard]
  );

  const reorderCardsFn = useCallback(
    async (columnId: number, orderedIds: number[]) => {
      setError(null);
      try {
        await api.reorderCards(columnId, { orderedIds });
        await fetchBoard();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Erro ao reordenar cartões';
        setError(message);
        throw err;
      }
    },
    [fetchBoard]
  );

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  return {
    board,
    loading,
    error,
    fetchBoard,
    addColumn,
    updateColumn,
    deleteColumn,
    markAsDoneColumn,
    addCard,
    updateCard,
    deleteCard,
    moveCard: moveCardFn,
    reorderCards: reorderCardsFn,
  };
}
